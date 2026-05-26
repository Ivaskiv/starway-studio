// backend/src/services/scheduler/ai-seller.jobs.ts — AI seller followup/retention jobs.
// Інструкція: тут follow-up, focus, retention і reactivation задачі AI seller funnel.

import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { aiSellerContent } from '@/products/ab-system/config/aiSeller.content.js'
import { resolveUserLifecycle } from '@/modules/users/runtime/resolveUserLifecycle.js'
import { daysBetween, ensureNotificationPreferenceTableAvailability, getEndOfUtcDay, getSettingsObject, getStartOfUtcDay, readTimestamp, sendAiSellerTelegramMessage } from './common.js'

export async function aiSellerLeadFollowup3dCron(deps?: {
  db?: typeof prisma
  now?: Date
  skipAvailabilityCheck?: boolean
  sender?: (
    userId: string,
    text: string,
    buttons?: Array<Array<{ text: string; callback_data: string }>>,
  ) => Promise<boolean>
}): Promise<void> {
  if (!(deps?.skipAvailabilityCheck ?? false) && !(await ensureNotificationPreferenceTableAvailability())) return
  const database = deps?.db ?? prisma
  const now = deps?.now ?? new Date()
  const sender = deps?.sender ?? sendAiSellerTelegramMessage
  const users = await database.user.findMany({
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
      notificationPreference: {
        select: { telegramEnabled: true, aiRemindersEnabled: true },
      },
      subscriptions: {
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        select: { id: true },
        take: 1,
      },
    },
  })

  for (const user of users) {
    const lifecycle = resolveUserLifecycle(user).value
    if (lifecycle !== 'result_opened') continue
    if (!user.notificationPreference?.telegramEnabled || !user.notificationPreference.aiRemindersEnabled) continue
    if (user.subscriptions.length > 0) continue
    const settings = getSettingsObject(user.settings)
    if (readTimestamp(settings.leadFollowup3dSentAt)) continue
    const pauseUntil = readTimestamp(settings.aiSellerPauseUntil)
    if (pauseUntil && pauseUntil.getTime() > now.getTime()) continue
    if (daysBetween(user.updatedAt, now) < 3) continue
    const sent = await sender(user.id, aiSellerContent.LEAD.followup_3d)
    if (!sent) continue
    await database.user.update({
      where: { id: user.id },
      data: { settings: { ...settings, leadFollowup3dSentAt: now.toISOString() } },
    }).catch(() => undefined)
  }
}

export async function aiSellerLeadFollowup7dCron(): Promise<void> {
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
      notificationPreference: {
        select: { telegramEnabled: true, aiRemindersEnabled: true },
      },
      subscriptions: {
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        select: { id: true },
        take: 1,
      },
    },
  })

  for (const user of users) {
    const lifecycle = resolveUserLifecycle(user).value
    if (lifecycle !== 'result_opened') continue
    if (!user.notificationPreference?.telegramEnabled || !user.notificationPreference.aiRemindersEnabled) continue
    if (user.subscriptions.length > 0) continue
    const settings = getSettingsObject(user.settings)
    if (!readTimestamp(settings.leadFollowup3dSentAt)) continue
    if (readTimestamp(settings.leadFollowup7dSentAt)) continue
    const pauseUntil = readTimestamp(settings.aiSellerPauseUntil)
    if (pauseUntil && pauseUntil.getTime() > now.getTime()) continue
    if (daysBetween(user.updatedAt, now) < 7) continue
    const nextGroupDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const sent = await sendAiSellerTelegramMessage(user.id, aiSellerContent.LEAD.followup_7d(nextGroupDate))
    if (!sent) continue
    await prisma.user.update({
      where: { id: user.id },
      data: { settings: { ...settings, leadFollowup7dSentAt: now.toISOString() } },
    }).catch(() => undefined)
  }
}

export async function aiSellerFocusCheck24hCron(): Promise<void> {
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
      notificationPreference: {
        select: { telegramEnabled: true, aiRemindersEnabled: true },
      },
    },
  })

  for (const user of users) {
    const lifecycle = resolveUserLifecycle(user).value
    if (lifecycle !== 'focus_active') continue
    if (!user.notificationPreference?.telegramEnabled || !user.notificationPreference.aiRemindersEnabled) continue
    const settings = getSettingsObject(user.settings)
    if (readTimestamp(settings.focusCheck24hSentAt)) continue

    const firstAttended = await prisma.zoomSessionAttendee.findFirst({
      where: { userId: user.id, attended: true },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })
    if (!firstAttended?.createdAt) continue
    const diffHours = (now.getTime() - firstAttended.createdAt.getTime()) / (60 * 60 * 1000)
    if (diffHours < 24 || diffHours > 36) continue
    const zoomCount = await prisma.zoomSessionAttendee.count({ where: { userId: user.id, attended: true } })
    if (zoomCount < 1) continue
    const sent = await sendAiSellerTelegramMessage(user.id, aiSellerContent.FOCUS.check_24h)
    if (!sent) continue
    await prisma.user.update({
      where: { id: user.id },
        data: { settings: { ...settings, focusCheck24hSentAt: now.toISOString() } as Prisma.InputJsonValue },
      }).catch(() => undefined)
  }
}

