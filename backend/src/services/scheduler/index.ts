import cron, { type ScheduledTask } from 'node-cron'
import { NotificationChannel, NotificationStatus, NotificationType, ZoomStatus, type UserLifecycleState } from '@starway/db/prisma-client'
import type { Telegraf } from 'telegraf'

import { refreshMarketResearch } from '../../modules/admin/content-research.service.js'
import { sendCoachZoomSummary } from '../../modules/ai-operator/operator.service.js'
import { resetMonthlySwapUsage } from '../../modules/zoom/service.js'
import {
  cancelStaleBattlesCron,
  expireZoomSwapRequestsCron,
  generateZoomSessionsFromAvailabilityCron,
  syncZoomWeeklyChannelPostCron,
} from '../../modules/zoom/index.js'
import { getProductCronProfile } from '../../platform/index.js'
import { withRuntimeAdvisoryLock } from '../../core/runtime/runtimeIdempotency.js'
import { bot, sendOpsTelegramMessage } from '../../lib/telegram.js'
import { prisma } from '../../db/client.js'
import { AB_TEST_LIFECYCLE_REMINDERS, type LifecycleReminderKey } from '../../products/ab-system/content/abTest.followups.js'
import { startNotificationJobWorker, stopNotificationJobWorker } from '../notifications/worker.js'
import { startRuntimeOutboxWorker, stopRuntimeOutboxWorker } from '../runtimeOutbox/worker.js'
import { aiSellerFocusCheck24hCron, aiSellerFocusDojimBeforeZoom2Cron, aiSellerLeadFollowup3dCron, aiSellerLeadFollowup7dCron, aiSellerReactivationCron, aiSellerRetentionCron } from './ai-seller.jobs.js'
import { scheduleBillingExpiryCheck, scheduleBillingExpiryWarning, scheduleInactivityComeback } from './billing.jobs.js'
import { aiInactiveCron, coachDailyBriefingCron, coachMonthlyStrategicPlannerCron, coachWeeklyPlannerSaturdayCron, coachWeeklyPlannerTuesdayCron, dailyEveningCron, dailyMorningCron, streakBrokenCron, streakRiskCron, weeklyContentReminderCron, weeklySummaryCron } from './daily.jobs.js'
import { cloudinaryZoomAudioIngestCron } from '../../modules/zoom/cloudinary-audio-ingest.service.js'
import { mentorReadinessCheckCron, personalProgramCheckCron, referralCheckCron, scheduleWinbackNotification } from './lifecycle.jobs.js'
import { expireMicroTasksCron, markMissedDaysCron, microTaskReminderCron, nudgeCron, subscriptionExpiredCron, subscriptionExpiringCron, webMapBehindGoalsCron, webMapMonthEndAnalysisCron, webMapMonthStartReminderCron } from './operations.jobs.js'
import { resolveTelegramWebappBaseUrl } from '../../config/webapp.js'

export { aiSellerFocusCheck24hCron, aiSellerFocusDojimBeforeZoom2Cron, aiSellerLeadFollowup3dCron, aiSellerLeadFollowup7dCron, aiSellerReactivationCron, aiSellerRetentionCron } from './ai-seller.jobs.js'
export { scheduleBillingExpiryCheck, scheduleBillingExpiryWarning, scheduleInactivityComeback } from './billing.jobs.js'
export { aiInactiveCron, coachDailyBriefingCron, coachMonthlyStrategicPlannerCron, coachWeeklyPlannerSaturdayCron, coachWeeklyPlannerTuesdayCron, dailyEveningCron, dailyMorningCron, streakBrokenCron, streakRiskCron, weeklyContentReminderCron, weeklySummaryCron } from './daily.jobs.js'
export { mentorReadinessCheckCron, personalProgramCheckCron, referralCheckCron, scheduleWinbackNotification } from './lifecycle.jobs.js'
export { expireMicroTasksCron, markMissedDaysCron, microTaskReminderCron, nudgeCron, subscriptionExpiredCron, subscriptionExpiringCron, webMapBehindGoalsCron, webMapMonthEndAnalysisCron, webMapMonthStartReminderCron } from './operations.jobs.js'

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
  { key: 'zoomWeeklySessionGenerationCron', expression: '0 0 * * 0', task: generateZoomSessionsFromAvailabilityCron },
  { key: 'battleCleanupCron', expression: '0 3 * * *', task: cancelStaleBattlesCron },
] as const

