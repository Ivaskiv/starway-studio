import type { Response } from 'express'
import { NotificationChannel, Role } from '@starway/db/prisma-client'

import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { notificationRecordService } from '../../services/notifications/services/NotificationRecordService.js'
import { notificationService } from '../../services/notifications/NotificationService.js'
import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'
import { notificationJobService } from '../../services/notifications/services/NotificationJobService.js'
import { notificationPreferenceService } from '../../services/notifications/services/NotificationPreferenceService.js'
import { prisma } from '../../db/client.js'
import {
  dedupeNotificationFeed,
  toNotificationReadModel,
} from '../../services/notifications/domain/notificationPolicy.js'
import { cacheGet, cacheSet } from '../../lib/cache/index.js'

function canManageDiagnostics(req: AuthenticatedRequest) {
  const role = req.user?.role
  return role === Role.EXPERT || role === Role.ADMIN || role === Role.SUPERADMIN
}

function isOwnerOrForbidden(req: AuthenticatedRequest, res: Response, targetUserId: string): boolean {
  if (!req.user?.id) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }

  if (req.user.id !== targetUserId) {
    res.status(403).json({ error: 'forbidden' })
    return false
  }

  return true
}

function resolveNotificationsTargetUserId(req: AuthenticatedRequest): string | null {
  if (!req.user?.id) {
    return null
  }

  const raw = typeof req.params.userId === 'string' ? req.params.userId.trim() : ''
  if (!raw || raw === 'undefined' || raw === 'null') {
    return req.user.id
  }

  return raw
}

function resolveDiagnosticTargetUserId(req: AuthenticatedRequest, res: Response): string | null {
  if (!req.user?.id) {
    res.status(401).json({ error: 'unauthorized' })
    return null
  }

  const requested = typeof req.body?.userId === 'string' && req.body.userId.trim()
    ? req.body.userId.trim()
    : req.user.id

  if (requested !== req.user.id && !canManageDiagnostics(req)) {
    res.status(403).json({ error: 'forbidden' })
    return null
  }

  return requested
}

function resolveNotificationChannels(req: AuthenticatedRequest) {
  const raw = typeof req.query.channels === 'string'
    ? req.query.channels
    : typeof req.query.channel === 'string'
      ? req.query.channel
      : ''

  const normalized = raw
    .split(',')
    .map(value => value.trim().toUpperCase())
    .filter(Boolean)

  if (normalized.includes('ALL')) {
    return undefined
  }

  const channels = normalized.filter((value): value is NotificationChannel =>
    value === NotificationChannel.IN_APP ||
    value === NotificationChannel.TELEGRAM ||
    value === NotificationChannel.EMAIL,
  )

  return channels.length ? channels : [NotificationChannel.IN_APP]
}

function buildDiagnosticPayload(event: NotificationEvent, input: Record<string, unknown>) {
  switch (event) {
    case NotificationEvent.WEEKLY_SUMMARY:
      return {
        streak: Number(input.streak ?? 5),
        wheels: Number(input.wheels ?? 1),
        sessions: Number(input.sessions ?? 6),
      }
    case NotificationEvent.STREAK_RISK:
      return {
        current: Number(input.current ?? 4),
        mode: 'risk',
      }
    case NotificationEvent.NEAR_LEVEL_UP:
      return {
        nextLevel: String(input.nextLevel ?? 'Builder'),
        xpLeft: Number(input.xpLeft ?? 15),
      }
    case NotificationEvent.LEVEL_UP:
      return {
        level: Number(input.level ?? 2),
      }
    case NotificationEvent.SUBSCRIPTION_EXPIRING:
      return {
        expiresAt: typeof input.expiresAt === 'string'
          ? input.expiresAt
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        daysLeft: Number(input.daysLeft ?? 3),
      }
    case NotificationEvent.SUBSCRIPTION_EXPIRED:
      return {
        previousPlan: String(input.previousPlan ?? 'trial'),
        daysSinceExpired: Number(input.daysSinceExpired ?? 0),
      }
    case NotificationEvent.POST_TRIAL_REPORTS:
      return {
        streak: Number(input.streak ?? 5),
        wheels: Number(input.wheels ?? 1),
        sessions: Number(input.sessions ?? 6),
        daysSinceExpired: Number(input.daysSinceExpired ?? 0),
      }
    case NotificationEvent.AI_INACTIVE:
      return {
        lastInteractionAt: typeof input.lastInteractionAt === 'string'
          ? input.lastInteractionAt
          : new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      }
    default:
      return {}
  }
}

export async function getNotificationsHandler(req: AuthenticatedRequest, res: Response) {
  const userId = resolveNotificationsTargetUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (!isOwnerOrForbidden(req, res, userId)) return

  const limit = Number(req.query.limit)
  const unreadOnly = String(req.query.unreadOnly ?? 'false') === 'true'
  const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20
  const channels = resolveNotificationChannels(req)
  const channelsKey = channels?.join(',') ?? 'all'
  const cacheKey = `notifications:${userId}:feed:${resolvedLimit}:${unreadOnly ? 'unread' : 'all'}:${channelsKey}`
  const cached = await cacheGet<ReturnType<typeof toNotificationReadModel>[]>(cacheKey)
  if (cached) {
    return res.json(cached)
  }

  const notifications = await notificationRecordService.listForUser(userId, {
    limit: Math.max(resolvedLimit * 4, 40),
    unreadOnly,
    channels,
  })

  const response = dedupeNotificationFeed(notifications)
    .slice(0, resolvedLimit)
    .map(toNotificationReadModel)

  await cacheSet(cacheKey, response, 60)
  return res.json(response)
}

