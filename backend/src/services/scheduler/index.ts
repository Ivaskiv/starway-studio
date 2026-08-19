
import cron,{ type ScheduledTask } from 'node-cron'
import type { Telegraf } from 'telegraf'

import { withRuntimeAdvisoryLock } from '../../core/runtime/idempotency.js'
import { prisma } from '../../db/client.js'
import { bot,sendOpsTelegramMessage } from '../../lib/telegram.js'

import { refreshMarketResearch } from '../../modules/admin/content-research/service.js'

import { cloudinaryZoomAudioIngestCron } from '../../modules/zoom/audio/cloudinary-audio-ingest.service.js'
import {
cancelStaleBattlesCron,
expireZoomSwapRequestsCron,
syncZoomWeeklyChannelPostCron,
} from '../../modules/zoom/index.js'
import { generateZoomSessionsFromAvailabilityCron } from '../../modules/zoom/notifications/zoom.notifications.js'
import { resetMonthlySwapUsage } from '../../modules/zoom/service.js'

import { getProductCronProfile } from '../../platform/index.js'

import { startNotificationJobWorker,stopNotificationJobWorker } from '../notifications/worker.js'
import { startRuntimeOutboxWorker,stopRuntimeOutboxWorker } from '../runtimeOutbox/worker.js'
import { aiSellerFocusCheck24hCron,aiSellerFocusDojimBeforeZoom2Cron,aiSellerLeadFollowup3dCron,aiSellerLeadFollowup7dCron,aiSellerReactivationCron,aiSellerRetentionCron } from './ai-seller.js'
import { scheduleBillingExpiryCheck,scheduleBillingExpiryWarning,scheduleInactivityComeback } from './billing.js'
import { aiInactiveCron,coachDailyBriefingCron,coachMonthlyStrategicPlannerCron,coachWeeklyPlannerSaturdayCron,coachWeeklyPlannerTuesdayCron,dailyEveningCron,dailyMorningCron,streakBrokenCron,streakRiskCron,weeklyContentReminderCron,weeklySummaryCron } from './daily/index.js'
import { mentorReadinessCheckCron,personalProgramCheckCron,referralCheckCron,scheduleWinbackNotification } from './lifecycle.js'
import { expireMicroTasksCron,markMissedDaysCron,microTaskReminderCron,nudgeCron,subscriptionExpiredCron,subscriptionExpiringCron,webMapBehindGoalsCron,webMapMonthEndAnalysisCron,webMapMonthStartReminderCron } from './operations.js'

export { aiSellerFocusCheck24hCron,aiSellerFocusDojimBeforeZoom2Cron,aiSellerLeadFollowup3dCron,aiSellerLeadFollowup7dCron,aiSellerReactivationCron,aiSellerRetentionCron } from './ai-seller.js'
export { scheduleBillingExpiryCheck,scheduleBillingExpiryWarning,scheduleInactivityComeback } from './billing.js'
export { aiInactiveCron,coachDailyBriefingCron,coachMonthlyStrategicPlannerCron,coachWeeklyPlannerSaturdayCron,coachWeeklyPlannerTuesdayCron,dailyEveningCron,dailyMorningCron,streakBrokenCron,streakRiskCron,weeklyContentReminderCron,weeklySummaryCron } from './daily/index.js'
export { mentorReadinessCheckCron,personalProgramCheckCron,referralCheckCron,scheduleWinbackNotification } from './lifecycle.js'
export { expireMicroTasksCron,markMissedDaysCron,microTaskReminderCron,nudgeCron,subscriptionExpiredCron,subscriptionExpiringCron,webMapBehindGoalsCron,webMapMonthEndAnalysisCron,webMapMonthStartReminderCron } from './operations.js'

