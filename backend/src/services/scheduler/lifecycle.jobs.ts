// backend/src/services/scheduler/lifecycle.jobs.ts — lifecycle, winback, referral jobs.
// Інструкція: тут lifecycle-переходи, readiness checks, winback та referral cron-задачі.

import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { notificationService } from '../notifications/NotificationService.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { buildEcosystemPaymentCheckoutUrl, resolveEcosystemPaymentTarget } from '../../modules/subscriptions/payments/business.js'
import { resolveUserLifecycle } from '@/modules/users/runtime/resolveUserLifecycle.js'
import { ensureNotificationPreferenceTableAvailability, getSettingsObject, getUtcDateKey, readTimestamp, resolvePublicFrontendBaseUrl, sendUpgradeOfferTelegramMessage, type SchedulerNotifier } from './common.js'

function buildCountByUserId(
  rows: Array<{ userId: string | null }>,
): Map<string, number> {
  const result = new Map<string, number>()

  for (const row of rows) {
    if (!row.userId) continue
    result.set(row.userId, (result.get(row.userId) ?? 0) + 1)
  }

  return result
}

function buildLimitedWeeklyReportCountByUserId(
  rows: Array<{ userId: string | null; summaryText: string | null }>,
  limitPerUser: number,
): Map<string, number> {
  const seenByUserId = new Map<string, number>()
  const countByUserId = new Map<string, number>()

  for (const row of rows) {
    if (!row.userId) continue
    const seen = seenByUserId.get(row.userId) ?? 0
    if (seen >= limitPerUser) continue

    seenByUserId.set(row.userId, seen + 1)

    const normalized = typeof row.summaryText === 'string' ? row.summaryText.trim() : ''
    if (!normalized) continue

    countByUserId.set(row.userId, (countByUserId.get(row.userId) ?? 0) + 1)
  }

  return countByUserId
}

function buildLimitedWeeklySummariesByUserId(
  rows: Array<{ userId: string | null; summaryText: string | null }>,
  limitPerUser: number,
): Map<string, string[]> {
  const result = new Map<string, string[]>()

  for (const row of rows) {
    if (!row.userId) continue
    const current = result.get(row.userId) ?? []
    if (current.length >= limitPerUser) continue

    current.push(row.summaryText ?? '')
    result.set(row.userId, current)
  }

  return result
}

export async function mentorReadinessCheckCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()
  const threshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const frontendUrl = resolvePublicFrontendBaseUrl()

  const subscriptions = await prisma.productSubscription.findMany({
    where: {
      status: 'active',
      paidAt: { lte: threshold },
      product: {
        code: { in: ['absystem_ai', 'absystem'] },
      },
    },
    select: {
      userId: true,
      paidAt: true,
      user: {
        select: {
          currentState: true,
          currentStep: true,
          funnelStage: true,
          settings: true,
          notificationPreference: {
            select: {
              telegramEnabled: true,
              subscriptionEnabled: true,
            },
          },
        },
      },
    },
  })

  const candidateUserIds = subscriptions
    .filter((subscription) => {
      const preferences = subscription.user.notificationPreference
      if (!preferences?.telegramEnabled || !preferences.subscriptionEnabled) return false
      if (resolveUserLifecycle(subscription.user).value !== 'platform_active') return false

      const settings = getSettingsObject(subscription.user.settings)
      return !readTimestamp(settings.mentorReadinessSentAt)
    })
    .map((subscription) => subscription.userId)

  const [zoomCountByUserId, engagementSignalsByUserId] = candidateUserIds.length > 0
    ? await Promise.all([
        prisma.zoomSessionAttendee.findMany({
          where: {
            userId: { in: candidateUserIds },
            attended: true,
          },
          select: {
            userId: true,
          },
        }).then(buildCountByUserId),
        prisma.weeklyReport.findMany({
          where: {
            userId: { in: candidateUserIds },
            createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
            summaryText: { not: null },
          },
          select: {
            userId: true,
            summaryText: true,
          },
          orderBy: [
            { userId: 'asc' },
            { createdAt: 'desc' },
          ],
        }).then((rows) => buildLimitedWeeklyReportCountByUserId(rows, 4)),
      ])
    : [new Map<string, number>(), new Map<string, number>()]

  for (const subscription of subscriptions) {
    const preferences = subscription.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.subscriptionEnabled) continue
    if (resolveUserLifecycle(subscription.user).value !== 'platform_active') continue

    const settings = getSettingsObject(subscription.user.settings)
    if (readTimestamp(settings.mentorReadinessSentAt)) continue

    const zoomCount = zoomCountByUserId.get(subscription.userId) ?? 0
    if (zoomCount < 2) continue

    const engagementSignals = engagementSignalsByUserId.get(subscription.userId) ?? 0
    if (engagementSignals < 2) continue

    const sent = await sendUpgradeOfferTelegramMessage(
      subscription.userId,
      absystemContent.UPGRADE_FLOWS.WAITLIST_SESSION,
      absystemContent.UPGRADE_FLOWS.WAITLIST_SESSION_CTA,
      `${frontendUrl}/app/waitlist/session`,
    )

    if (!sent) continue

    await prisma.user.update({
      where: { id: subscription.userId },
      data: {
        settings: {
          ...settings,
          mentorReadinessSentAt: now.toISOString(),
        },
      },
    }).catch(() => undefined)
  }
}