export async function getMyNotificationsHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const limit = Number(req.query.limit)
  const unreadOnly = String(req.query.unreadOnly ?? 'false') === 'true'
  const resolvedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20
  const channels = resolveNotificationChannels(req)
  const channelsKey = channels?.join(',') ?? 'all'
  const cacheKey = `notifications:${req.user.id}:feed:${resolvedLimit}:${unreadOnly ? 'unread' : 'all'}:${channelsKey}`
  const cached = await cacheGet<ReturnType<typeof toNotificationReadModel>[]>(cacheKey)
  if (cached) {
    return res.json(cached)
  }

  const notifications = await notificationRecordService.listForUser(req.user.id, {
    limit: Math.max(resolvedLimit * 4, 40),
    unreadOnly,
    channels,
  })

  const response = dedupeNotificationFeed(notifications)
    .slice(0, resolvedLimit)
    .map(toNotificationReadModel)

  await cacheSet(cacheKey, response, 60)
  return res.json(response)
}

export async function markNotificationReadHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const notificationId = req.params.id
  const notifications = await notificationRecordService.listForUser(req.user.id, { limit: 200 })
  const target = notifications.find(notification => notification.id === notificationId)

  if (!target) {
    return res.status(404).json({ error: 'notification_not_found' })
  }

  const updated = await notificationRecordService.markAsRead(notificationId)
  return res.json(toNotificationReadModel(updated))
}

export async function markAllNotificationsReadHandler(req: AuthenticatedRequest, res: Response) {
  const userId = resolveNotificationsTargetUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (!isOwnerOrForbidden(req, res, userId)) return

  await notificationRecordService.markAllAsRead(userId)
  return res.json({ success: true })
}

export async function deleteNotificationHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const notificationId = req.params.id
  const notifications = await notificationRecordService.listForUser(req.user.id, { limit: 200 })
  const target = notifications.find(notification => notification.id === notificationId)

  if (!target) {
    return res.status(404).json({ error: 'notification_not_found' })
  }

  await notificationRecordService.deleteForUser(notificationId, req.user.id)
  return res.status(204).send()
}

export async function getNotificationDiagnosticsCatalogHandler(_req: AuthenticatedRequest, res: Response) {
  return res.json({
    events: Object.values(NotificationEvent),
    routes: {
      morning: 'POST /api/notifications/diagnostics/morning',
      evening: 'POST /api/notifications/diagnostics/evening',
      event: 'POST /api/notifications/diagnostics/event',
      dayFlow: 'POST /api/notifications/diagnostics/day-flow',
      trialExpiredFlow: 'POST /api/notifications/diagnostics/trial-expired-flow',
    },
  })
}

