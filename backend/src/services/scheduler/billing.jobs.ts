// backend/src/services/scheduler/billing.jobs.ts — billing expiry and inactivity comeback jobs.
// Інструкція: тут перевірки оплат, завершення підписок і comeback-повідомлення після паузи.

import { prisma } from '../../db/client.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { notificationService } from '../notifications/NotificationService.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { buildEcosystemPaymentCheckoutUrl, resolveEcosystemPaymentTarget } from '../../modules/subscriptions/payments/business.js'
import { resolveUserLifecycle } from '@/modules/users/runtime/resolveUserLifecycle.js'
import { sendOpsTelegramMessage } from '../../lib/telegram.js'
import { ensureNotificationPreferenceTableAvailability, getActivityGapDays, getUtcDateKey, readSettingsText, resolvePrimaryProductKey, type SchedulerNotifier } from './common.js'

export async function scheduleInactivityComeback(
  thresholdDays: number,
  comebackKey: keyof typeof absystemContent.COMEBACK_FLOWS,
): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return

  const now = new Date()
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      NOT: { email: { startsWith: 'telegram-guest-' } },
    },
    select: {
      id: true,
      currentState: true,
      currentStep: true,
      funnelStage: true,
      settings: true,
      updatedAt: true,
      productAccesses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { product: true },
      },
      dailyCycleLogs: {
        orderBy: { date: 'desc' },
        take: 1,
        select: {
          date: true,
          aiSummary: true,
        },
      },
      microTasks: {
        where: { status: 'postponed' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          title: true,
          updatedAt: true,
        },
      },
      notificationPreference: {
        select: {
          telegramEnabled: true,
          aiRemindersEnabled: true,
        },
      },
    },
  })

  for (const user of users) {
    if (resolveUserLifecycle(user).value !== 'platform_active') continue
    const preferences = user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.aiRemindersEnabled) continue
    if (resolvePrimaryProductKey(user.productAccesses) === 'STANKEY') continue

    const latestDailyCycle = user.dailyCycleLogs[0] ?? null
    if (!latestDailyCycle) continue

    const gapDays = getActivityGapDays(latestDailyCycle.date, now)
    if (gapDays !== thresholdDays) continue

    const templateKey = `absystem_comeback_${comebackKey}_${getUtcDateKey(latestDailyCycle.date)}`
    const existing = await prisma.notificationJob.findFirst({
      where: {
        payload: {
          path: ['template_key'],
          equals: templateKey,
        },
      },
      select: {
        id: true,
      },
    }).catch(() => null)

    if (existing) continue

    const lastAction = readSettingsText(user.settings, 'lastAction')
      ?? user.microTasks[0]?.title?.trim()
      ?? latestDailyCycle.aiSummary?.trim()
      ?? ''

    await notificationService.schedule(NotificationEvent.ABSYSTEM_COMEBACK, user.id, new Date(), {
      comeback_key: comebackKey,
      last_action: lastAction,
      template_key: templateKey,
      lifecycle_stage: 'platform_active',
    }).catch(error => {
      console.error('[scheduler] failed to schedule comeback flow', {
        userId: user.id,
        thresholdDays,
        comebackKey,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
      const details = error instanceof Error ? error.message : 'unknown_error'
      void sendOpsTelegramMessage(
        `⚠️ Scheduler comeback scheduling failed\nuserId: ${user.id}\nthresholdDays: ${thresholdDays}\nflow: ${comebackKey}\nerror: ${details}`,
      )
    })
  }
}

export async function scheduleBillingExpiryWarning(deps?: {
  db?: typeof prisma
  notifier?: SchedulerNotifier
  now?: Date
  skipAvailabilityCheck?: boolean
}): Promise<void> {
  if (!(deps?.skipAvailabilityCheck ?? false) && !(await ensureNotificationPreferenceTableAvailability())) return

  const database = deps?.db ?? prisma
  const notifier = deps?.notifier ?? notificationService
  const now = deps?.now ?? new Date()
  const limit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const subscriptions = await database.productSubscription.findMany({
    where: {
      status: 'active',
      expiresAt: {
        lte: limit,
        gte: now,
      },
      product: {
        code: { in: ['focus', 'absystem_ai', 'absystem'] },
      },
    },
    select: {
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

    const amount = Number(subscription.amount ?? 0)
    const target = resolveEcosystemPaymentTarget(amount)
    if (!target) continue

    const paymentUrl = await buildEcosystemPaymentCheckoutUrl(target.productId, target.planId, subscription.userId)
    await notifier.schedule(NotificationEvent.SUBSCRIPTION_EXPIRING, subscription.userId, new Date(), {
      expires_at: subscription.expiresAt?.toISOString() ?? null,
      payment_url: paymentUrl,
      renewal_url: paymentUrl,
      product_code: subscription.product.code,
      amount,
      daysLeft: Math.ceil((subscription.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      days_left: Math.ceil((subscription.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      lifecycle_stage: 'focus_active',
    }).catch(error => {
      console.error('[scheduler] failed to schedule subscription expiry warning', {
        userId: subscription.userId,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
      const details = error instanceof Error ? error.message : 'unknown_error'
      void sendOpsTelegramMessage(
        `⚠️ Scheduler subscription expiry warning failed\nuserId: ${subscription.userId}\nerror: ${details}`,
      )
    })
  }
}

export async function scheduleBillingExpiryCheck(deps?: {
  db?: typeof prisma
  notifier?: SchedulerNotifier
  now?: Date
  skipAvailabilityCheck?: boolean
}): Promise<void> {
  if (!(deps?.skipAvailabilityCheck ?? false) && !(await ensureNotificationPreferenceTableAvailability())) return

  const database = deps?.db ?? prisma
  const notifier = deps?.notifier ?? notificationService
  const now = deps?.now ?? new Date()

  const subscriptions = await database.productSubscription.findMany({
    where: {
      status: 'active',
      expiresAt: {
        lt: now,
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

    const amount = Number(subscription.amount ?? 0)
    const target = resolveEcosystemPaymentTarget(amount)
    if (!target) continue

    await database.productSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'expired',
      },
    })

    await database.user.update({
      where: { id: subscription.userId },
      data: {
        currentState: 'INACTIVE',
      },
    })

    const paymentUrl = await buildEcosystemPaymentCheckoutUrl(target.productId, target.planId, subscription.userId)
    await notifier.schedule(NotificationEvent.SUBSCRIPTION_EXPIRED, subscription.userId, new Date(), {
      expires_at: subscription.expiresAt?.toISOString() ?? null,
      payment_url: paymentUrl,
      renewal_url: paymentUrl,
      product_code: subscription.product.code,
      amount,
      daysSinceExpired: Math.ceil((now.getTime() - subscription.expiresAt!.getTime()) / (24 * 60 * 60 * 1000)),
      lifecycle_stage: resolveUserLifecycle(subscription.user).value ?? 'expired',
    }).catch(error => {
      console.error('[scheduler] failed to schedule subscription expired notification', {
        userId: subscription.userId,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
      const details = error instanceof Error ? error.message : 'unknown_error'
      void sendOpsTelegramMessage(
        `⚠️ Scheduler subscription expired notification failed\nuserId: ${subscription.userId}\nerror: ${details}`,
      )
    })
  }
}