export async function personalProgramCheckCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()
  const threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const frontendUrl = resolvePublicFrontendBaseUrl()

  const subscriptions = await prisma.productSubscription.findMany({
    where: {
      status: 'active',
      paidAt: { lte: threshold },
      product: {
        code: { in: ['absystem_ai', 'absystem'] },
      },
    },
    select: {
      userId: true,
      paidAt: true,
      user: {
        select: {
          currentState: true,
          currentStep: true,
          funnelStage: true,
          settings: true,
          notificationPreference: {
            select: {
              telegramEnabled: true,
              subscriptionEnabled: true,
            },
          },
        },
      },
    },
  })

  const candidateUserIds = subscriptions
    .filter((subscription) => {
      const preferences = subscription.user.notificationPreference
      if (!preferences?.telegramEnabled || !preferences.subscriptionEnabled) return false
      if (resolveUserLifecycle(subscription.user).value !== 'platform_active') return false

      const settings = getSettingsObject(subscription.user.settings)
      const sentAt = readTimestamp(settings.personalProgramSentAt)
      return !(sentAt && now.getTime() - sentAt.getTime() < 60 * 24 * 60 * 60 * 1000)
    })
    .map((subscription) => subscription.userId)

  const [zoomCountByUserId, weeklyReportCountByUserId] = candidateUserIds.length > 0
    ? await Promise.all([
        prisma.zoomSessionAttendee.findMany({
          where: {
            userId: { in: candidateUserIds },
            attended: true,
          },
          select: {
            userId: true,
          },
        }).then(buildCountByUserId),
        prisma.weeklyReport.findMany({
          where: {
            userId: { in: candidateUserIds },
            createdAt: { gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
            summaryText: { not: null },
          },
          select: {
            userId: true,
            summaryText: true,
          },
          orderBy: [
            { userId: 'asc' },
            { createdAt: 'desc' },
          ],
        }).then((rows) => buildLimitedWeeklyReportCountByUserId(rows, 8)),
      ])
    : [new Map<string, number>(), new Map<string, number>()]

  for (const subscription of subscriptions) {
    const preferences = subscription.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.subscriptionEnabled) continue
    if (resolveUserLifecycle(subscription.user).value !== 'platform_active') continue

    const settings = getSettingsObject(subscription.user.settings)
    const sentAt = readTimestamp(settings.personalProgramSentAt)
    if (sentAt && now.getTime() - sentAt.getTime() < 60 * 24 * 60 * 60 * 1000) continue

    const zoomCount = zoomCountByUserId.get(subscription.userId) ?? 0
    if (zoomCount < 2) continue

    const engagementScore = (weeklyReportCountByUserId.get(subscription.userId) ?? 0) + Math.min(zoomCount, 4)
    if (engagementScore < 6) continue

    const sent = await sendUpgradeOfferTelegramMessage(
      subscription.userId,
      absystemContent.UPGRADE_FLOWS.WAITLIST_PERSONAL,
      absystemContent.UPGRADE_FLOWS.WAITLIST_PERSONAL_CTA,
      `${frontendUrl}/app/waitlist/personal`,
    )

    if (!sent) continue

    await prisma.user.update({
      where: { id: subscription.userId },
      data: {
        settings: {
          ...settings,
          personalProgramSentAt: now.toISOString(),
        },
      },
    }).catch(() => undefined)
  }
}

export type WinbackKey = 'WINBACK_3D' | 'WINBACK_7D' | 'WINBACK_14D'