export async function aiSellerFocusDojimBeforeZoom2Cron(): Promise<void> {
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
      notificationPreference: {
        select: { telegramEnabled: true, aiRemindersEnabled: true },
      },
    },
  })

  for (const user of users) {
    const lifecycle = resolveUserLifecycle(user).value
    if (lifecycle !== 'focus_active') continue
    if (!user.notificationPreference?.telegramEnabled || !user.notificationPreference.aiRemindersEnabled) continue
    const settings = getSettingsObject(user.settings)
    if (readTimestamp(settings.focusDojimBeforeZoom2SentAt)) continue
    const zoomCount = await prisma.zoomSessionAttendee.count({ where: { userId: user.id, attended: true } })
    if (zoomCount !== 1) continue
    const latestLifecycle = await prisma.user.findUnique({
      where: { id: user.id },
      select: { currentState: true, currentStep: true, funnelStage: true },
    })
    if (latestLifecycle && resolveUserLifecycle(latestLifecycle).value === 'platform_active') continue
    const nextZoom = await prisma.zoomSession.findFirst({
      where: { scheduledAt: { gt: now } },
      orderBy: { scheduledAt: 'asc' },
      select: { scheduledAt: true },
    })
    if (!nextZoom?.scheduledAt) continue
    const diffHours = (nextZoom.scheduledAt.getTime() - now.getTime()) / (60 * 60 * 1000)
    if (diffHours < 20 || diffHours > 28) continue
    const sent = await sendAiSellerTelegramMessage(user.id, aiSellerContent.FOCUS.dojim_before_zoom2)
    if (!sent) continue
    await prisma.user.update({
      where: { id: user.id },
        data: { settings: { ...settings, focusDojimBeforeZoom2SentAt: now.toISOString() } as Prisma.InputJsonValue },
      }).catch(() => undefined)
  }
}

export async function aiSellerRetentionCron(daysLeft: 7 | 3 | 1, deps?: {
  db?: typeof prisma
  now?: Date
  skipAvailabilityCheck?: boolean
  sender?: (
    userId: string,
    text: string,
    buttons?: Array<Array<{ text: string; callback_data: string }>>,
  ) => Promise<boolean>
}): Promise<void> {
  if (!(deps?.skipAvailabilityCheck ?? false) && !(await ensureNotificationPreferenceTableAvailability())) return
  const database = deps?.db ?? prisma
  const now = deps?.now ?? new Date()
  const sender = deps?.sender ?? sendAiSellerTelegramMessage
  const dayStart = getStartOfUtcDay(new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000))
  const dayEnd = getEndOfUtcDay(new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000))
  const subscriptions = await database.productSubscription.findMany({
    where: {
      status: 'active',
      expiresAt: { gte: dayStart, lte: dayEnd },
      product: { code: { in: ['absystem_ai', 'absystem'] } },
    },
    select: {
      userId: true,
      user: {
        select: {
          settings: true,
          notificationPreference: { select: { telegramEnabled: true, subscriptionEnabled: true } },
        },
      },
    },
  })

  for (const subscription of subscriptions) {
    if (!subscription.user.notificationPreference?.telegramEnabled || !subscription.user.notificationPreference.subscriptionEnabled) continue
    const settings = getSettingsObject(subscription.user.settings)
    const sentKey = daysLeft === 7 ? 'retention7dSentAt' : daysLeft === 3 ? 'retention3dSentAt' : 'retention1dSentAt'
    if (readTimestamp(settings[sentKey])) continue
    if (daysLeft === 3 && !readTimestamp(settings.retention7dSentAt)) continue
    const text = daysLeft === 7
      ? aiSellerContent.RETENTION.reminder_7d({ goals: 0, decisions: 0 })
      : daysLeft === 3
        ? aiSellerContent.RETENTION.reminder_3d
        : aiSellerContent.RETENTION.reminder_1d
    const sent = await sender(subscription.userId, text, [
      [{ text: aiSellerContent.RETENTION.cta_1m, callback_data: aiSellerContent.RETENTION.callback_1m }],
      [{ text: aiSellerContent.RETENTION.cta_6m, callback_data: aiSellerContent.RETENTION.callback_6m }],
      [{ text: aiSellerContent.RETENTION.cta_12m, callback_data: aiSellerContent.RETENTION.callback_12m }],
    ])
    if (!sent) continue
    await database.user.update({
      where: { id: subscription.userId },
      data: { settings: { ...settings, [sentKey]: now.toISOString() } as Prisma.InputJsonValue },
    }).catch(() => undefined)
  }
}

export async function aiSellerReactivationCron(daysSince: 7 | 30): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()
  const thresholdStart = getStartOfUtcDay(new Date(now.getTime() - daysSince * 24 * 60 * 60 * 1000))
  const thresholdEnd = getEndOfUtcDay(new Date(now.getTime() - daysSince * 24 * 60 * 60 * 1000))
  const subscriptions = await prisma.productSubscription.findMany({
    where: {
      status: 'expired',
      expiresAt: { gte: thresholdStart, lte: thresholdEnd },
      product: { code: { in: ['absystem_ai', 'absystem'] } },
    },
    select: {
      userId: true,
      user: {
        select: {
          currentState: true,
          currentStep: true,
          funnelStage: true,
          settings: true,
          notificationPreference: { select: { telegramEnabled: true, aiRemindersEnabled: true } },
        },
      },
    },
  })

  for (const subscription of subscriptions) {
    if (resolveUserLifecycle(subscription.user).value !== 'expired') continue
    if (!subscription.user.notificationPreference?.telegramEnabled || !subscription.user.notificationPreference.aiRemindersEnabled) continue
    const settings = getSettingsObject(subscription.user.settings)
    const sentKey = daysSince === 7 ? 'reactivation7dSentAt' : 'reactivation30dSentAt'
    if (readTimestamp(settings[sentKey])) continue
    const text = daysSince === 7 ? aiSellerContent.RETENTION.reactivation_7d : aiSellerContent.RETENTION.reactivation_30d
    const sent = await sendAiSellerTelegramMessage(subscription.userId, text)
    if (!sent) continue
    await prisma.user.update({
      where: { id: subscription.userId },
      data: { settings: { ...settings, [sentKey]: now.toISOString() } as Prisma.InputJsonValue },
    }).catch(() => undefined)
  }
}