function startOfWeekMonday(date = new Date()): Date {
  const normalized = new Date(date)
  const day = normalized.getDay()
  const diff = day === 0 ? -6 : 1 - day
  normalized.setDate(normalized.getDate() + diff)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function endOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(23, 59, 59, 999)
  return normalized
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function addDays(date: Date, days: number): Date {
  const normalized = new Date(date)
  normalized.setDate(normalized.getDate() + days)
  return normalized
}

async function zoomScheduleReadinessFridayCron(): Promise<void> {
  const currentWeekStart = startOfWeekMonday(new Date())
  const nextWeekStart = addDays(currentWeekStart, 7)
  const nextWeekEnd = endOfDay(addDays(nextWeekStart, 6))

  const count = await prisma.zoomSession.count({
    where: {
      scheduledAt: {
        gte: nextWeekStart,
        lte: nextWeekEnd,
      },
      status: { not: ZoomStatus.CANCELLED },
    },
  })

  if (count === 0) {
    await sendOpsTelegramMessage(
      'Zoom-розклад на наступний тиждень не сформовано. Додати сесії до неділі.',
    )
  }
}

type ReminderDispatch = {
  lifecycleState: UserLifecycleState
  reminderKey: LifecycleReminderKey
  minHoursSinceUpdate: number
  ctaAction: string
  triggerField: 'updatedAt' | 'testStartedAt' | 'testCompletedAt' | 'offerShownAt'
}

type ZoomReminderType = 'ZOOM_REMINDER_2H' | 'ZOOM_REMINDER_5M'
type ZoomRecoveryType = 'ZOOM_NO_SHOW'
type ZoomCoachSummaryType = 'ZOOM_COACH_SUMMARY_60M'

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

async function wasZoomReminderSentRecently(
  userId: string,
  sessionId: string,
  reminderType: ZoomReminderType | ZoomRecoveryType | ZoomCoachSummaryType,
): Promise<boolean> {
  const hit = await prisma.notification.findFirst({
    where: {
      userId,
      type: NotificationType.AI_REMINDER,
      templateKey: reminderType,
      status: NotificationStatus.SENT,
      data: { path: ['sessionId'], equals: sessionId },
    },
    select: { id: true },
  })

  return Boolean(hit)
}

function formatZoomReminderDate(date: Date): string {
  const weekday = date.toLocaleDateString('uk-UA', {
    weekday: 'long',
    timeZone: 'Europe/Kyiv',
  })
  const day = date.getDate()
  const month = date.toLocaleDateString('uk-UA', {
    month: 'long',
    timeZone: 'Europe/Kyiv',
  })
  const time = date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  })

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day} ${month} · ${time}`
}

function buildZoomCalendarUrl(intent?: string): string {
  const base = resolveTelegramWebappBaseUrl().replace(/\/$/, '')
  return intent ? `${base}/miniapp/zoom-calendar?intent=${intent}` : `${base}/miniapp/zoom-calendar`
}

function resolveZoomSessionEndAt(scheduledAt: Date, requests: unknown): Date {
  const meta =
    requests && typeof requests === 'object' && !Array.isArray(requests)
      ? requests as Record<string, unknown>
      : {}
  const durationMinutesRaw = meta.durationMinutes
  const durationMinutes =
    typeof durationMinutesRaw === 'number' && Number.isFinite(durationMinutesRaw) && durationMinutesRaw > 0
      ? durationMinutesRaw
      : 60

  return new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000)
}

type BookingQuestionEventPayload = {
  sessionId?: string
  questionText?: string
}

function parseBookingQuestionPayload(payload: unknown): BookingQuestionEventPayload {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return {}
  }

  return payload as BookingQuestionEventPayload
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatZoomCoachSummaryDate(date: Date): string {
  const day = date.toLocaleDateString('uk-UA', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Kyiv',
  })
  const time = date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  })

  return `${day}, ${time}`
}

function buildCoachProblemSummary(questions: string[]): string[] {
  const keywordBuckets = [
    {
      label: 'Гроші',
      keywords: ['гроші', 'грош', 'дохід', 'зароб', 'продаж', 'клієнт', 'ціна', 'вартість', 'фінанс'],
    },
    {
      label: 'Страх',
      keywords: ['страх', 'боюс', 'бою', 'тривог', 'сором', 'невпевн', 'відмова'],
    },
    {
      label: 'Відкладання',
      keywords: ['відкладан', 'прокраст', 'не можу почати', 'потім', 'завис', 'стопор'],
    },
    {
      label: 'Відносини',
      keywords: ['відносин', 'стосунк', 'чоловік', 'партнер', 'сім', 'мама', 'тато'],
    },
  ] as const

  const bucketCounts = keywordBuckets
    .map((bucket) => ({
      label: bucket.label,
      count: questions.reduce((sum, question) => (
        sum + bucket.keywords.reduce((bucketSum, keyword) => (
          bucketSum + (question.includes(keyword) ? 1 : 0)
        ), 0)
      ), 0),
    }))
    .filter((bucket) => bucket.count > 0)
    .sort((left, right) => right.count - left.count)

  if (bucketCounts.length > 0) {
    return bucketCounts.slice(0, 3).map((bucket) => `${bucket.label} (${bucket.count})`)
  }

  const stopWords = new Set([
    'або', 'але', 'без', 'більш', 'бути', 'вже', 'вона', 'вони', 'воно', 'все', 'всіх',
    'де', 'для', 'дуже', 'зараз', 'його', 'йти', 'коли', 'мене', 'мені', 'можу', 'моя',
    'моє', 'мої', 'на', 'над', 'нам', 'нас', 'не', 'ні', 'про', 'просто', 'після',
    'це', 'цей', 'ця', 'ці', 'щоб', 'що', 'як', 'я', 'у', 'та', 'ти', 'тут', 'так',
  ])
  const wordCounts = new Map<string, number>()

  for (const question of questions) {
    for (const word of question.split(' ')) {
      if (word.length < 4 || stopWords.has(word)) continue
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)
    }
  }

  return [...wordCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([word, count]) => `${word} (${count})`)
}

function buildCoachOpeningRecommendation(topProblems: string[]): string {
  const primary = topProblems[0]?.toLowerCase() ?? ''

  if (primary.includes('гроші')) {
    return 'Почни з питання: "Хто зараз застряг у темі грошей або доходу?"'
  }

  if (primary.includes('страх')) {
    return 'Почни з питання: "Хто зараз впирається в страх або невпевненість?"'
  }

  if (primary.includes('відкладання')) {
    return 'Почни з питання: "Хто зараз відкладає важливу дію і не може зрушити?"'
  }

  if (primary.includes('відносини')) {
    return 'Почни з питання: "Хто зараз застряг у напрузі у відносинах?"'
  }

  return 'Почни з питання: "Хто зараз відчуває головний стоп і хоче розібрати його першим?"'
}

function buildCoachSummaryMessage(params: {
  scheduledAt: Date
  participantsCount: number
  topProblems: string[]
  hasQuestions: boolean
}): string {
  const topProblems = params.hasQuestions && params.topProblems.length > 0
    ? params.topProblems.map((problem, index) => `${index + 1}. ${escapeHtml(problem)}`).join('\n')
    : 'Учасники ще не залишили запити'
  const recommendation = buildCoachOpeningRecommendation(params.topProblems)

  return [
    '🔥 <b>ПІДГОТОВКА ДО ZOOM</b>',
    '',
    `📅 ${escapeHtml(formatZoomCoachSummaryDate(params.scheduledAt))}`,
    `👥 ${params.participantsCount} учасників`,
    '',
    '<b>ТОП запити</b>',
    topProblems,
    '',
    '<b>🎯 Рекомендація</b>',
    escapeHtml(recommendation),
  ].join('\n')
}

export async function scanZoomCoachSummary(): Promise<void> {
  const now = new Date()
  const upcomingWindowStart = new Date(now.getTime() + 50 * 60 * 1000)
  const upcomingWindowEnd = new Date(now.getTime() + 60 * 60 * 1000)

  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: {
        gt: upcomingWindowStart,
        lte: upcomingWindowEnd,
      },
      expertId: { not: null },
    },
    select: {
      id: true,
      expertId: true,
      scheduledAt: true,
      attendees: {
        select: {
          userId: true,
        },
      },
    },
    take: 100,
  })

  for (const session of sessions) {
    const coachRecipients = await prisma.user.findMany({
      where: {
        expertId: session.expertId,
        deletedAt: null,
        role: { in: ['EXPERT', 'SUPERADMIN'] },
      },
      select: {
        id: true,
      },
    })

    const pendingCoachIds = new Set<string>()
    for (const coach of coachRecipients) {
      const alreadySent = await wasZoomReminderSentRecently(
        coach.id,
        session.id,
        'ZOOM_COACH_SUMMARY_60M',
      )
      if (!alreadySent) {
        pendingCoachIds.add(coach.id)
      }
    }

    if (pendingCoachIds.size === 0) continue

    const questionEvents = await prisma.event.findMany({
      where: {
        type: 'ZOOM_BOOKING_QUESTION',
        payload: {
          path: ['sessionId'],
          equals: session.id,
        },
      },
      select: {
        payload: true,
      },
    })

    const questionTexts = questionEvents
      .map((event) => parseBookingQuestionPayload(event.payload).questionText)
      .filter((questionText): questionText is string => typeof questionText === 'string' && questionText.trim().length > 0)
      .map((questionText) => questionText.trim())
    const normalizedQuestions = questionTexts.map(normalizeQuestionText).filter(Boolean)
    const topProblems = buildCoachProblemSummary(normalizedQuestions)
    const summaryMessage = buildCoachSummaryMessage({
      scheduledAt: session.scheduledAt,
      participantsCount: session.attendees.length,
      topProblems,
      hasQuestions: questionTexts.length > 0,
    })
    const sendResults = await sendCoachZoomSummary(session.expertId, summaryMessage, {
      targetUserIds: [...pendingCoachIds],
      replyMarkup: {
        inline_keyboard: [[
          { text: 'Відкрити календар', web_app: { url: buildZoomCalendarUrl() } },
        ]],
      },
    })

    for (const result of sendResults) {
      if (!pendingCoachIds.has(result.userId)) continue

      await prisma.notification.create({
        data: {
          expertId: session.expertId,
          userId: result.userId,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.AI_REMINDER,
          templateKey: 'ZOOM_COACH_SUMMARY_60M',
          title: 'Pre-Zoom Coach Summary',
          body: `Session ${session.id}`,
          status: result.sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: result.sent ? new Date() : undefined,
          failureReason: result.sent ? undefined : 'coach_chat_not_found',
          data: {
            sessionId: session.id,
            scheduledAt: session.scheduledAt.toISOString(),
            participantsCount: session.attendees.length,
            questionCount: questionTexts.length,
            topProblems,
          },
        },
      })
    }
  }
}

async function sendZoomReminder(
  telegramBot: Telegraf,
  params: {
    userId: string
    expertId: string | null
    chatId: string
    sessionId: string
    scheduledAt: Date
    zoomLink: string
    reminderType: ZoomReminderType
  },
): Promise<void> {
  const alreadySent = await wasZoomReminderSentRecently(
    params.userId,
    params.sessionId,
    params.reminderType,
  )
  if (alreadySent) return

  const dateLabel = formatZoomReminderDate(params.scheduledAt)
  const calendarUrl = buildZoomCalendarUrl('booking')
  const fallbackCalendarUrl = buildZoomCalendarUrl()
  const isTwoHourReminder = params.reminderType === 'ZOOM_REMINDER_2H'
  const title = isTwoHourReminder
    ? '📅 <b>Сьогодні Zoom-практика</b>'
    : '⏰ <b>Zoom починається через 5 хв</b>'
  const body = isTwoHourReminder
    ? 'Підготуйся і звільни час.'
    : 'Переходь за посиланням.'
  const inlineKeyboard = isTwoHourReminder
    ? [[
        { text: 'Записатись', web_app: { url: calendarUrl } },
        { text: 'Відкрити календар', web_app: { url: fallbackCalendarUrl } },
      ]]
    : [[
        params.zoomLink
          ? { text: 'Приєднатись', url: params.zoomLink }
          : { text: 'Приєднатись', web_app: { url: fallbackCalendarUrl } },
      ]]

  try {
    await telegramBot.telegram.sendMessage(
      params.chatId,
      [title, '', dateLabel, '', body].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      },
    )
    await prisma.notification.create({
      data: {
        expertId: params.expertId,
        userId: params.userId,
        channel: NotificationChannel.TELEGRAM,
        type: NotificationType.AI_REMINDER,
        templateKey: params.reminderType,
        title,
        body,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        data: {
          sessionId: params.sessionId,
          scheduledAt: params.scheduledAt.toISOString(),
          zoomLink: params.zoomLink,
        },
      },
    })
  } catch (error) {
    await prisma.notification.create({
      data: {
        expertId: params.expertId,
        userId: params.userId,
        channel: NotificationChannel.TELEGRAM,
        type: NotificationType.AI_REMINDER,
        templateKey: params.reminderType,
        title,
        body,
        status: NotificationStatus.FAILED,
        failureReason: error instanceof Error ? error.message : String(error),
        data: {
          sessionId: params.sessionId,
          scheduledAt: params.scheduledAt.toISOString(),
          zoomLink: params.zoomLink,
        },
      },
    })
  }
}

export async function scanZoomSessionReminders(telegramBot: Telegraf): Promise<void> {
  const now = new Date()
  const twoHourStart = new Date(now.getTime() + 110 * 60 * 1000)
  const twoHourEnd = new Date(now.getTime() + 120 * 60 * 1000)
  const fiveMinuteStart = now
  const fiveMinuteEnd = new Date(now.getTime() + 5 * 60 * 1000)

  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      OR: [
        { scheduledAt: { gt: twoHourStart, lte: twoHourEnd } },
        { scheduledAt: { gt: fiveMinuteStart, lte: fiveMinuteEnd } },
      ],
    },
    select: {
      id: true,
      scheduledAt: true,
      expertId: true,
      requests: true,
      attendees: {
        select: {
          userId: true,
          user: {
            select: {
              telegramChatId: true,
            },
          },
        },
      },
    },
  })

  for (const session of sessions) {
    const diffMs = session.scheduledAt.getTime() - now.getTime()
    const reminderType: ZoomReminderType | null =
      diffMs > 110 * 60 * 1000 && diffMs <= 120 * 60 * 1000
        ? 'ZOOM_REMINDER_2H'
        : diffMs > 0 && diffMs <= 5 * 60 * 1000
          ? 'ZOOM_REMINDER_5M'
          : null

    if (!reminderType) continue

    const zoomLink =
      session.requests && typeof session.requests === 'object' && !Array.isArray(session.requests)
        ? typeof (session.requests as Record<string, unknown>).zoomLink === 'string'
          ? String((session.requests as Record<string, unknown>).zoomLink)
          : ''
        : ''

    for (const attendee of session.attendees) {
      const chatId = attendee.user.telegramChatId?.trim()
      if (!chatId) continue

      await sendZoomReminder(telegramBot, {
        userId: attendee.userId,
        expertId: session.expertId ?? null,
        chatId,
        sessionId: session.id,
        scheduledAt: session.scheduledAt,
        zoomLink,
        reminderType,
      })
    }
  }
}

export async function scanZoomNoShowRecovery(
  telegramBot: Telegraf,
  options?: {
    now?: Date
    lookbackHours?: number
  },
): Promise<void> {
  const now = options?.now ?? new Date()
  const lookbackHours =
    typeof options?.lookbackHours === 'number' && Number.isFinite(options.lookbackHours) && options.lookbackHours > 0
      ? options.lookbackHours
      : 8
  const recentEndedStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000)
  const bookingUrl = buildZoomCalendarUrl('booking')

  const attendees = await prisma.zoomSessionAttendee.findMany({
    where: {
      attended: false,
      user: {
        telegramChatId: { not: null },
      },
      session: {
        status: { not: ZoomStatus.CANCELLED },
        scheduledAt: {
          gt: recentEndedStart,
          lte: now,
        },
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          telegramChatId: true,
        },
      },
      session: {
        select: {
          id: true,
          expertId: true,
          scheduledAt: true,
          requests: true,
        },
      },
    },
    take: 500,
  })

  for (const attendee of attendees) {
    const sessionEndedAt = resolveZoomSessionEndAt(
      attendee.session.scheduledAt,
      attendee.session.requests,
    )
    if (sessionEndedAt > now) continue

    const chatId = attendee.user.telegramChatId?.trim()
    if (!chatId) continue

    const alreadySent = await wasZoomReminderSentRecently(
      attendee.userId,
      attendee.session.id,
      'ZOOM_NO_SHOW',
    )
    if (alreadySent) continue

    const title = 'Ти не прийшла на Zoom.'
    const body = '> Це не проблема. Але важливо не злити процес.\n\nЩо робимо далі:'

    try {
      console.info('[NO_SHOW]', {
        userId: attendee.userId,
        sessionId: attendee.session.id,
        triggered: true,
      })
      await telegramBot.telegram.sendMessage(
        chatId,
        [title, '', body].join('\n'),
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Написати причину', callback_data: 'continue_ai_mentor_chat' }],
              [{ text: 'Записатись ще раз', web_app: { url: bookingUrl } }],
            ],
          },
        },
      )

      await prisma.notification.create({
        data: {
          expertId: attendee.session.expertId ?? null,
          userId: attendee.userId,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.AI_REMINDER,
          templateKey: 'ZOOM_NO_SHOW',
          title,
          body,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          data: {
            sessionId: attendee.session.id,
          },
        },
      })
    } catch (error) {
      await prisma.notification.create({
        data: {
          expertId: attendee.session.expertId ?? null,
          userId: attendee.userId,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.AI_REMINDER,
          templateKey: 'ZOOM_NO_SHOW',
          title,
          body,
          status: NotificationStatus.FAILED,
          failureReason: error instanceof Error ? error.message : String(error),
          data: {
            sessionId: attendee.session.id,
          },
        },
      })
    }
  }
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
        await telegramBot.telegram.sendMessage(user.telegramChatId, `${copy.title}\n\n${copy.body}`, {
          reply_markup: {
            inline_keyboard: [[{ text: copy.cta ?? 'Відкрити', callback_data: 'open_focus_payment' }]],
          },
        })
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