function resolveWinbackSentAtKey(key: WinbackKey) {
  switch (key) {
    case 'WINBACK_3D':
      return 'winback3dSentAt'
    case 'WINBACK_7D':
      return 'winback7dSentAt'
    case 'WINBACK_14D':
      return 'winback14dSentAt'
  }
}

function isPositiveWeeklySummary(summary: string | null | undefined) {
  const value = typeof summary === 'string' ? summary.trim().toLowerCase() : ''
  if (!value) return false

  return [
    'рух',
    'просун',
    'зробил',
    'викон',
    'заверш',
    'успіх',
    'стабіль',
    'ясн',
    'добре',
    'план',
    'продовж',
  ].some(token => value.includes(token))
}

export async function scheduleWinbackNotification(
  daysSinceExpired: 3 | 7 | 14,
  comebackKey: WinbackKey,
  deps?: {
    db?: typeof prisma
    notifier?: SchedulerNotifier
    now?: Date
    skipAvailabilityCheck?: boolean
  },
): Promise<void> {
  if (!(deps?.skipAvailabilityCheck ?? false) && !(await ensureNotificationPreferenceTableAvailability())) return

  const database = deps?.db ?? prisma
  const notifier = deps?.notifier ?? notificationService
  const now = deps?.now ?? new Date()
  const threshold = new Date(now.getTime() - daysSinceExpired * 24 * 60 * 60 * 1000)
  const graceWindow = new Date(now.getTime() - (daysSinceExpired + 1) * 24 * 60 * 60 * 1000)
  const subscriptions = await database.productSubscription.findMany({
    where: {
      status: 'expired',
      expiresAt: {
        lte: threshold,
        gt: graceWindow,
      },
      product: {
        code: { in: ['focus', 'absystem_ai', 'absystem'] },
      },
    },
    select: {
      id: true,
      userId: true,
      amount: true,
      expiresAt: true,
      product: {
        select: {
          code: true,
        },
      },
      user: {
        select: {
          currentState: true,
          currentStep: true,
          funnelStage: true,
          settings: true,
          notificationPreference: {
            select: {
              telegramEnabled: true,
              subscriptionEnabled: true,
              aiRemindersEnabled: true,
            },
          },
        },
      },
    },
  })

  const candidateUserIds = subscriptions
    .filter((subscription) => {
      const preferences = subscription.user.notificationPreference
      if (!preferences?.telegramEnabled || !preferences.subscriptionEnabled) return false
      if (resolveUserLifecycle(subscription.user).value !== 'expired') return false

      const expiresAt = subscription.expiresAt ?? null
      if (!expiresAt) return false

      const expiredDays = Math.floor((now.getTime() - expiresAt.getTime()) / (24 * 60 * 60 * 1000))
      if (expiredDays !== daysSinceExpired) return false

      const settings = getSettingsObject(subscription.user.settings)
      return !readTimestamp(settings[resolveWinbackSentAtKey(comebackKey)])
    })
    .map((subscription) => subscription.userId)

  const [dailyCycleCountByUserId, decisionCountByUserId] = candidateUserIds.length > 0
    ? await Promise.all([
        database.dailyCycleLog.findMany({
          where: {
            userId: { in: candidateUserIds },
          },
          select: {
            userId: true,
          },
        }).then(buildCountByUserId),
        database.dailyCycleLog.findMany({
          where: {
            userId: { in: candidateUserIds },
            choice: 'CHOSE_NEW',
          },
          select: {
            userId: true,
          },
        }).then(buildCountByUserId),
      ])
    : [new Map<string, number>(), new Map<string, number>()]

  for (const subscription of subscriptions) {
    const preferences = subscription.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.subscriptionEnabled) continue
    if (resolveUserLifecycle(subscription.user).value !== 'expired') continue

    const expiresAt = subscription.expiresAt ?? null
    if (!expiresAt) continue

    const expiredDays = Math.floor((now.getTime() - expiresAt.getTime()) / (24 * 60 * 60 * 1000))
    if (expiredDays !== daysSinceExpired) continue

    const settings = getSettingsObject(subscription.user.settings)
    const sentAtKey = resolveWinbackSentAtKey(comebackKey)
    if (readTimestamp(settings[sentAtKey])) continue

    const amount = Number(subscription.amount ?? 0)
    const target = resolveEcosystemPaymentTarget(amount)
    if (!target) continue

    const paymentUrl = await buildEcosystemPaymentCheckoutUrl(target.productId, target.planId, subscription.userId)
    const dailyCycles = dailyCycleCountByUserId.get(subscription.userId) ?? 0
    const decisions = decisionCountByUserId.get(subscription.userId) ?? 0

    await notifier.schedule(NotificationEvent.ABSYSTEM_COMEBACK, subscription.userId, new Date(), {
      comeback_key: comebackKey,
      renewal_url: paymentUrl,
      days_since_expired: daysSinceExpired,
      dailyCycles,
      decisions,
      template_key: `absystem_comeback_${comebackKey}_${getUtcDateKey(expiresAt)}`,
    }).catch(error => {
      console.error('[scheduler] failed to schedule winback notification', {
        userId: subscription.userId,
        comebackKey,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    })

    await database.user.update({
      where: { id: subscription.userId },
      data: {
        settings: {
          ...settings,
          [sentAtKey]: now.toISOString(),
        } as Prisma.InputJsonValue,
      },
    }).catch(() => undefined)
  }
}

export async function referralCheckCron(deps?: {
  db?: typeof prisma
  notifier?: SchedulerNotifier
  now?: Date
  skipAvailabilityCheck?: boolean
}): Promise<void> {
  if (!(deps?.skipAvailabilityCheck ?? false) && !(await ensureNotificationPreferenceTableAvailability())) return

  const database = deps?.db ?? prisma
  const notifier = deps?.notifier ?? notificationService
  const now = deps?.now ?? new Date()
  const threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const frontendUrl = resolvePublicFrontendBaseUrl()

  const subscriptions = await database.productSubscription.findMany({
    where: {
      status: 'active',
      createdAt: { lte: threshold },
      product: {
        code: { in: ['absystem_ai', 'absystem'] },
      },
    },
    select: {
      userId: true,
      createdAt: true,
      user: {
        select: {
          currentState: true,
          currentStep: true,
          funnelStage: true,
          settings: true,
          notificationPreference: {
            select: {
              telegramEnabled: true,
              aiRemindersEnabled: true,
            },
          },
        },
      },
    },
  })

  const candidateUserIds = subscriptions
    .filter((subscription) => {
      const preferences = subscription.user.notificationPreference
      if (!preferences?.telegramEnabled || !preferences.aiRemindersEnabled) return false
      if (resolveUserLifecycle(subscription.user).value !== 'platform_active') return false

      const settings = getSettingsObject(subscription.user.settings)
      return !readTimestamp(settings.referralSentAt)
    })
    .map((subscription) => subscription.userId)

  const weeklySummariesByUserId = candidateUserIds.length > 0
    ? await database.weeklyReport.findMany({
        where: {
          userId: { in: candidateUserIds },
          createdAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
          summaryText: { not: null },
        },
        orderBy: [
          { userId: 'asc' },
          { createdAt: 'desc' },
        ],
        select: {
          userId: true,
          summaryText: true,
        },
      }).then((rows) => buildLimitedWeeklySummariesByUserId(rows, 3))
    : new Map<string, string[]>()

  for (const subscription of subscriptions) {
    const preferences = subscription.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.aiRemindersEnabled) continue
    if (resolveUserLifecycle(subscription.user).value !== 'platform_active') continue

    const settings = getSettingsObject(subscription.user.settings)
    if (readTimestamp(settings.referralSentAt)) continue

    const weeklySummaries = weeklySummariesByUserId.get(subscription.userId) ?? []
    if (weeklySummaries.length < 3 || !weeklySummaries.every((summary) => isPositiveWeeklySummary(summary))) {
      continue
    }

    const referralUrl = `${frontendUrl}/ab-test?ref=${encodeURIComponent(subscription.userId)}`
    const sent = await notifier.schedule(NotificationEvent.ABSYSTEM_COMEBACK, subscription.userId, new Date(), {
      comeback_key: 'REFERRAL',
      referral_url: referralUrl,
      template_key: `absystem_comeback_REFERRAL_${getUtcDateKey(subscription.createdAt)}`,
    }).catch(error => {
      console.error('[scheduler] failed to schedule referral notification', {
        userId: subscription.userId,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
      return null
    })

    if (!sent) continue

    await database.user.update({
      where: { id: subscription.userId },
      data: {
        settings: {
          ...settings,
          referralSentAt: now.toISOString(),
        },
      },
    }).catch(() => undefined)
  }
}