const scheduledTasks: ScheduledTask[] = []
const registeredCronKeys = new Set<string>()
let schedulerStarted = false
let schedulerStopping = false
const SCHEDULERS_DISABLED = process.env.DISABLE_SCHEDULERS === 'true'
// After consolidating every runtime cron into the canonical registry, the
// observable worst-case collision is 5 jobs in the same minute. Keep the slot
// limit aligned with the canonical registry peak so registry consolidation does
// not introduce artificial queueing.
const SCHEDULER_CONCURRENCY_LIMIT = 5
let activeScheduledTasks = 0
const scheduledTaskWaiters: Array<() => void> = []

export type CronTaskOptions = {
  critical?: boolean
}

type CanonicalCronRegistration = Readonly<{
  key: string
  expression: string
  task: () => Promise<void>
  options?: CronTaskOptions
}>

function register(task: ScheduledTask) {
  scheduledTasks.push(task)
  return task
}

async function runInSchedulerSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeScheduledTasks >= SCHEDULER_CONCURRENCY_LIMIT) {
    console.warn('[scheduler] slot queue', { waiting: scheduledTaskWaiters.length + 1 })
    await new Promise<void>((resolve) => {
      scheduledTaskWaiters.push(resolve)
    })
  }

  activeScheduledTasks += 1
  try {
    return await task()
  } finally {
    activeScheduledTasks = Math.max(0, activeScheduledTasks - 1)
    const next = scheduledTaskWaiters.shift()
    next?.()
  }
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

function runScheduled(key: string, task: () => Promise<void>, options?: CronTaskOptions) {
  if (schedulerStopping || !schedulerStarted) return
  void runInSchedulerSlot(async () => {
    await withRuntimeAdvisoryLock({ scope: 'cron', type: key, source: 'internal', runtimeStage: 'scheduler' }, async () => {
      await task()
    })
  }).catch(error => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'unknown_error'
    if (options?.critical === false) {
      console.warn('[scheduler] non-critical cron task failed', { key, error: message })
      return
    }
    console.error('[scheduler] cron task failed', { key, error })
    void sendOpsTelegramMessage(
      `🚨 Scheduler cron task failed\nkey: ${key}\nerror: ${message}`,
    )
  })
}

