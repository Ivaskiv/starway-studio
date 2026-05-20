import cron, { type ScheduledTask } from 'node-cron'

import { refreshMarketResearch } from '../../modules/admin/content-research.service.js'
import { PLATFORM_CRON_REGISTRY, getProductCronProfile } from '../../platform/index.js'
import { withRuntimeAdvisoryLock } from '../../core/runtime/runtimeIdempotency.js'
import { startNotificationWorker, stopNotificationWorker } from '../notifications/worker.js'
import { startRuntimeOutboxWorker, stopRuntimeOutboxWorker } from '../runtimeOutbox/worker.js'
import { aiSellerFocusCheck24hCron, aiSellerFocusDojimBeforeZoom2Cron, aiSellerLeadFollowup3dCron, aiSellerLeadFollowup7dCron, aiSellerReactivationCron, aiSellerRetentionCron } from './ai-seller.jobs.js'
import { scheduleBillingExpiryCheck, scheduleBillingExpiryWarning, scheduleInactivityComeback } from './billing.jobs.js'
import { aiInactiveCron, dailyEveningCron, dailyMorningCron, streakBrokenCron, streakRiskCron, weeklySummaryCron } from './daily.jobs.js'
import { mentorReadinessCheckCron, personalProgramCheckCron, referralCheckCron, scheduleWinbackNotification } from './lifecycle.jobs.js'
import { expireMicroTasksCron, markMissedDaysCron, microTaskReminderCron, nudgeCron, subscriptionExpiredCron, subscriptionExpiringCron, webMapBehindGoalsCron, webMapMonthEndAnalysisCron, webMapMonthStartReminderCron } from './operations.jobs.js'

export { aiSellerFocusCheck24hCron, aiSellerFocusDojimBeforeZoom2Cron, aiSellerLeadFollowup3dCron, aiSellerLeadFollowup7dCron, aiSellerReactivationCron, aiSellerRetentionCron } from './ai-seller.jobs.js'
export { scheduleBillingExpiryCheck, scheduleBillingExpiryWarning, scheduleInactivityComeback } from './billing.jobs.js'
export { aiInactiveCron, dailyEveningCron, dailyMorningCron, streakBrokenCron, streakRiskCron, weeklySummaryCron } from './daily.jobs.js'
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
    })
  })
}

export function startScheduler(options?: { startNotificationWorker?: boolean }) {
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
  const timezone = process.env.TZ || 'Europe/Kyiv'
  if (options?.startNotificationWorker !== false) startNotificationWorker()
  startRuntimeOutboxWorker()
  console.log(`⏰ [runtime] scheduler enabled (timezone=${timezone})`, {
    cronJobs: PLATFORM_CRON_REGISTRY.length,
    absystemCron: getProductCronProfile('absystem').jobs.length,
    stankeyCron: getProductCronProfile('stankey').jobs.length,
    focusCron: getProductCronProfile('focus').jobs.length,
  })
  safeSchedule('dailyMorningCron', '* * * * *', () => { runScheduled('dailyMorningCron', dailyMorningCron) }, timezone)
  safeSchedule('dailyEveningCron', '* * * * *', () => { runScheduled('dailyEveningCron', dailyEveningCron) }, timezone)
  safeSchedule('streakRiskCron', '0 * * * *', () => { runScheduled('streakRiskCron', streakRiskCron) }, timezone)
  safeSchedule('weeklySummaryCron', '0 19 * * 0', () => { runScheduled('weeklySummaryCron', weeklySummaryCron) }, timezone)
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
