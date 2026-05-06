import {
  NotificationChannel,
  type Prisma,
  type Notification,
  NotificationStatus,
  NotificationType,
  type NotificationJob,
  type User,
} from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { NotificationEvent } from './NotificationEvent.js'
import { notificationDeliveryLayer } from './delivery/NotificationDeliveryLayer.js'
import type { DeliveryMessage, DeliveryUser } from './delivery/types.js'
import {
  buildNotificationData,
  getNotificationDuplicateWindowStart,
  isCriticalNotificationTemplate,
  resolveNotificationTemplateKey,
  resolveNotificationType,
} from './domain/notificationPolicy.js'
import { notificationPreferenceRepository } from './repositories/NotificationPreferenceRepository.js'
import { notificationJobService } from './services/NotificationJobService.js'
import { notificationRecordService } from './services/NotificationRecordService.js'
import { LEVELS } from '../../modules/gamification/level.system.js'
import { buildTelegramDeepLink, generateDeepLink } from '../../modules/deeplinks/service.js'
import { getUserAccess } from '../../modules/access/service.js'
import { isNotificationAllowedForUser } from '../../modules/flow-control/service.js'
import { resolvePausedMentorContext } from './mentorLifecycle.js'
import { buildNotificationContent } from '../../lib/notifications/templates.js'
import {
  canSendCrossChannelNotification,
  markCrossChannelNotificationSent,
} from '../../modules/user-state/crossChannelState.service.js'

type EventPayload = Record<string, unknown>

type PersistedJobPayload = {
  event: NotificationEvent
  userId: string
  payload?: EventPayload
}

type WeeklySummaryPayload = {
  streak: number
  wheels: number
  sessions: number
}

const DAILY_LIMIT = 2
const STREAK_MILESTONE_REWARDS: Record<number, { neuroGems: number; bitMind?: number }> = {
  3: { neuroGems: 10 },
  7: { neuroGems: 30 },
  14: { neuroGems: 60 },
  30: { neuroGems: 100, bitMind: 1 },
  100: { neuroGems: 300, bitMind: 3 },
}

const LOCAL_FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const TELEGRAM_SAFE_FRONTEND_URL = (() => {
  const configured = process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim()
    || process.env.PUBLIC_FRONTEND_URL?.trim()
    || process.env.FRONTEND_URL?.trim()
    || ''

  try {
    const url = new URL(configured)
    if (url.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
      return url.toString().replace(/\/$/, '')
    }
  } catch {
    // fall through to hosted frontend fallback
  }

  return 'https://starway-frontend.vercel.app'
})()
const DEFAULT_MINIAPP_URL = (
  process.env.MINIAPP_URL?.trim()
  || `${TELEGRAM_SAFE_FRONTEND_URL}/miniapp`
).replace(/\/$/, '')

function minutesToDate(minutesFromMidnight: number, baseDate = new Date()) {
  const date = new Date(baseDate)
  date.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0)
  return date
}

function nextMorningNine(baseDate = new Date()) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return date
}

function startOfDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date = new Date()) {
  const next = startOfDay(date)
  next.setDate(next.getDate() + 1)
  return next
}

function buildMiniAppStartUrl(startapp: string) {
  const url = new URL(DEFAULT_MINIAPP_URL)
  url.searchParams.set('startapp', startapp)
  return url.toString()
}

function buildTelegramSafeWebDeepLink(token: string, path?: string | null) {
  const url = new URL(path ?? '/onboarding/continue', TELEGRAM_SAFE_FRONTEND_URL)
  url.searchParams.set('dl', token)
  return url.toString()
}

async function buildWebFlowUrl(input: {
  userId: string
  path: string
  payload?: EventPayload
}) {
  try {
    const link = await generateDeepLink({
      userId: input.userId,
      action: 'continue_flow',
      source: 'telegram',
      target: 'web',
      path: input.path,
      payload: input.payload as Prisma.InputJsonValue | undefined,
    })
    return buildTelegramSafeWebDeepLink(link.token, input.path)
  } catch {
    return `${TELEGRAM_SAFE_FRONTEND_URL}${input.path}`
  }
}

function buildMentorTelegramActions(input: {
  miniAppUrl: string
  webUrl: string
  telegramCallback: string
}) {
  return [
    {
      text: '✦ Перейти в мініап',
      url: input.miniAppUrl,
      mode: 'web_app' as const,
    },
    {
      text: '✦ Перейти для відповідей на сайт',
      url: input.webUrl,
      mode: 'url' as const,
    },
    {
      text: '✦ Продовжити відповідати в Telegram',
      url: input.telegramCallback,
      mode: 'callback' as const,
    },
  ]
}

function toPersistedJobPayload(payload: unknown): PersistedJobPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('notification_job_payload_invalid')
  }

  const record = payload as Record<string, unknown>
  const event = record.event
  const userId = record.userId

  if (typeof event !== 'string' || typeof userId !== 'string') {
    throw new Error('notification_job_payload_invalid')
  }

  return {
    event: event as NotificationEvent,
    userId,
    payload: typeof record.payload === 'object' && record.payload !== null && !Array.isArray(record.payload)
      ? record.payload as EventPayload
      : undefined,
  }
}

