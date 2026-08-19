import { NotificationChannel,NotificationStatus,NotificationType,ZoomStatus,type UserLifecycleState } from '@starway/db/prisma-client'
import type { Telegraf } from 'telegraf'
import { prisma } from '../../db/client.js'
import { sendTelegramMessage } from '../../lib/telegram/messageFormatter.js'
import { AB_TEST_LIFECYCLE_REMINDERS,type LifecycleReminderKey } from '../../products/ab-system/content/abTest.followups.js'
import {
  endOfDay,
  startOfDay,
  addDays,
} from './common.js'

type ReminderDispatch = {
  lifecycleState: UserLifecycleState
  reminderKey: LifecycleReminderKey
  minHoursSinceUpdate: number
  ctaAction: string
  triggerField: 'updatedAt' | 'testStartedAt' | 'testCompletedAt' | 'offerShownAt'
}

async function wasReminderSentRecently(userId: string, reminderKey: LifecycleReminderKey): Promise<boolean> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const hit = await prisma.notification.findFirst({
    where: {
      userId,
      type: NotificationType.AI_REMINDER,
      templateKey: reminderKey,
      status: NotificationStatus.SENT,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  })
  return Boolean(hit)
}

async function dispatchLifecycleReminder(
  telegramBot: Telegraf,
  config: ReminderDispatch,
): Promise<void> {
  const now = new Date()
  const thresholdDate = new Date(now.getTime() - config.minHoursSinceUpdate * 60 * 60 * 1000)
  const users = await prisma.user.findMany({
    where: {
      lifecycleState: config.lifecycleState,
      telegramChatId: { not: null },
      [config.triggerField]: { lte: thresholdDate },
    },
    select: {
      id: true,
      telegramChatId: true,
      expertId: true,
    },
    take: 500,
  })

  for (const user of users) {
    if (!user.telegramChatId) continue
    const sentRecently = await wasReminderSentRecently(user.id, config.reminderKey)
    if (sentRecently) continue

    const copy = AB_TEST_LIFECYCLE_REMINDERS[config.reminderKey]
    try {
      await sendTelegramMessage(
        telegramBot,
        user.telegramChatId,
        `${copy.title}\n\n${copy.body}`,
        {
          replyMarkup: {
            inline_keyboard: [[{ text: copy.cta ?? 'Відкрити', callback_data: config.ctaAction }]],
          },
        },
      )
      await prisma.notification.create({
        data: {
          expertId: user.expertId,
          userId: user.id,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.AI_REMINDER,
          templateKey: config.reminderKey,
          title: copy.title,
          body: copy.body,
          status: NotificationStatus.SENT,
          sentAt: now,
        },
      })
    } catch (error) {
      await prisma.notification.create({
        data: {
          expertId: user.expertId,
          userId: user.id,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.AI_REMINDER,
          templateKey: config.reminderKey,
          title: copy.title,
          body: copy.body,
          status: NotificationStatus.FAILED,
          failureReason: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }
}

export async function scheduleTestReminders(telegramBot: Telegraf): Promise<void> {
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'TEST_NOT_STARTED',
    reminderKey: 'R1_TEST_24H',
    minHoursSinceUpdate: 24,
    ctaAction: 'ab_test:start',
    triggerField: 'testStartedAt',
  })
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'TEST_NOT_STARTED',
    reminderKey: 'R2_TEST_72H',
    minHoursSinceUpdate: 72,
    ctaAction: 'ab_test:start',
    triggerField: 'testStartedAt',
  })
}

export async function scheduleProgressReminders(telegramBot: Telegraf): Promise<void> {
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'TEST_IN_PROGRESS',
    reminderKey: 'R3_PROGRESS_4H',
    minHoursSinceUpdate: 10 / 60,
    ctaAction: 'ab_test:resume',
    triggerField: 'updatedAt',
  })
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'TEST_IN_PROGRESS',
    reminderKey: 'R4_PROGRESS_24H',
    minHoursSinceUpdate: 1,
    ctaAction: 'ab_test:resume',
    triggerField: 'updatedAt',
  })
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'TEST_IN_PROGRESS',
    reminderKey: 'R9_PROGRESS_1D',
    minHoursSinceUpdate: 24,
    ctaAction: 'ab_test:resume',
    triggerField: 'updatedAt',
  })
}

