import cron, { type ScheduledTask } from 'node-cron'
import { NotificationChannel, NotificationStatus, NotificationType, type UserLifecycleState } from '@starway/db/prisma-client'
import type { Telegraf } from 'telegraf'

import { refreshMarketResearch } from '../../modules/admin/content-research.service.js'
import { resetMonthlySwapUsage } from '../../modules/zoom/service.js'
import { PLATFORM_CRON_REGISTRY, getProductCronProfile } from '../../platform/index.js'
import { withRuntimeAdvisoryLock } from '../../core/runtime/runtimeIdempotency.js'
import { bot, sendOpsTelegramMessage } from '../../lib/telegram.js'
import { prisma } from '../../db/client.js'
import { AB_TEST_LIFECYCLE_REMINDERS, type LifecycleReminderKey } from '../../products/ab-system/content/abTest.followups.js'
import { startNotificationWorker, stopNotificationWorker } from '../notifications/worker.js'
import { startRuntimeOutboxWorker, stopRuntimeOutboxWorker } from '../runtimeOutbox/worker.js'
import { aiSellerFocusCheck24hCron, aiSellerFocusDojimBeforeZoom2Cron, aiSellerLeadFollowup3dCron, aiSellerLeadFollowup7dCron, aiSellerReactivationCron, aiSellerRetentionCron } from './ai-seller.jobs.js'
import { scheduleBillingExpiryCheck, scheduleBillingExpiryWarning, scheduleInactivityComeback } from './billing.jobs.js'
import { aiInactiveCron, dailyEveningCron, dailyMorningCron, streakBrokenCron, streakRiskCron, weeklyContentReminderCron, weeklySummaryCron } from './daily.jobs.js'
import { cloudinaryZoomAudioIngestCron } from '../../modules/zoom/cloudinary-audio-ingest.service.js'
import { mentorReadinessCheckCron, personalProgramCheckCron, referralCheckCron, scheduleWinbackNotification } from './lifecycle.jobs.js'
import { expireMicroTasksCron, markMissedDaysCron, microTaskReminderCron, nudgeCron, subscriptionExpiredCron, subscriptionExpiringCron, webMapBehindGoalsCron, webMapMonthEndAnalysisCron, webMapMonthStartReminderCron } from './operations.jobs.js'

export { aiSellerFocusCheck24hCron, aiSellerFocusDojimBeforeZoom2Cron, aiSellerLeadFollowup3dCron, aiSellerLeadFollowup7dCron, aiSellerReactivationCron, aiSellerRetentionCron } from './ai-seller.jobs.js'
export { scheduleBillingExpiryCheck, scheduleBillingExpiryWarning, scheduleInactivityComeback } from './billing.jobs.js'
export { aiInactiveCron, dailyEveningCron, dailyMorningCron, streakBrokenCron, streakRiskCron, weeklyContentReminderCron, weeklySummaryCron } from './daily.jobs.js'
export { mentorReadinessCheckCron, personalProgramCheckCron, referralCheckCron, scheduleWinbackNotification } from './lifecycle.jobs.js'
export { expireMicroTasksCron, markMissedDaysCron, microTaskReminderCron, nudgeCron, subscriptionExpiredCron, subscriptionExpiringCron, webMapBehindGoalsCron, webMapMonthEndAnalysisCron, webMapMonthStartReminderCron } from './operations.jobs.js'

const scheduledTasks: ScheduledTask[] = []
const registeredCronKeys = new Set<string>()
let schedulerStarted = false
let schedulerStopping = false
const SCHEDULERS_DISABLED = process.env.DISABLE_SCHEDULERS === 'true'

function register(task: ScheduledTask) {
  scheduledTasks.push(task)
  return task
}

function safeSchedule(key: string, expression: string, task: () => void, timezone: string) {
  if (registeredCronKeys.has(key)) {
    console.warn('[scheduler] duplicate registration prevented:', key)
    void sendOpsTelegramMessage(
      `⚠️ Scheduler duplicate registration prevented\nkey: ${key}`,
    )
    return
  }
  registeredCronKeys.add(key)
  register(cron.schedule(expression, task, { timezone }))
}