function buildWeeklySummaryPayload(payload?: EventPayload): WeeklySummaryPayload {
  return {
    streak: Number(payload?.streak ?? 0),
    wheels: Number(payload?.wheels ?? 0),
    sessions: Number(payload?.sessions ?? 0),
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function buildTelegramCard(input: {
  title: string
  intro?: string
  facts?: string[]
  note?: string
  closing?: string
}) {
  const lines: string[] = [`<b>${escapeHtml(input.title)}</b>`]

  if (input.intro) {
    lines.push('', escapeHtml(input.intro))
  }

  if (input.facts?.length) {
    lines.push('', ...input.facts.map((fact) => `• ${escapeHtml(fact)}`))
  }

  if (input.note) {
    lines.push('', `<blockquote>${escapeHtml(input.note)}</blockquote>`)
  }

  if (input.closing) {
    lines.push('', escapeHtml(input.closing))
  }

  return lines.join('\n')
}

async function loadEligibleUsers(): Promise<Array<Pick<User, 'id' | 'firstName' | 'email' | 'telegramChatId' | 'telegramUserId'> & { telegramLinks: Array<{ chatId: string | null }> }>> {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { telegramChatId: { not: null } },
        { telegramUserId: { not: null } },
        { telegramLinks: { some: { isActive: true, chatId: { not: null } } } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      email: true,
      telegramChatId: true,
      telegramUserId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })
}

async function loadDeliveryUser(userId: string): Promise<DeliveryUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      email: true,
      telegramChatId: true,
      telegramUserId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })
}

export class NotificationService {
  private async hasMentorSessionAccess(userId: string): Promise<boolean> {
    const [access, user] = await Promise.all([
      getUserAccess(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
    ])

    if (user?.email?.startsWith('telegram-guest-')) {
      return false
    }

    return Boolean(
      access.abilities['mentor.daily'] === true ||
      access.abilities['mentor.core'] === true,
    )
  }

  private async shouldSuppressMentorTaskNotification(userId: string): Promise<boolean> {
    return Boolean(await resolvePausedMentorContext(userId))
  }

  private async shouldSuppressMentorNotification(event: NotificationEvent, userId: string): Promise<boolean> {
    if (
      event !== NotificationEvent.DAILY_MORNING_DUE &&
      event !== NotificationEvent.DAILY_EVENING_DUE &&
      event !== NotificationEvent.AI_INACTIVE
    ) {
      return false
    }

    return !(await this.hasMentorSessionAccess(userId))
  }

  private buildImmediateJob(event: NotificationEvent, userId: string, payload?: EventPayload): NotificationJob {
    const now = new Date()
    return {
      id: `instant:${event}:${userId}:${now.getTime()}`,
      type: resolveNotificationType(event),
      payload: ({
        event,
        userId,
        payload: payload ?? {},
      } satisfies PersistedJobPayload) as NotificationJob['payload'],
      runAt: now,
      status: 'DONE',
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    }
  }

  private async sendDirectTelegramNotification(input: {
    userId: string
    type: NotificationType
    title: string
    body: string
    telegramHtml?: string
    templateKey: string
    ctaText?: string
    ctaUrl?: string
    ctaMode?: 'web_app' | 'url'
    ctaActions?: Array<{
      text: string
      url: string
      mode?: 'web_app' | 'url' | 'callback'
    }>
    data?: EventPayload
    duplicateWindowStart?: Date
    isEnabled: (preferences: Awaited<ReturnType<typeof notificationPreferenceRepository.ensureForUser>>) => boolean
    force?: boolean
    requiresMentorAccess?: boolean
  }): Promise<boolean> {
    const user = await loadDeliveryUser(input.userId)
    if (!user) return false

    if (input.requiresMentorAccess && !(await this.hasMentorSessionAccess(input.userId))) {
      return false
    }

    const preferences = await notificationPreferenceRepository.ensureForUser(input.userId)
    const dayStart = startOfDay()
    const dayEnd = endOfDay()
    const duplicateWindowStart = input.duplicateWindowStart ?? dayStart
    const message: DeliveryMessage = {
      title: input.title,
      body: input.body,
      telegramHtml: input.telegramHtml,
      ctaText: input.ctaText,
      ctaUrl: input.ctaUrl,
      ctaMode: input.ctaMode,
      ctaActions: input.ctaActions,
    }

    const inAppDuplicate = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        templateKey: input.templateKey,
        createdAt: { gte: duplicateWindowStart, lt: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!inAppDuplicate) {
      await this.createNotification({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: {
          ...(input.data ?? {}),
          ctaText: message.ctaText ?? null,
          ctaUrl: message.ctaUrl ?? null,
          ctaMode: message.ctaMode ?? null,
          sourceChannel: 'telegram',
        },
        templateKey: input.templateKey,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
      })
      await notificationDeliveryLayer.sendInApp(user, message)
    }

    if (!preferences.telegramEnabled || (!input.force && !input.isEnabled(preferences))) {
      return false
    }

    const duplicate = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        channel: NotificationChannel.TELEGRAM,
        templateKey: input.templateKey,
        createdAt: { gte: duplicateWindowStart, lt: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (duplicate && !input.force) return false

    if (!input.force && !isCriticalNotificationTemplate(input.templateKey)) {
      const todayCount = await prisma.notification.count({
        where: {
          userId: input.userId,
          channel: NotificationChannel.TELEGRAM,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      })

      if (todayCount >= DAILY_LIMIT) {
        return false
      }
    }

    const sent = await notificationDeliveryLayer.sendTelegram(user, message)

    await this.createNotification({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: {
        ...(input.data ?? {}),
        ctaText: message.ctaText ?? null,
        ctaUrl: message.ctaUrl ?? null,
        ctaMode: message.ctaMode ?? null,
        sourceChannel: 'telegram',
      },
      templateKey: input.templateKey,
      channel: NotificationChannel.TELEGRAM,
      status: sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
      sentAt: sent ? new Date() : null,
    })

    return sent
  }

  async emit(event: NotificationEvent, userId: string, payload?: EventPayload): Promise<NotificationJob> {
    if (!(await isNotificationAllowedForUser(event, userId))) {
      console.info('[notifications] skipped by lifecycle guard', {
        event,
        userId,
      })
      return this.buildImmediateJob(event, userId, payload)
    }

    const queueAvailable = await notificationJobService.isQueueAvailable().catch(() => false)
    if (!queueAvailable) {
      console.warn('[notifications] queue unavailable, fallback to immediate send', {
        event,
        userId,
      })
    }

    const job = this.buildImmediateJob(event, userId, payload)
    await this.processJob(job)
    return job
  }

  async schedule(event: NotificationEvent, userId: string, runAt: Date, payload?: EventPayload): Promise<NotificationJob> {
    return this.enqueueJob(event, userId, runAt, payload)
  }

  async createNotification(input: {
    userId: string
    type: NotificationType
    title: string
    body: string
    data?: EventPayload
    templateKey?: string
    channel: NotificationChannel
    status: NotificationStatus
    sentAt?: Date | null
  }): Promise<Notification> {
    return notificationRecordService.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      templateKey: input.templateKey,
      channel: input.channel,
      status: input.status,
      sentAt: input.sentAt ?? null,
    })
  }

  async enqueueJob(event: NotificationEvent, userId: string, runAt: Date, payload?: EventPayload): Promise<NotificationJob> {
    return notificationJobService.enqueue(resolveNotificationType(event), {
      event,
      userId,
      payload: payload ?? {},
    }, runAt)
  }

  async processJob(job: NotificationJob): Promise<void> {
    const persisted = toPersistedJobPayload(job.payload)
    if (!(await isNotificationAllowedForUser(persisted.event, persisted.userId))) {
      console.info('[notifications] skipped queued job by lifecycle guard', {
        event: persisted.event,
        userId: persisted.userId,
      })
      return
    }
    if (!(await canSendCrossChannelNotification(persisted.userId, persisted.event))) {
      console.info('[notifications] skipped queued job by cross-channel state', {
        event: persisted.event,
        userId: persisted.userId,
      })
      return
    }
    const user = await loadDeliveryUser(persisted.userId)

    if (!user) {
      throw new Error('notification_user_not_found')
    }

    if (await this.shouldSuppressMentorNotification(persisted.event, user.id)) {
      console.info('[notifications] skipped: mentor access inactive', {
        event: persisted.event,
        userId: user.id,
      })
      return
    }

    const type = resolveNotificationType(persisted.event)
    const templateKey = resolveNotificationTemplateKey(persisted.event, persisted.payload)
    const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
    const message = await this.buildMessage(persisted.event, user, persisted.payload)
    const dayStart = startOfDay()
    const dayEnd = endOfDay()

    if (persisted.event === NotificationEvent.AI_INACTIVE) {
      const actionableToday = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          channel: NotificationChannel.TELEGRAM,
          createdAt: { gte: dayStart, lt: dayEnd },
          OR: [
            { type: NotificationType.DAILY_MORNING },
            { type: NotificationType.DAILY_EVENING },
            { templateKey: { startsWith: 'session_handoff_' } },
            { templateKey: { startsWith: 'microtask_' } },
            { templateKey: { startsWith: 'task_nudge_' } },
          ],
        },
        select: { id: true },
      })