export async function sendSessionHandoffHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const session = req.body?.session === 'evening' ? 'evening' : req.body?.session === 'morning' ? 'morning' : null
  if (!session) {
    return res.status(400).json({ error: 'invalid_session' })
  }

  const answers = req.body?.answers && typeof req.body.answers === 'object' && !Array.isArray(req.body.answers)
    ? Object.fromEntries(
        Object.entries(req.body.answers as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    : {}

  const sent = await notificationService.sendSessionHandoffNotification({
    userId: req.user.id,
    session,
    step: typeof req.body?.step === 'number' ? req.body.step : 0,
    answers,
    date: typeof req.body?.date === 'string' ? req.body.date : undefined,
  })

  return res.json({
    ok: true,
    sent,
    session,
  })
}

export async function sendMorningDiagnosticHandler(req: AuthenticatedRequest, res: Response) {
  const userId = resolveDiagnosticTargetUserId(req, res)
  if (!userId) return

  await notificationService.sendDiagnosticEvent(NotificationEvent.DAILY_MORNING_DUE, userId)
  return res.json({ ok: true, event: NotificationEvent.DAILY_MORNING_DUE, userId })
}

export async function sendEveningDiagnosticHandler(req: AuthenticatedRequest, res: Response) {
  const userId = resolveDiagnosticTargetUserId(req, res)
  if (!userId) return

  await notificationService.sendDiagnosticEvent(NotificationEvent.DAILY_EVENING_DUE, userId)
  return res.json({ ok: true, event: NotificationEvent.DAILY_EVENING_DUE, userId })
}

export async function sendNotificationDiagnosticHandler(req: AuthenticatedRequest, res: Response) {
  const userId = resolveDiagnosticTargetUserId(req, res)
  if (!userId) return

  const rawEvent = typeof req.body?.event === 'string' ? req.body.event : ''
  if (!Object.values(NotificationEvent).includes(rawEvent as NotificationEvent)) {
    return res.status(400).json({ error: 'invalid_event' })
  }

  const event = rawEvent as NotificationEvent
  const payload = buildDiagnosticPayload(event, (req.body?.payload ?? {}) as Record<string, unknown>)

  await notificationService.sendDiagnosticEvent(event, userId, payload)
  return res.json({ ok: true, event, userId, payload })
}

export async function sendDayFlowDiagnosticsHandler(req: AuthenticatedRequest, res: Response) {
  const userId = resolveDiagnosticTargetUserId(req, res)
  if (!userId) return

  const scenarios = [
    { event: NotificationEvent.DAILY_MORNING_DUE, payload: {} },
    { event: NotificationEvent.AI_INACTIVE, payload: buildDiagnosticPayload(NotificationEvent.AI_INACTIVE, {}) },
    { event: NotificationEvent.DAILY_EVENING_DUE, payload: {} },
    { event: NotificationEvent.WEEKLY_SUMMARY, payload: buildDiagnosticPayload(NotificationEvent.WEEKLY_SUMMARY, req.body ?? {}) },
    { event: NotificationEvent.SUBSCRIPTION_EXPIRING, payload: buildDiagnosticPayload(NotificationEvent.SUBSCRIPTION_EXPIRING, req.body ?? {}) },
  ] as const

  for (const scenario of scenarios) {
    await notificationService.sendDiagnosticEvent(scenario.event, userId, scenario.payload)
  }

  return res.json({
    ok: true,
    userId,
    scenarios: scenarios.map(scenario => scenario.event),
  })
}

export async function sendTrialExpiredFlowDiagnosticsHandler(req: AuthenticatedRequest, res: Response) {
  const userId = resolveDiagnosticTargetUserId(req, res)
  if (!userId) return

  const expiredPayload = buildDiagnosticPayload(NotificationEvent.SUBSCRIPTION_EXPIRED, req.body ?? {})
  const reportsPayload = buildDiagnosticPayload(NotificationEvent.POST_TRIAL_REPORTS, req.body ?? {})

  await notificationService.sendDiagnosticEvent(NotificationEvent.SUBSCRIPTION_EXPIRED, userId, expiredPayload)
  await notificationService.sendDiagnosticEvent(NotificationEvent.POST_TRIAL_REPORTS, userId, reportsPayload)

  return res.json({
    ok: true,
    userId,
    scenarios: [NotificationEvent.SUBSCRIPTION_EXPIRED, NotificationEvent.POST_TRIAL_REPORTS],
  })
}

export async function getNotificationDiagnosticsStatusHandler(req: AuthenticatedRequest, res: Response) {
  const requestedUserId = typeof req.query.userId === 'string' && req.query.userId.trim()
    ? req.query.userId.trim()
    : req.user?.id ?? null

  if (!requestedUserId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (requestedUserId !== req.user?.id && !canManageDiagnostics(req)) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const [user, preferences, queueAvailable, latestTelegramNotification, latestInAppNotification] = await Promise.all([
    prisma.user.findUnique({
      where: { id: requestedUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        telegramChatId: true,
        telegramUserId: true,
        telegramLinkedAt: true,
        telegramLinks: {
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            chatId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          take: 3,
        },
      },
    }),
    notificationPreferenceService.getOrCreate(requestedUserId),
    notificationJobService.isQueueAvailable().catch(() => false),
    prisma.notification.findFirst({
      where: {
        userId: requestedUserId,
        channel: 'TELEGRAM',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        templateKey: true,
        status: true,
        failureReason: true,
        createdAt: true,
        sentAt: true,
      },
    }),
    prisma.notification.findFirst({
      where: {
        userId: requestedUserId,
        channel: 'IN_APP',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        templateKey: true,
        status: true,
        failureReason: true,
        createdAt: true,
        sentAt: true,
      },
    }),
  ])

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  return res.json({
    ok: true,
    userId: user.id,
    profile: {
      email: user.email,
      firstName: user.firstName,
    },
    telegram: {
      linked: Boolean(user.telegramChatId || user.telegramUserId || user.telegramLinks.some(link => Boolean(link.chatId))),
      telegramChatId: user.telegramChatId,
      telegramUserId: user.telegramUserId,
      telegramLinkedAt: user.telegramLinkedAt,
      activeLinks: user.telegramLinks,
    },
    preferences: {
      telegramEnabled: preferences.telegramEnabled,
      timezone: preferences.timezone,
      dailyMorningEnabled: preferences.dailyMorningEnabled,
      dailyMorningTime: preferences.dailyMorningTime,
      dailyEveningEnabled: preferences.dailyEveningEnabled,
      dailyEveningTime: preferences.dailyEveningTime,
      weeklySummaryEnabled: preferences.weeklySummaryEnabled,
      aiRemindersEnabled: preferences.aiRemindersEnabled,
      streakRiskEnabled: preferences.streakRiskEnabled,
      streakBrokenEnabled: preferences.streakBrokenEnabled,
      subscriptionEnabled: preferences.subscriptionEnabled,
    },
    queue: {
      available: queueAvailable,
    },
    lastDelivery: {
      telegram: latestTelegramNotification,
      inApp: latestInAppNotification,
    },
  })
}