function runScheduled(key: string, task: () => Promise<void>) {
  if (schedulerStopping || !schedulerStarted) return
  setImmediate(() => {
    if (schedulerStopping || !schedulerStarted) return
    void withRuntimeAdvisoryLock({ scope: 'cron', type: key, source: 'internal', runtimeStage: 'scheduler' }, async () => {
      await task()
    }).then(() => undefined).catch(error => {
      console.error('[scheduler] cron task failed', { key, error })
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'unknown_error'
      void sendOpsTelegramMessage(
        `🚨 Scheduler cron task failed\nkey: ${key}\nerror: ${message}`,
      )
    })
  })
}

type ReminderDispatch = {
  lifecycleState: UserLifecycleState
  reminderKey: LifecycleReminderKey
  minHoursSinceUpdate: number
  ctaAction: string
  triggerField: 'updatedAt' | 'testStartedAt' | 'testCompletedAt' | 'offerShownAt'
}

async function wasReminderSentRecently(userId: string, reminderKey: LifecycleReminderKey, thresholdHours: number): Promise<boolean> {
  const since = new Date(Date.now() - thresholdHours * 60 * 60 * 1000)
  const hit = await prisma.notification.findFirst({
    where: {
      userId,
      type: NotificationType.AI_REMINDER,
      templateKey: reminderKey,
      status: NotificationStatus.SENT,
      sentAt: { gte: since },
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
    const sentRecently = await wasReminderSentRecently(user.id, config.reminderKey, config.minHoursSinceUpdate)
    if (sentRecently) continue

    const copy = AB_TEST_LIFECYCLE_REMINDERS[config.reminderKey]
    try {
      await telegramBot.telegram.sendMessage(user.telegramChatId, `${copy.title}\n\n${copy.body}`, {
        reply_markup: {
          inline_keyboard: [[{ text: copy.cta ?? 'Відкрити', callback_data: config.ctaAction }]],
        },
      })
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
    minHoursSinceUpdate: 4,
    ctaAction: 'ab_test:resume',
    triggerField: 'testStartedAt',
  })
  await dispatchLifecycleReminder(telegramBot, {
    lifecycleState: 'TEST_IN_PROGRESS',
    reminderKey: 'R4_PROGRESS_24H',
    minHoursSinceUpdate: 24,
    ctaAction: 'ab_test:resume',
    triggerField: 'testStartedAt',
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

export function startScheduler(options?: { startNotificationWorker?: boolean; coachBot?: Telegraf | null }) {
  if (SCHEDULERS_DISABLED) {
    console.log('⏸️ [runtime] scheduler disabled (DISABLE_SCHEDULERS=true)')
    return
  }
  if (schedulerStarted) {
    console.log('🔁 [runtime] scheduler already started, skip duplicate registration')
    return
  }
  schedulerStarted = true
  schedulerStopping = false
  const timezone = 'Europe/Kyiv'
  if (options?.startNotificationWorker !== false) startNotificationWorker()
  startRuntimeOutboxWorker()
  console.log(`⏰ [runtime] scheduler enabled (timezone=${timezone})`, {
    cronJobs: PLATFORM_CRON_REGISTRY.length,
    absystemCron: getProductCronProfile('absystem').jobs.length,
    stankeyCron: getProductCronProfile('stankey').jobs.length,
    focusCron: getProductCronProfile('focus').jobs.length,
    coachBotAttached: Boolean(options?.coachBot),
  })
  safeSchedule('dailyMorningCron', '* * * * *', () => { runScheduled('dailyMorningCron', dailyMorningCron) }, timezone)
  safeSchedule('dailyEveningCron', '* * * * *', () => { runScheduled('dailyEveningCron', dailyEveningCron) }, timezone)
  safeSchedule('streakRiskCron', '0 * * * *', () => { runScheduled('streakRiskCron', streakRiskCron) }, timezone)
  safeSchedule('weeklyContentReminderCron', '0 9 * * 2', () => { runScheduled('weeklyContentReminderCron', weeklyContentReminderCron) }, timezone)
  safeSchedule('weeklySummaryCron', '0 19 * * 0', () => { runScheduled('weeklySummaryCron', weeklySummaryCron) }, timezone)
  safeSchedule('cloudinaryZoomAudioIngestCron', '0 3 * * 2', () => { runScheduled('cloudinaryZoomAudioIngestCron', cloudinaryZoomAudioIngestCron) }, timezone)
  safeSchedule('aiInactiveCron', '0 * * * *', () => { runScheduled('aiInactiveCron', aiInactiveCron) }, timezone)
  safeSchedule('billingExpiryWarningCron', '0 10 * * *', () => { runScheduled('billingExpiryWarningCron', scheduleBillingExpiryWarning) }, timezone)
  safeSchedule('billingExpiryCheckCron', '0 9 * * *', () => { runScheduled('billingExpiryCheckCron', scheduleBillingExpiryCheck) }, timezone)
  safeSchedule('inactivity3dComebackCron', '10 * * * *', () => { runScheduled('inactivity3dComebackCron', async () => { await scheduleInactivityComeback(3, 'GAP_1_3') }) }, timezone)
  safeSchedule('inactivity7dComebackCron', '12 * * * *', () => { runScheduled('inactivity7dComebackCron', async () => { await scheduleInactivityComeback(7, 'GAP_4_7') }) }, timezone)
  safeSchedule('inactivity14dComebackCron', '14 * * * *', () => { runScheduled('inactivity14dComebackCron', async () => { await scheduleInactivityComeback(14, 'GAP_7_14') }) }, timezone)
  safeSchedule('inactivity30dComebackCron', '16 * * * *', () => { runScheduled('inactivity30dComebackCron', async () => { await scheduleInactivityComeback(30, 'GAP_30_PLUS') }) }, timezone)
  safeSchedule('streakBrokenCron', '0 8 * * *', () => { runScheduled('streakBrokenCron', streakBrokenCron) }, timezone)
  safeSchedule('markMissedDaysCron', '5 0 * * *', () => { runScheduled('markMissedDaysCron', markMissedDaysCron) }, timezone)
  safeSchedule('subscriptionExpiringCron', '0 * * * *', () => { runScheduled('subscriptionExpiringCron', subscriptionExpiringCron) }, timezone)
  safeSchedule('subscriptionExpiredCron', '5 * * * *', () => { runScheduled('subscriptionExpiredCron', subscriptionExpiredCron) }, timezone)
  safeSchedule('mentorReadinessCheckCron', '0 11 * * 1', () => { runScheduled('mentorReadinessCheckCron', mentorReadinessCheckCron) }, timezone)
  safeSchedule('personalProgramCheckCron', '0 11 1 * *', () => { runScheduled('personalProgramCheckCron', personalProgramCheckCron) }, timezone)
  safeSchedule('winback3dCron', '0 9 * * *', () => { runScheduled('winback3dCron', async () => { await scheduleWinbackNotification(3, 'WINBACK_3D') }) }, timezone)
  safeSchedule('winback7dCron', '5 9 * * *', () => { runScheduled('winback7dCron', async () => { await scheduleWinbackNotification(7, 'WINBACK_7D') }) }, timezone)
  safeSchedule('winback14dCron', '10 9 * * *', () => { runScheduled('winback14dCron', async () => { await scheduleWinbackNotification(14, 'WINBACK_14D') }) }, timezone)
  safeSchedule('referralCheckCron', '0 12 1 * *', () => { runScheduled('referralCheckCron', referralCheckCron) }, timezone)
  safeSchedule('microTaskReminderCron', '0 * * * *', () => { runScheduled('microTaskReminderCron', microTaskReminderCron) }, timezone)
  safeSchedule('expireMicroTasksCron', '*/10 * * * *', () => { runScheduled('expireMicroTasksCron', expireMicroTasksCron) }, timezone)
  safeSchedule('nudgeCron', '15 * * * *', () => { runScheduled('nudgeCron', nudgeCron) }, timezone)
  safeSchedule('monthlyContentResearchRefresh', '0 3 1 * *', () => { runScheduled('monthlyContentResearchRefresh', async () => { const result = await refreshMarketResearch(); console.info('[scheduler] monthly content research refresh completed', result) }) }, timezone)
  safeSchedule('webMapMonthStartReminderCron', '0 9 1 * *', () => { runScheduled('webMapMonthStartReminderCron', webMapMonthStartReminderCron) }, timezone)
  safeSchedule('webMapMonthEndAnalysisCron', '0 20 28-31 * *', () => { runScheduled('webMapMonthEndAnalysisCron', webMapMonthEndAnalysisCron) }, timezone)
  safeSchedule('webMapBehindGoalsCron', '0 10 * * 1', () => { runScheduled('webMapBehindGoalsCron', webMapBehindGoalsCron) }, timezone)
  safeSchedule('aiSellerLeadFollowup3dCron', '0 11 * * *', () => { runScheduled('aiSellerLeadFollowup3dCron', aiSellerLeadFollowup3dCron) }, timezone)
  safeSchedule('aiSellerLeadFollowup7dCron', '2 11 * * *', () => { runScheduled('aiSellerLeadFollowup7dCron', aiSellerLeadFollowup7dCron) }, timezone)
  safeSchedule('aiSellerFocusCheck24hCron', '0 10 * * *', () => { runScheduled('aiSellerFocusCheck24hCron', aiSellerFocusCheck24hCron) }, timezone)
  safeSchedule('aiSellerFocusDojimBeforeZoom2Cron', '30 9 * * *', () => { runScheduled('aiSellerFocusDojimBeforeZoom2Cron', aiSellerFocusDojimBeforeZoom2Cron) }, timezone)
  safeSchedule('aiSellerRetention7dCron', '0 9 * * *', () => { runScheduled('aiSellerRetention7dCron', async () => { await aiSellerRetentionCron(7) }) }, timezone)
  safeSchedule('aiSellerRetention3dCron', '5 9 * * *', () => { runScheduled('aiSellerRetention3dCron', async () => { await aiSellerRetentionCron(3) }) }, timezone)
  safeSchedule('aiSellerRetention1dCron', '10 9 * * *', () => { runScheduled('aiSellerRetention1dCron', async () => { await aiSellerRetentionCron(1) }) }, timezone)
  safeSchedule('aiSellerReactivation7dCron', '0 10 * * *', () => { runScheduled('aiSellerReactivation7dCron', async () => { await aiSellerReactivationCron(7) }) }, timezone)
  safeSchedule('aiSellerReactivation30dCron', '5 10 * * *', () => { runScheduled('aiSellerReactivation30dCron', async () => { await aiSellerReactivationCron(30) }) }, timezone)
  safeSchedule('zoomSwapMonthlyResetSE2Cron', '0 0 1 * *', () => { runScheduled('zoomSwapMonthlyResetSE2Cron', async () => { await resetMonthlySwapUsage() }) }, timezone)
  safeSchedule('abTestR1R2Cron', '0 * * * *', () => { runScheduled('abTestR1R2Cron', async () => { await scheduleTestReminders(bot) }) }, timezone)
  safeSchedule('abTestR3R4Cron', '5 * * * *', () => { runScheduled('abTestR3R4Cron', async () => { await scheduleProgressReminders(bot) }) }, timezone)
  safeSchedule('abTestR5R6Cron', '10 * * * *', () => { runScheduled('abTestR5R6Cron', async () => { await scheduleResultReminders(bot) }) }, timezone)
  safeSchedule('abTestR7R8Cron', '15 * * * *', () => { runScheduled('abTestR7R8Cron', async () => { await scheduleOfferReminders(bot) }) }, timezone)
  safeSchedule('abTestZoomZ1Cron', '0 18 * * 1', () => { runScheduled('abTestZoomZ1Cron', async () => { await scheduleZoomReminders(bot, 'Z1_ZOOM_MON_1800') }) }, timezone)
  safeSchedule('abTestZoomZ2Cron', '55 18 * * 1', () => { runScheduled('abTestZoomZ2Cron', async () => { await scheduleZoomReminders(bot, 'Z2_ZOOM_MON_1855') }) }, timezone)
}

export function stopScheduler() {
  if (!schedulerStarted) return
  schedulerStopping = true
  for (const task of scheduledTasks.splice(0)) {
    task.stop()
    task.destroy()
  }
  registeredCronKeys.clear()
  stopNotificationWorker()
  stopRuntimeOutboxWorker()
  schedulerStarted = false
  console.log('🛑 [runtime] scheduler stopped')
}