const CANONICAL_CRON_REGISTRATIONS: readonly CanonicalCronRegistration[] = [
  { key: 'dailyMorningCron', expression: '0 8 * * *', task: dailyMorningCron },
  { key: 'dailyEveningCron', expression: '0 20 * * *', task: dailyEveningCron },
  { key: 'coachDailyBriefingCron', expression: '1 9 * * *', task: coachDailyBriefingCron },
  { key: 'streakRiskCron', expression: '0 * * * *', task: streakRiskCron },
  { key: 'weeklyContentReminderCron', expression: '3 9 * * 2', task: weeklyContentReminderCron },
  { key: 'coachWeeklyPlannerTuesdayCron', expression: '5 9 * * 2', task: coachWeeklyPlannerTuesdayCron },
  { key: 'weeklySummaryCron', expression: '0 19 * * 0', task: weeklySummaryCron },
  { key: 'coachWeeklyPlannerSaturdayCron', expression: '3 9 * * 6', task: coachWeeklyPlannerSaturdayCron },
  { key: 'coachMonthlyStrategicPlannerCron', expression: '5 9 * * 6', task: coachMonthlyStrategicPlannerCron },
  { key: 'cloudinaryZoomAudioIngestCron', expression: '0 3 * * 2', task: cloudinaryZoomAudioIngestCron, options: { critical: false } },
  { key: 'zoomScheduleReadinessFridayCron', expression: '7 9 * * 5', task: zoomScheduleReadinessFridayCron },
  { key: 'aiInactiveCron', expression: '2 * * * *', task: aiInactiveCron },
  { key: 'billingExpiryWarningCron', expression: '1 10 * * *', task: scheduleBillingExpiryWarning },
  { key: 'billingExpiryCheckCron', expression: '9 9 * * *', task: scheduleBillingExpiryCheck },
  { key: 'inactivity3dComebackCron', expression: '10 * * * *', task: async () => { await scheduleInactivityComeback(3, 'GAP_1_3') } },
  { key: 'inactivity7dComebackCron', expression: '12 * * * *', task: async () => { await scheduleInactivityComeback(7, 'GAP_4_7') } },
  { key: 'inactivity14dComebackCron', expression: '14 * * * *', task: async () => { await scheduleInactivityComeback(14, 'GAP_7_14') } },
  { key: 'inactivity30dComebackCron', expression: '16 * * * *', task: async () => { await scheduleInactivityComeback(30, 'GAP_30_PLUS') } },
  { key: 'streakBrokenCron', expression: '0 8 * * *', task: streakBrokenCron },
  { key: 'markMissedDaysCron', expression: '5 0 * * *', task: markMissedDaysCron },
  { key: 'subscriptionExpiringCron', expression: '4 * * * *', task: subscriptionExpiringCron },
  { key: 'subscriptionExpiredCron', expression: '5 * * * *', task: subscriptionExpiredCron },
  { key: 'subscriptionExpiryCron', expression: '3 10 * * *', task: async () => { await scheduleSubscriptionExpiryReminders(bot) } },
  { key: 'mentorReadinessCheckCron', expression: '1 11 * * 1', task: mentorReadinessCheckCron },
  { key: 'personalProgramCheckCron', expression: '5 11 1 * *', task: personalProgramCheckCron },
  { key: 'winback3dCron', expression: '11 9 * * *', task: async () => { await scheduleWinbackNotification(3, 'WINBACK_3D') } },
  { key: 'winback7dCron', expression: '5 9 * * *', task: async () => { await scheduleWinbackNotification(7, 'WINBACK_7D') } },
  { key: 'winback14dCron', expression: '10 9 * * *', task: async () => { await scheduleWinbackNotification(14, 'WINBACK_14D') } },
  { key: 'referralCheckCron', expression: '5 12 1 * *', task: referralCheckCron },
  { key: 'microTaskReminderCron', expression: '6 * * * *', task: microTaskReminderCron },
  { key: 'expireMicroTasksCron', expression: '7-57/10 * * * *', task: expireMicroTasksCron },
  { key: 'nudgeCron', expression: '15 * * * *', task: nudgeCron },
  { key: 'monthlyContentResearchRefresh', expression: '0 3 1 * *', task: async () => { const result = await refreshMarketResearch(); console.info('[scheduler] monthly content research refresh completed', result) } },
  { key: 'webMapMonthStartReminderCron', expression: '17 9 1 * *', task: webMapMonthStartReminderCron },
  { key: 'webMapMonthEndAnalysisCron', expression: '0 20 28-31 * *', task: webMapMonthEndAnalysisCron },
  { key: 'webMapBehindGoalsCron', expression: '5 10 * * 1', task: webMapBehindGoalsCron },
  { key: 'aiSellerLeadFollowup3dCron', expression: '3 11 * * *', task: aiSellerLeadFollowup3dCron },
  { key: 'aiSellerLeadFollowup7dCron', expression: '2 11 * * *', task: aiSellerLeadFollowup7dCron },
  { key: 'aiSellerFocusCheck24hCron', expression: '7 10 * * *', task: aiSellerFocusCheck24hCron },
  { key: 'aiSellerFocusDojimBeforeZoom2Cron', expression: '30 9 * * *', task: aiSellerFocusDojimBeforeZoom2Cron },
  { key: 'aiSellerRetention7dCron', expression: '13 9 * * *', task: async () => { await aiSellerRetentionCron(7) } },
  { key: 'aiSellerRetention3dCron', expression: '5 9 * * *', task: async () => { await aiSellerRetentionCron(3) } },
  { key: 'aiSellerRetention1dCron', expression: '10 9 * * *', task: async () => { await aiSellerRetentionCron(1) } },
  { key: 'aiSellerReactivation7dCron', expression: '9 10 * * *', task: async () => { await aiSellerReactivationCron(7) } },
  { key: 'aiSellerReactivation30dCron', expression: '5 10 * * *', task: async () => { await aiSellerReactivationCron(30) } },
  { key: 'zoomSwapMonthlyResetSE2Cron', expression: '0 0 1 * *', task: async () => { await resetMonthlySwapUsage() } },
  { key: 'abTestR1R2Cron', expression: '8 * * * *', task: async () => { await scheduleTestReminders(bot) } },
  { key: 'abTestR3R4Cron', expression: '9-59/10 * * * *', task: async () => { await scheduleProgressReminders(bot) } },
  { key: 'abTestZoomZ1Cron', expression: '0 18 * * 1', task: async () => { await scheduleZoomReminders(bot, 'Z1_ZOOM_MON_1800') } },
  { key: 'abTestZoomZ2Cron', expression: '55 18 * * 1', task: async () => { await scheduleZoomReminders(bot, 'Z2_ZOOM_MON_1855') } },
  { key: 'zoomSessionReminderScanCron', expression: '* * * * *', task: async () => { await scanZoomSessionReminders(bot) }, options: { critical: false } },
  { key: 'zoomCoachSummaryCron', expression: '*/5 * * * *', task: async () => { await scanZoomCoachSummary() }, options: { critical: false } },
  { key: 'zoomNoShowRecoveryCron', expression: '*/5 * * * *', task: async () => { await scanZoomNoShowRecovery(bot) }, options: { critical: false } },
  { key: 'zoomWeeklyChannelSyncCron', expression: '0 18 * * 0', task: syncZoomWeeklyChannelPostCron },
  { key: 'zoomSwapExpiryCron', expression: '*/30 * * * *', task: expireZoomSwapRequestsCron },
  { key: 'zoomAvailabilityAutoGenerateCron', expression: '12 2 * * *', task: generateZoomSessionsFromAvailabilityCron },
  { key: 'battleCleanupCron', expression: '0 3 * * *', task: cancelStaleBattlesCron },
] as const

