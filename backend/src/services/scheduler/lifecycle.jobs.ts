// backend/src/services/scheduler/lifecycle.jobs.ts — lifecycle, winback, referral jobs.
// Інструкція: тут lifecycle-переходи, readiness checks, winback та referral cron-задачі.

import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { notificationService } from '../notifications/NotificationService.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { buildEcosystemPaymentCheckoutUrl, resolveEcosystemPaymentTarget } from '../../modules/subscriptions/payments/business.js'
import { ensureNotificationPreferenceTableAvailability, getSettingsObject, getUtcDateKey, readTimestamp, resolvePublicFrontendBaseUrl, sendUpgradeOfferTelegramMessage, type SchedulerNotifier } from './common.js'

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
          lifecycleState: true,
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

  for (const subscription of subscriptions) {
    const preferences = subscription.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.subscriptionEnabled) continue
    if (subscription.user.lifecycleState !== 'platform_active') continue

    const settings = getSettingsObject(subscription.user.settings)
    if (readTimestamp(settings.mentorReadinessSentAt)) continue

    const zoomCount = await prisma.zoomSessionAttendee.count({
      where: {
        userId: subscription.userId,
        attended: true,
      },
    })
    if (zoomCount < 2) continue

    const weeklyReports = await prisma.weeklyReport.findMany({
      where: {
        userId: subscription.userId,
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        summaryText: { not: null },
      },
      select: {
        summaryText: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })

    const engagementSignals = weeklyReports.filter((report) => typeof report.summaryText === 'string' && report.summaryText.trim().length > 0).length
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
          lifecycleState: true,
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

  for (const subscription of subscriptions) {
    const preferences = subscription.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.subscriptionEnabled) continue
    if (subscription.user.lifecycleState !== 'platform_active') continue

    const settings = getSettingsObject(subscription.user.settings)
    const sentAt = readTimestamp(settings.personalProgramSentAt)
    if (sentAt && now.getTime() - sentAt.getTime() < 60 * 24 * 60 * 60 * 1000) continue

    const zoomCount = await prisma.zoomSessionAttendee.count({
      where: {
        userId: subscription.userId,
        attended: true,
      },
    })
    if (zoomCount < 2) continue

    const weeklyReports = await prisma.weeklyReport.findMany({
      where: {
        userId: subscription.userId,
        createdAt: { gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
        summaryText: { not: null },
      },
      select: {
        summaryText: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })

    const engagementScore = weeklyReports.filter((report) => typeof report.summaryText === 'string' && report.summaryText.trim().length > 0).length + Math.min(zoomCount, 4)
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
          lifecycleState: true,
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

  for (const subscription of subscriptions) {
    const preferences = subscription.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.subscriptionEnabled) continue
    if (subscription.user.lifecycleState !== 'expired') continue

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

    const paymentUrl = buildEcosystemPaymentCheckoutUrl(target.productId, target.planId, subscription.userId)
    const dailyCycles = await database.dailyCycleLog.count({
      where: { userId: subscription.userId },
    }).catch(() => 0)
    const decisions = await database.dailyCycleLog.count({
      where: {
        userId: subscription.userId,
        choice: 'CHOSE_NEW',
      },
    }).catch(() => 0)

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
          lifecycleState: true,
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

  for (const subscription of subscriptions) {
    const preferences = subscription.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.aiRemindersEnabled) continue
    if (subscription.user.lifecycleState !== 'platform_active') continue

    const settings = getSettingsObject(subscription.user.settings)
    if (readTimestamp(settings.referralSentAt)) continue

    const weeklyReports = await database.weeklyReport.findMany({
      where: {
        userId: subscription.userId,
        createdAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
        summaryText: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        summaryText: true,
      },
    })

    if (weeklyReports.length < 3 || !weeklyReports.every(report => isPositiveWeeklySummary(report.summaryText))) {
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