      if (actionableToday) {
        console.info('[notifications] skipped: AI_INACTIVE conflicts with actionable reminder', {
          userId: user.id,
        })
        return
      }
    }

    const inAppDuplicate = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        channel: NotificationChannel.IN_APP,
        templateKey,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!inAppDuplicate) {
      await this.createNotification({
        userId: user.id,
        type,
        title: message.title,
        body: message.body,
        data: buildNotificationData(persisted.event, persisted.payload, message),
        templateKey,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
      })
      await notificationDeliveryLayer.sendInApp(user, message)
      await markCrossChannelNotificationSent(user.id, persisted.event, 'site')
    }

    if (!preferences.telegramEnabled) {
      return
    }

    if (!this.isEventEnabledByPreferences(persisted.event, preferences)) {
      return
    }

    const duplicateWindowStart = getNotificationDuplicateWindowStart(persisted.event)

    const telegramDuplicate = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        channel: NotificationChannel.TELEGRAM,
        templateKey,
        createdAt: {
          gte: duplicateWindowStart,
          lt: dayEnd,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (telegramDuplicate) {
      console.info('[notifications] telegram skipped: duplicate', {
        event: persisted.event,
        userId: user.id,
        templateKey,
      })
      return
    }

    if (!isCriticalNotificationTemplate(templateKey)) {
      const todayCount = await prisma.notification.count({
        where: {
          userId: user.id,
          channel: NotificationChannel.TELEGRAM,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      })
      if (todayCount >= DAILY_LIMIT) {
        console.info('[notifications] telegram skipped: daily limit reached', {
          event: persisted.event,
          userId: user.id,
          templateKey,
          todayCount,
        })
        return
      }
    }

    const sent = await notificationDeliveryLayer.sendTelegram(user, message)

    await this.createNotification({
      userId: user.id,
      type,
      title: message.title,
      body: message.body,
      data: buildNotificationData(persisted.event, persisted.payload, message),
      templateKey,
      channel: NotificationChannel.TELEGRAM,
      status: sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
      sentAt: sent ? new Date() : null,
    })

    if (!sent) {
      throw new Error('notification_delivery_failed')
    }

    await markCrossChannelNotificationSent(user.id, persisted.event, 'telegram')

    console.info('[notifications] telegram sent', {
      event: persisted.event,
      userId: user.id,
      templateKey,
    })
  }

  async scheduleDailyMorningDue(): Promise<void> {
    const users = await loadEligibleUsers()

    await Promise.all(users.map(async (user) => {
      const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
      if (!preferences.telegramEnabled || !preferences.dailyMorningEnabled) return
      await this.schedule(NotificationEvent.DAILY_MORNING_DUE, user.id, minutesToDate(preferences.dailyMorningTime))
    }))
  }

  async scheduleDailyEveningDue(): Promise<void> {
    const users = await loadEligibleUsers()

    await Promise.all(users.map(async (user) => {
      const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
      if (!preferences.telegramEnabled || !preferences.dailyEveningEnabled) return
      await this.schedule(NotificationEvent.DAILY_EVENING_DUE, user.id, minutesToDate(preferences.dailyEveningTime))
    }))
  }

  async scheduleWeeklySummaryDue(): Promise<void> {
    const users = await loadEligibleUsers()
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)

    for (const user of users) {
      const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
      if (!preferences.telegramEnabled || !preferences.weeklySummaryEnabled) continue

      const [streak, wheels, sessions] = await Promise.all([
        prisma.streak.findFirst({
          where: { userId: user.id, ruleKey: 'daily_checkin', endAt: null },
          orderBy: { updatedAt: 'desc' },
          select: { current: true },
        }),
        prisma.wheelAssessment.count({
          where: { userId: user.id, createdAt: { gte: weekStart } },
        }),
        prisma.dailyEntry.count({
          where: { userId: user.id, createdAt: { gte: weekStart } },
        }),
      ])

      await this.schedule(NotificationEvent.WEEKLY_SUMMARY, user.id, new Date(), {
        streak: streak?.current ?? 0,
        wheels,
        sessions,
      })
    }
  }

  async scheduleStreakRiskDue(): Promise<void> {
    const users = await loadEligibleUsers()
    const todayStart = startOfDay()

    for (const user of users) {
      const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
      if (!preferences.telegramEnabled || !preferences.streakRiskEnabled) continue

      const [streak, todayActivity] = await Promise.all([
        prisma.streak.findFirst({
          where: { userId: user.id, ruleKey: 'daily_checkin', endAt: null },
          orderBy: { updatedAt: 'desc' },
          select: { current: true },
        }),
        prisma.dailyEntry.findFirst({
          where: {
            userId: user.id,
            createdAt: { gte: todayStart },
          },
          select: { id: true },
        }),
      ])

      const current = streak?.current ?? 0
      if (current <= 0 || todayActivity) continue

      await this.schedule(NotificationEvent.STREAK_RISK, user.id, new Date(), { current })
    }
  }

  async sendDailyMorning(userId: string): Promise<NotificationJob> {
    return this.emit(NotificationEvent.DAILY_MORNING_DUE, userId)
  }

  async sendDailyEvening(userId: string): Promise<NotificationJob> {
    return this.emit(NotificationEvent.DAILY_EVENING_DUE, userId)
  }

  async sendStreakAlert(userId: string, currentStreak: number): Promise<NotificationJob> {
    return this.emit(NotificationEvent.STREAK_RISK, userId, { current: currentStreak })
  }

  async sendLevelUp(userId: string, level: number): Promise<NotificationJob> {
    return this.emit(NotificationEvent.LEVEL_UP, userId, { level })
  }

  async sendWeeklySummary(userId: string, summary: WeeklySummaryPayload): Promise<NotificationJob> {
    return this.emit(NotificationEvent.WEEKLY_SUMMARY, userId, summary)
  }

  async sendStreakBroken(userId: string): Promise<NotificationJob> {
    return this.emit(NotificationEvent.STREAK_BROKEN, userId)
  }

  async sendNewMicroTasks(userId: string, firstName: string, titles: string[]): Promise<void> {
    if (await this.shouldSuppressMentorTaskNotification(userId)) {
      return
    }

    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: '✦ AI склав твої завдання на сьогодні',
      body: [
        `${firstName}, готово ${titles.length} мікрозавдання.`,
        '',
        ...titles.slice(0, 3).map(title => `• ${title}`),
        '',
        'Почни з першого — він найважливіший.',
      ].join('\n'),
      telegramHtml: buildTelegramCard({
        title: '✦ AI склав твої завдання на сьогодні',
        intro: `${firstName}, готово ${titles.length} мікрозавдання.`,
        facts: titles.slice(0, 3),
        note: 'Почни з першого — він зараз дасть найбільший рух.',
      }),
      templateKey: `microtasks_${startOfDay().toISOString().slice(0, 10)}`,
      ctaText: '🗂 Відкрити завдання',
      ctaUrl: buildMiniAppStartUrl('tasks'),
      data: { titles },
      isEnabled: preferences => preferences.aiRemindersEnabled,
      requiresMentorAccess: true,
    })
  }

  async sendTaskCompleted(userId: string, taskTitle: string, xpReward: number): Promise<void> {
    if (await this.shouldSuppressMentorTaskNotification(userId)) {
      return
    }

    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: '✅ Завдання виконано',
      body: `Ти закрив(ла) "${taskTitle}". +${xpReward} XP 🔥 Наступний крок уже готовий.`,
      telegramHtml: buildTelegramCard({
        title: '✅ Завдання виконано',
        intro: 'Крок зафіксовано в системі.',
        facts: [
          taskTitle,
          `Нараховано: +${xpReward} XP`,
        ],
        note: 'Наступний крок: запланувати зустріч або закріпити рух у системі.',
      }),
      templateKey: `task_completed_${taskTitle.slice(0, 48)}`,
      ctaText: '📊 Мій прогрес',
      ctaUrl: buildMiniAppStartUrl('tracker'),
      data: { taskTitle, xpReward },
      isEnabled: preferences => preferences.aiRemindersEnabled,
      requiresMentorAccess: true,
    })
  }

  async sendMicroTaskReminder(userId: string, taskTitle: string, dueSoon = false): Promise<void> {
    if (await this.shouldSuppressMentorTaskNotification(userId)) {
      return
    }

    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: dueSoon ? '⏰ Дедлайн уже близько' : '📌 Повернись до задачі',
      body: dueSoon
        ? `Задача "${taskTitle}" добігає дедлайну. Краще закрити її зараз коротким ривком.`
        : `Задача "${taskTitle}" ще не почата. Один крок зараз збереже темп дня.`,
      telegramHtml: buildTelegramCard({
        title: dueSoon ? '⏰ Дедлайн уже близько' : '📌 Повернись до задачі',
        intro: dueSoon
          ? 'Час по цій задачі майже вичерпано.'
          : 'Ця задача ще не почата, але день можна втримати одним кроком.',
        facts: [taskTitle],
        note: dueSoon
          ? 'Краще закрити її зараз коротким ривком.'
          : 'Один крок зараз збереже темп дня.',
      }),
      templateKey: `${dueSoon ? 'microtask_due' : 'microtask_nudge'}_${taskTitle.slice(0, 40)}_${startOfDay().toISOString().slice(0, 10)}`,
      ctaText: '🗂 Відкрити завдання',
      ctaUrl: buildMiniAppStartUrl('tasks'),
      data: { taskTitle, dueSoon },
      isEnabled: preferences => preferences.aiRemindersEnabled,
      requiresMentorAccess: true,
    })
  }

  async sendExpiredTaskNotice(userId: string, taskTitle: string): Promise<void> {
    if (await this.shouldSuppressMentorTaskNotification(userId)) {
      return
    }

    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: '📦 Дедлайн задачі минув',
      body: `Задача "${taskTitle}" перейшла в прострочені. На вечірній рефлексії можна буде або закрити її, або перепланувати.`,
      telegramHtml: buildTelegramCard({
        title: '📦 Дедлайн задачі минув',
        intro: 'Одна із задач перейшла в прострочені.',
        facts: [taskTitle],
        note: 'На вечірній рефлексії її можна або закрити, або перепланувати без хаосу.',
      }),
      templateKey: `microtask_expired_${taskTitle.slice(0, 40)}_${startOfDay().toISOString().slice(0, 10)}`,
      ctaText: '🌙 Вечірня рефлексія',
      ctaUrl: buildMiniAppStartUrl('ai_evening'),
      data: { taskTitle },
      isEnabled: preferences => preferences.aiRemindersEnabled,
      requiresMentorAccess: true,
    })
  }

  async scheduleStreakBroken(userId: string): Promise<NotificationJob> {
    return this.schedule(NotificationEvent.STREAK_BROKEN, userId, nextMorningNine())
  }

  async sendDiagnosticEvent(event: NotificationEvent, userId: string, payload?: EventPayload): Promise<boolean> {
    const user = await loadDeliveryUser(userId)
    if (!user) {
      throw new Error('notification_user_not_found')
    }

    const message = await this.buildMessage(event, user, payload)
    const templateKey = `test_${resolveNotificationTemplateKey(event, payload)}_${Date.now()}`

    const sent = await this.sendDirectTelegramNotification({
      userId,
      type: resolveNotificationType(event),
      title: `🧪 Тест · ${message.title}`,
      body: message.body,
      telegramHtml: message.telegramHtml,
      templateKey,
      ctaText: message.ctaText,
      ctaUrl: message.ctaUrl,
      ctaMode: message.ctaMode,
      ctaActions: message.ctaActions,
      data: {
        ...(payload ?? {}),
        diagnostic: true,
        sourceEvent: event,
      },
      isEnabled: () => true,
      force: true,
    })

    if (!sent) {
      throw new Error('notification_delivery_failed')
    }

    console.info('[notifications] diagnostic telegram sent', {
      event,
      userId,
      templateKey,
    })

    return sent
  }

  async sendSessionHandoffNotification(input: {
    userId: string
    session: 'morning' | 'evening'
    step?: number
    answers?: Record<string, string>
    date?: string
  }): Promise<boolean> {
    const startOfToday = startOfDay()
    const dateKey = startOfToday.toISOString().slice(0, 10)
    const sessionPath = '/dashboard?from=tg&step=cycle'
    const miniAppUrl = buildMiniAppStartUrl(input.session === 'morning' ? 'ai_morning' : 'ai_evening')

    let telegramUrl = ''
    let webUrl = `${TELEGRAM_SAFE_FRONTEND_URL}${sessionPath}`
    try {
      const deepLink = await generateDeepLink({
        userId: input.userId,
        action: 'resume_task',
        source: 'web',
        target: 'telegram',
        path: sessionPath,
        payload: {
          session: input.session,
          step: Math.max(0, Number(input.step ?? 0)),
          answers: input.answers ?? {},
          date: input.date ?? new Date().toISOString(),
        },
      })
      telegramUrl = buildTelegramDeepLink(deepLink.token)
    } catch (error) {
      console.warn('[notifications] failed to generate telegram resume deeplink, falling back to mini app', {
        userId: input.userId,
        session: input.session,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    }

    try {
      const webLink = await generateDeepLink({
        userId: input.userId,
        action: 'continue_flow',
        source: 'telegram',
        target: 'web',
        path: sessionPath,
        payload: {
          session: input.session,
          step: Math.max(0, Number(input.step ?? 0)),
          answers: input.answers ?? {},
          date: input.date ?? new Date().toISOString(),
        },
      })
      webUrl = buildTelegramSafeWebDeepLink(webLink.token, sessionPath)
    } catch (error) {
      console.warn('[notifications] failed to generate web session handoff deeplink, falling back to dashboard path', {
        userId: input.userId,
        session: input.session,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    }

    return this.sendDirectTelegramNotification({
      userId: input.userId,
      type: input.session === 'morning' ? NotificationType.DAILY_MORNING : NotificationType.DAILY_EVENING,
      title: input.session === 'morning' ? '🌅 Твій фокус' : '🌙 Що було найцінніше сьогодні?',
      body: input.session === 'morning'
        ? 'Один короткий крок уже визначений. Обери, де зручно продовжити: у mini app, на сайті або прямо тут у Telegram.'
        : 'Закрий день одним коротким підсумком. Обери, де зручно завершити цикл: у mini app, на сайті або прямо тут у Telegram.',
      templateKey: `session_handoff_${input.session}_${dateKey}`,
      ctaActions: buildMentorTelegramActions({
        miniAppUrl,
        webUrl,
        telegramCallback: input.session === 'morning' ? 'resume_morning_session' : 'resume_evening_session',
      }),
      data: {
        session: input.session,
        step: input.step ?? 0,
        answersCount: Object.keys(input.answers ?? {}).length,
        date: input.date ?? new Date().toISOString(),
      },
      duplicateWindowStart: startOfToday,
      isEnabled: preferences => input.session === 'morning'
        ? preferences.dailyMorningEnabled
        : preferences.dailyEveningEnabled,
    })
  }

  private isEventEnabledByPreferences(
    event: NotificationEvent,
    preferences: Awaited<ReturnType<typeof notificationPreferenceRepository.ensureForUser>>,
  ) {
    switch (event) {
      case NotificationEvent.DAILY_MORNING_DUE:
        return preferences.dailyMorningEnabled
      case NotificationEvent.DAILY_EVENING_DUE:
        return preferences.dailyEveningEnabled
      case NotificationEvent.LEVEL_UP:
      case NotificationEvent.NEAR_LEVEL_UP:
        return preferences.levelUpEnabled
      case NotificationEvent.AI_INACTIVE:
        return preferences.aiRemindersEnabled
      case NotificationEvent.STREAK_RISK:
        return preferences.streakRiskEnabled
      case NotificationEvent.STREAK_MILESTONE:
        return preferences.streakAlertsEnabled
      case NotificationEvent.STREAK_BROKEN:
        return preferences.streakBrokenEnabled
      case NotificationEvent.WEEKLY_SUMMARY:
        return preferences.weeklySummaryEnabled
      case NotificationEvent.SUBSCRIPTION_EXPIRING:
        return preferences.subscriptionEnabled
      case NotificationEvent.SUBSCRIPTION_EXPIRED:
        return preferences.subscriptionEnabled
      case NotificationEvent.POST_TRIAL_REPORTS:
        return preferences.subscriptionEnabled
      default:
        return true
    }
  }

  private async buildMessage(event: NotificationEvent, user: DeliveryUser, payload?: EventPayload): Promise<DeliveryMessage> {
    const firstName = user.firstName ?? 'Привіт'

    switch (event) {
      case NotificationEvent.DAILY_MORNING_DUE:
      {
        const sessionPath = '/dashboard?from=tg&step=cycle'
        let webUrl = `${TELEGRAM_SAFE_FRONTEND_URL}${sessionPath}`
        try {
          const webLink = await generateDeepLink({
            userId: user.id,
            action: 'continue_flow',
            source: 'telegram',
            target: 'web',
            path: sessionPath,
            payload: {
              session: 'morning',
              step: 0,
              date: new Date().toISOString(),
            },
          })
          webUrl = buildTelegramSafeWebDeepLink(webLink.token, sessionPath)
        } catch {
          // fall back to direct dashboard path
        }

        return {
          title: '🌅 Твій фокус',
          body: `${firstName}, твій фокус уже визначений. Один короткий крок зараз збере день у систему.`,
          telegramHtml: buildTelegramCard({
            title: '🌅 Твій фокус',
            intro: `${firstName}, один короткий крок зараз збере день у систему.`,
            facts: [
              'Почни там, де тобі зараз зручніше',
              'Mini App, сайт і Telegram ведуть в одну дію',
            ],
            note: 'Telegram тут не для нагадування, а для продовження дії.',
          }),
          ctaActions: buildMentorTelegramActions({
            miniAppUrl: buildMiniAppStartUrl('ai_morning'),
            webUrl,
            telegramCallback: 'resume_morning_session',
          }),
        }
      }
      case NotificationEvent.DAILY_EVENING_DUE:
      {
        const sessionPath = '/dashboard?from=tg&step=cycle'
        let webUrl = `${TELEGRAM_SAFE_FRONTEND_URL}${sessionPath}`
        try {
          const webLink = await generateDeepLink({
            userId: user.id,
            action: 'continue_flow',
            source: 'telegram',
            target: 'web',
            path: sessionPath,
            payload: {
              session: 'evening',
              step: 0,
              date: new Date().toISOString(),
            },
          })
          webUrl = buildTelegramSafeWebDeepLink(webLink.token, sessionPath)
        } catch {
          // fall back to direct dashboard path
        }

        return {
          title: '🌙 Що було найцінніше сьогодні?',
          body: `${firstName}, один короткий підсумок зараз закриє день у систему і підтримає ритм.`,
          telegramHtml: buildTelegramCard({
            title: '🌙 Що було найцінніше сьогодні?',
            intro: `${firstName}, один короткий підсумок зараз закриє день у систему і підтримає ритм.`,
            facts: [
              'Підсумок дня закриває цикл',
              'Завтрашній старт стає чистішим після короткої вечірньої фіксації',
            ],
            note: 'Обери Mini App, сайт або Telegram і продовжуй без розриву.',
          }),
          ctaActions: buildMentorTelegramActions({
            miniAppUrl: buildMiniAppStartUrl('ai_evening'),
            webUrl,
            telegramCallback: 'resume_evening_session',
          }),
        }
      }
      case NotificationEvent.STREAK_RISK: {
        const current = Number(payload?.current ?? 0)
        const content = buildNotificationContent(NotificationEvent.STREAK_RISK, {
          userName: firstName,
          streakDays: current,
        })
        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: '⚡ Стрік під загрозою',
            intro: `${firstName}, сьогодні ще можна втримати серію.`,
            facts: [
              `Поточний стрік: ${current} днів`,
              'Одна коротка дія збереже ритм',
            ],
            note: 'Не треба робити все. Треба зробити один крок сьогодні.',
          }),
          ctaText: '🔥 Зберегти стрік',
          ctaUrl: buildMiniAppStartUrl('tracker'),
        }
      }
      case NotificationEvent.STREAK_MILESTONE: {
        const current = Number(payload?.current ?? 0)
        const reward = STREAK_MILESTONE_REWARDS[current]
        const streakMessages: Record<number, string> = {
          3: 'Ти вже формуєш звичку. Перші три дні були найскладніші — ти їх пройшла.',
          7: 'Тиждень без зупинки. Звичка вже починає закріплюватися.',
          14: 'Два тижні системної роботи. Ти вже не стартуєш — ти продовжуєш.',
          30: 'Місяць безперервної роботи. Це вже архітектура звички, не випадковий ривок.',
          100: 'Сто днів. Це легендарна стабільність і реальний системний стиль.',
        }
        const rewardLine = reward
          ? ` Нагорода: +${reward.neuroGems} NEUROGEMS${reward.bitMind ? ` · +${reward.bitMind} BITMIND` : ''}.`
          : ''
        return {
          title: `🔥 Стрік ${current} днів`,
          body: `${firstName}, ${streakMessages[current] ?? 'Ти зафіксувала важливу серію днів.'}${rewardLine}`,
          ctaText: current >= 30 ? '🏅 Відкрити нагороду' : '📊 Мій прогрес',
          ctaUrl: buildMiniAppStartUrl(current >= 30 ? 'level_up' : 'tracker'),
        }
      }
      case NotificationEvent.STREAK_BROKEN:
      {
        const content = buildNotificationContent(NotificationEvent.STREAK_BROKEN, {
          userName: firstName,
        })
        return {
          title: content.title,
          body: content.body,
          ctaText: '💎 Відкрити трекер',
          ctaUrl: buildMiniAppStartUrl('tracker'),
        }
      }
      case NotificationEvent.LEVEL_UP:
      {
        const nextLevel = LEVELS.find(level => level.level === Number(payload?.level ?? 1))
        const rewardMap: Record<string, number> = {
          Explorer: 20,
          Thinker: 30,
          Builder: 50,
          Strategist: 100,
          Visionary: 120,
          Architect: 160,
          Mentor: 200,
          Mastermind: 240,
          Oracle: 300,
        }
        return {
          title: '🌟 Новий рівень',
          body: nextLevel
            ? `${firstName} → ${nextLevel.title}. +${rewardMap[nextLevel.title] ?? 0} NEUROGEMS нараховано. Нові можливості вже відкриті.`
            : `Рівень ${Number(payload?.level ?? 1)} відкрито. Твій прогрес зафіксований, відкрий кабінет і подивись що вже відкрито.`,
          ctaText: '🌟 Відкрити нові можливості',
          ctaUrl: buildMiniAppStartUrl('level_up'),
        }
      }
      case NotificationEvent.NEAR_LEVEL_UP:
        return {
          title: '⚡ Майже новий рівень',
          body: `${firstName}, до рівня ${String(payload?.nextLevel ?? '')} залишилось лише ${Number(payload?.xpLeft ?? 0)} XP. Одна дія — і ти там.`,
          ctaText: '🎯 Відкрити практику',
          ctaUrl: buildMiniAppStartUrl('tracker'),
        }
      case NotificationEvent.WEEKLY_SUMMARY: {
        const reportsWebUrl = await buildWebFlowUrl({
          userId: user.id,
          path: '/dashboard/ai-mentor?section=reports',
          payload: {
            source: 'weekly_summary',
            date: new Date().toISOString(),
          },
        })
        const summary = buildWeeklySummaryPayload(payload)
        const content = buildNotificationContent(NotificationEvent.WEEKLY_SUMMARY, {
          userName: firstName,
          streakDays: summary.streak,
          wheels: summary.wheels,
          sessions: summary.sessions,
        })
        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: '📚 Тижневий підсумок',
            intro: `${firstName}, твій тижневий зріз уже сформований.`,
            facts: [
              `Стрік: ${summary.streak}`,
              `Колесо: ${summary.wheels}`,
              `Сесії: ${summary.sessions}`,
            ],
            note: 'Подивись звіти, щоб зрозуміти динаміку за 7 днів і вирішити, який крок робити далі.',
          }),
          ctaActions: [
            {
              text: '✦ Відкрити в мініап',
              url: buildMiniAppStartUrl('tracker'),
              mode: 'web_app',
            },
            {
              text: '✦ Відкрити всі звіти на сайті',
              url: reportsWebUrl,
              mode: 'url',
            },
          ],
        }
      }
      case NotificationEvent.AI_INACTIVE:
      {
        const sessionPath = '/miniapp?startapp=ai'
        let webUrl = `${TELEGRAM_SAFE_FRONTEND_URL}/dashboard/chat`
        try {
          const webLink = await generateDeepLink({
            userId: user.id,
            action: 'continue_flow',
            source: 'telegram',
            target: 'web',
            path: '/dashboard/chat',
            payload: {
              source: 'ai_inactive',
              date: new Date().toISOString(),
            },
          })
          webUrl = buildTelegramSafeWebDeepLink(webLink.token, '/dashboard/chat')
        } catch {
          // fall back to direct dashboard path
        }

        return {
          title: '✦ Повернись в ABsystem',
          body: 'Ти давно не поверталась до ABsystem. Обери, де зручно продовжити далі: у мініапі, на сайті або прямо тут у Telegram.',
          telegramHtml: buildTelegramCard({
            title: '✦ Повернись в ABsystem',
            intro: `${firstName}, твій ритм зараз стоїть без руху.`,
            facts: [
              'Продовжити можна в мініапі',
              'Або на сайті',
              'Або прямо тут у Telegram',
            ],
            note: 'Повернись до одного наступного кроку, а не до хаосу.',
          }),
          ctaActions: buildMentorTelegramActions({
            miniAppUrl: buildMiniAppStartUrl('ai'),
            webUrl,
            telegramCallback: 'continue_ai_mentor_chat',
          }),
        }
      }
      case NotificationEvent.SUBSCRIPTION_EXPIRING:
      {
        const subscriptionWebUrl = await buildWebFlowUrl({
          userId: user.id,
          path: '/dashboard/subscription',
          payload: {
            source: 'subscription_expiring',
            date: new Date().toISOString(),
          },
        })
        const daysLeft = Number(payload?.daysLeft ?? 0)
        const content = buildNotificationContent(NotificationEvent.SUBSCRIPTION_EXPIRING, {
          userName: firstName,
          daysUntilExpiry: daysLeft,
        })
        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: '💎 Підписка',
            intro: daysLeft > 0
              ? `${firstName}, до завершення доступу залишилось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дні' : 'днів'}.`
              : `${firstName}, варто перевірити статус доступу зараз.`,
            facts: [
              'Прогрес і звіти збережені',
              'AI-сесії залежать від активного доступу',
            ],
            note: 'Краще оновити доступ до паузи, а не після втрати ритму.',
          }),
          ctaActions: [
            {
              text: '✦ Відкрити в мініап',
              url: buildMiniAppStartUrl('subscription'),
              mode: 'web_app',
            },
            {
              text: '✦ Відкрити підписку на сайті',
              url: subscriptionWebUrl,
              mode: 'url',
            },
          ],
        }
      }
      case NotificationEvent.SUBSCRIPTION_EXPIRED:
      {
        const subscriptionWebUrl = await buildWebFlowUrl({
          userId: user.id,
          path: '/dashboard/subscription',
          payload: {
            source: 'subscription_expired',
            date: new Date().toISOString(),
          },
        })
        const daysSinceExpired = Number(payload?.daysSinceExpired ?? 0)
        const previousPlan = String(payload?.previousPlan ?? 'trial')
        const recoveryLine = daysSinceExpired <= 1
          ? 'Щоб продовжити ранкові й вечірні сесії, віднови доступ зараз.'
          : 'Ранкові та вечірні сесії залишаються на паузі, доки доступ не буде відновлено.'
        const content = buildNotificationContent(NotificationEvent.SUBSCRIPTION_EXPIRED, {
          userName: firstName,
          previousPlan,
        })

        return {
          title: content.title,
          body: `${content.body.replace(/\.$/, '')} ${daysSinceExpired > 0 ? `${daysSinceExpired} дн. тому.` : 'Сьогодні.'} ${recoveryLine} Обери, де зручно подивитись плани і відновити доступ.`,
          telegramHtml: buildTelegramCard({
            title: previousPlan === 'trial' ? '💎 Тріал завершився' : '💎 Доступ завершився',
            intro: `${firstName}, ${previousPlan === 'trial' ? 'пробний період завершився' : 'твій доступ завершився'} ${daysSinceExpired > 0 ? `${daysSinceExpired} дн. тому` : 'сьогодні'}.`,
            facts: [
              'Історія та звіти збережені',
              'Ранкові й вечірні сесії зараз на паузі',
            ],
            note: recoveryLine,
            closing: 'Обери, де зручно відкрити підписку і повернути доступ.',
          }),
          ctaActions: [
            {
              text: '✦ Обрати підписку в мініап',
              url: buildMiniAppStartUrl('subscription'),
              mode: 'web_app',
            },
            {
              text: '✦ Обрати підписку на сайті',
              url: subscriptionWebUrl,
              mode: 'url',
            },
          ],
        }
      }
      case NotificationEvent.POST_TRIAL_REPORTS:
      {
        const reportsWebUrl = await buildWebFlowUrl({
          userId: user.id,
          path: '/dashboard/ai-mentor?section=reports',
          payload: {
            source: 'post_trial_reports',
            date: new Date().toISOString(),
          },
        })
        const summary = buildWeeklySummaryPayload(payload)
        const content = buildNotificationContent(NotificationEvent.POST_TRIAL_REPORTS, {
          userName: firstName,
          streakDays: summary.streak,
          wheels: summary.wheels,
          sessions: summary.sessions,
        })
        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: '📊 Твій рух за 7 днів',
            intro: `${firstName}, після завершення trial у тебе вже є готовий зріз за 7 днів.`,
            facts: [
              `Стрік: ${summary.streak}`,
              `Колесо: ${summary.wheels}`,
              `Сесії: ${summary.sessions}`,
            ],
            note: 'У звітах ти побачиш: що вже зібрано, що зараз на паузі без підписки і що повернеться одразу після активації Premium.',
          }),
          ctaActions: [
            {
              text: '✦ Відкрити в мініап',
              url: buildMiniAppStartUrl('tracker'),
              mode: 'web_app',
            },
            {
              text: '✦ Відкрити всі звіти на сайті',
              url: reportsWebUrl,
              mode: 'url',
            },
            {
              text: '✦ Обрати підписку',
              url: buildMiniAppStartUrl('subscription'),
              mode: 'web_app',
            },
          ],
        }
      }
    }
  }
}

export const notificationService = new NotificationService()