import {
  zoomScheduleReadinessFridayCron,
  scanZoomSessionReminders,
  scanZoomCoachSummary,
  scanZoomNoShowRecovery,
} from './zoom.js'

import {
  scheduleTestReminders,
  scheduleProgressReminders,
  scheduleResultReminders,
  scheduleOfferReminders,
  scheduleZoomReminders,
  scheduleSubscriptionExpiryReminders,
} from './lifecycle-reminders.js'

export {
  zoomScheduleReadinessFridayCron,
  scanZoomSessionReminders,
  scanZoomCoachSummary,
  scanZoomNoShowRecovery,
} from './zoom.js'

export {
  scheduleTestReminders,
  scheduleProgressReminders,
  scheduleResultReminders,
  scheduleOfferReminders,
  scheduleZoomReminders,
  scheduleSubscriptionExpiryReminders,
} from './lifecycle-reminders.js'

export function startScheduler(options?: { coachBot?: Telegraf | null }) {
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
  startNotificationJobWorker()
  startRuntimeOutboxWorker()
  console.log(`⏰ [runtime] scheduler enabled (timezone=${timezone})`, {
    cronJobs: CANONICAL_CRON_REGISTRATIONS.length,
    absystemCron: getProductCronProfile('absystem').jobs.length,
    stankeyCron: getProductCronProfile('stankey').jobs.length,
    focusCron: getProductCronProfile('focus').jobs.length,
    coachBotAttached: Boolean(options?.coachBot),
  })
  for (const registration of CANONICAL_CRON_REGISTRATIONS) {
    safeSchedule(
      registration.key,
      registration.expression,
      () => { runScheduled(registration.key, registration.task, registration.options) },
      timezone,
    )
  }
}

export function stopScheduler() {
  if (!schedulerStarted) return
  schedulerStopping = true
  for (const task of scheduledTasks.splice(0)) {
    task.stop()
    task.destroy()
  }
  registeredCronKeys.clear()
  stopNotificationJobWorker()
  stopRuntimeOutboxWorker()
  schedulerStarted = false
  console.log('🛑 [runtime] scheduler stopped')
}