export async function scheduleResultReminders(telegramBot: Telegraf): Promise<void> {
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'TEST_DONE',
    reminderKey: 'R5_RESULT_2H',
    minHoursSinceUpdate: 2,
    ctaAction: 'ab_test:show_result',
    triggerField: 'testCompletedAt',
  })
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'TEST_DONE',
    reminderKey: 'R6_RESULT_48H',
    minHoursSinceUpdate: 48,
    ctaAction: 'open_focus_payment',
    triggerField: 'testCompletedAt',
  })
}

export async function scheduleOfferReminders(telegramBot: Telegraf): Promise<void> {
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'OFFER_SHOWN',
    reminderKey: 'R7_OFFER_6H',
    minHoursSinceUpdate: 6,
    ctaAction: 'open_focus_payment',
    triggerField: 'offerShownAt',
  })
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'OFFER_SHOWN',
    reminderKey: 'R8_OFFER_3D',
    minHoursSinceUpdate: 72,
    ctaAction: 'open_focus_payment',
    triggerField: 'offerShownAt',
  })
}

export async function scheduleZoomReminders(telegramBot: Telegraf, reminderKey: 'Z1_ZOOM_MON_1800' | 'Z2_ZOOM_MON_1855'): Promise<void> {
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'ZOOM_MEMBER',
    reminderKey,
    minHoursSinceUpdate: 0,
    ctaAction: 'focus:next_zoom',
    triggerField: 'updatedAt',
  })
}

export async function scheduleSubscriptionExpiryReminders(telegramBot: Telegraf): Promise<void> {
  const reminderWindows: Array<{ reminderKey: LifecycleReminderKey; daysFromNow: 7 | 3 | 1 }> = [
    { reminderKey: 'SUBSCRIPTION_EXPIRING_7D', daysFromNow: 7 },
    { reminderKey: 'SUBSCRIPTION_EXPIRING_3D', daysFromNow: 3 },
    { reminderKey: 'SUBSCRIPTION_EXPIRING_1D', daysFromNow: 1 },
  ]
  const today = startOfDay(new Date())

  for (const window of reminderWindows) {
    const windowStart = startOfDay(addDays(today, window.daysFromNow))
    const windowEnd = endOfDay(addDays(today, window.daysFromNow))
    const subscriptions = await prisma.productSubscription.findMany({
      where: {
        status: 'active',
        expiresAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            telegramChatId: true,
            expertId: true,
          },
        },
      },
      take: 500,
    })

    for (const subscription of subscriptions) {
      const user = subscription.user
      if (!user?.telegramChatId) continue

      const sentRecently = await wasReminderSentRecently(user.id, window.reminderKey)
      if (sentRecently) continue

      const copy = AB_TEST_LIFECYCLE_REMINDERS[window.reminderKey]
      try {
        await sendTelegramMessage(
          telegramBot,
          user.telegramChatId,
          `${copy.title}\n\n${copy.body}`,
          {
            replyMarkup: {
              inline_keyboard: [[{ text: copy.cta ?? 'Відкрити', callback_data: 'open_focus_payment' }]],
            },
          },
        )
        await prisma.notification.create({
          data: {
            expertId: user.expertId,
            userId: user.id,
            channel: NotificationChannel.TELEGRAM,
            type: NotificationType.AI_REMINDER,
            templateKey: window.reminderKey,
            title: copy.title,
            body: copy.body,
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          },
        })
      } catch (error) {
        await prisma.notification.create({
          data: {
            expertId: user.expertId,
            userId: user.id,
            channel: NotificationChannel.TELEGRAM,
            type: NotificationType.AI_REMINDER,
            templateKey: window.reminderKey,
            title: copy.title,
            body: copy.body,
            status: NotificationStatus.FAILED,
            failureReason: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }
  }
}
