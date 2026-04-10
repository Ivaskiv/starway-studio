import cron, { type ScheduledTask } from 'node-cron'

import { prisma } from '../../db/client.js'
import { getUserAccess } from '../../modules/access/service.js'
import { cacheDel } from '../../lib/cache/index.js'
import { invalidateDailyHistoryCache, invalidateDayCache } from '../../lib/db/dailyCache.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { resolvePausedMentorContext } from '../notifications/mentorLifecycle.js'
import { notificationService } from '../notifications/NotificationService.js'
import { notificationRecordService } from '../notifications/services/NotificationRecordService.js'
import { startNotificationWorker, stopNotificationWorker } from '../notifications/worker.js'
import { buildNotificationContent } from '../../lib/notifications/templates.js'
import { scheduleWinBackSequence } from '../../lib/funnel/winBackSequence.js'
import { processScheduledNudges } from '../../modules/telegram-mentor/services/nudge.service.js'
import { runWeeklyAnalysis } from '../../modules/ai-mentor/weekly-analysis/service.js'
import { refreshMarketResearch } from '../../modules/admin/content-research.service.js'
import { syncLifecycleForUser } from '../../modules/flow-control/service.js'
import { runMonthlyAnalysis } from '../../modules/web-map/web-map.service.js'
import { sendDedupedTelegramMessage } from '../../lib/telegram.js'

const scheduledTasks: ScheduledTask[] = []
let schedulerStarted = false
let schedulerStopping = false
let notificationPreferenceTableAvailable: boolean | undefined
let hasWarnedAboutMissingNotificationPreferenceTable = false

function register(task: ScheduledTask) {
  scheduledTasks.push(task)
  return task
}

function getMinutesInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find(part => part.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

function getWeekdayInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).formatToParts(date)

  return parts.find(part => part.type === 'weekday')?.value ?? ''
}

function isWithinScheduledMinute(now: Date, timezone: string, targetMinutes: number, toleranceMinutes = 1) {
  const localMinutes = getMinutesInTimezone(now, timezone)
  return Math.abs(localMinutes - targetMinutes) <= toleranceMinutes
}

function getStartOfUtcDay(date = new Date()) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

function getEndOfUtcDay(date = new Date()) {
  const next = getStartOfUtcDay(date)
  next.setUTCHours(23, 59, 59, 999)
  return next
}

async function hasMentorNotificationAccess(userId: string): Promise<boolean> {
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

async function ensureNotificationPreferenceTableAvailability(): Promise<boolean> {
  if (typeof notificationPreferenceTableAvailable !== 'undefined') {
    return notificationPreferenceTableAvailable
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'NotificationPreference'
      ) AS "exists"
    `
    notificationPreferenceTableAvailable = rows[0]?.exists === true
  } catch (error) {
    throw error
  }

  if (!notificationPreferenceTableAvailable) {
    if (!hasWarnedAboutMissingNotificationPreferenceTable) {
      hasWarnedAboutMissingNotificationPreferenceTable = true
      console.warn('[scheduler] NotificationPreference table missing; notification schedulers are disabled until migration is applied')
    }
    return false
  }

  return notificationPreferenceTableAvailable
}

function runScheduled(task: () => Promise<void>) {
  if (schedulerStopping || !schedulerStarted) return
  setImmediate(() => {
    if (schedulerStopping || !schedulerStarted) return
    void task().catch(console.error)
  })
}

export async function dailyMorningCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      telegramEnabled: true,
      dailyMorningEnabled: true,
    },
    select: {
      userId: true,
      dailyMorningTime: true,
      timezone: true,
    },
  })

  await Promise.all(preferences.map(async (preference) => {
    if (!isWithinScheduledMinute(now, preference.timezone, preference.dailyMorningTime)) return
    if (!(await hasMentorNotificationAccess(preference.userId))) return
    console.info('[scheduler] morning telegram matched', {
      userId: preference.userId,
      timezone: preference.timezone,
      localMinutes: getMinutesInTimezone(now, preference.timezone),
      scheduledMinutes: preference.dailyMorningTime,
    })
    await notificationService.emit(NotificationEvent.DAILY_MORNING_DUE, preference.userId)
    console.info('[scheduler] morning telegram dispatched', {
      userId: preference.userId,
    })
  }))
}

export async function dailyEveningCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      telegramEnabled: true,
      dailyEveningEnabled: true,
    },
    select: {
      userId: true,
      dailyEveningTime: true,
      timezone: true,
    },
  })

  await Promise.all(preferences.map(async (preference) => {
    if (!isWithinScheduledMinute(now, preference.timezone, preference.dailyEveningTime)) return
    if (!(await hasMentorNotificationAccess(preference.userId))) return
    console.info('[scheduler] evening telegram matched', {
      userId: preference.userId,
      timezone: preference.timezone,
      localMinutes: getMinutesInTimezone(now, preference.timezone),
      scheduledMinutes: preference.dailyEveningTime,
    })
    await notificationService.emit(NotificationEvent.DAILY_EVENING_DUE, preference.userId)
    console.info('[scheduler] evening telegram dispatched', {
      userId: preference.userId,
    })
  }))
}

export async function streakRiskCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const todayStart = getStartOfUtcDay()
  const candidates = await prisma.streak.findMany({
    where: {
      ruleKey: 'daily_checkin',
      endAt: null,
      current: { gt: 3 },
    },
    select: {
      current: true,
      userId: true,
      user: {
        select: {
          notificationPreference: {
            select: {
              telegramEnabled: true,
              streakRiskEnabled: true,
            },
          },
          dailyEntries: {
            where: { createdAt: { gte: todayStart } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  })

  for (const candidate of candidates) {
    const preferences = candidate.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.streakRiskEnabled) continue
    if (!(await hasMentorNotificationAccess(candidate.userId))) continue
    if (candidate.user.dailyEntries.length > 0) continue

    await notificationService.emit(NotificationEvent.STREAK_RISK, candidate.userId, {
      current: candidate.current,
      mode: 'risk',
    })
  }
}

export async function weeklySummaryCron(): Promise<void> {
  const now = new Date()
  const candidates = await prisma.user.findMany({
    where: {
      deletedAt: null,
      NOT: { email: { startsWith: 'telegram-guest-' } },
      OR: [
        { trialStartsAt: { not: null } },
        { trialEndsAt: { not: null } },
        { subscriptions: { some: {} } },
        { userMentors: { some: {} } },
        { dailyEntries: { some: {} } },
        { wheelAssessments: { some: {} } },
      ],
    },
    select: {
      id: true,
      notificationPreference: {
        select: {
          telegramEnabled: true,
          weeklySummaryEnabled: true,
          timezone: true,
        },
      },
    },
  })

  for (const candidate of candidates) {
    const preference = candidate.notificationPreference
    const timezone = preference?.timezone ?? process.env.TZ ?? 'Europe/Kyiv'

    if (getWeekdayInTimezone(now, timezone) !== 'Sun') continue
    if (getMinutesInTimezone(now, timezone) !== 19 * 60) continue

    const generated = await runWeeklyAnalysis(candidate.id)
    if (!generated) continue

    if (!preference?.telegramEnabled || !preference.weeklySummaryEnabled) continue
    if (!(await hasMentorNotificationAccess(candidate.id))) continue

    const [streak, wheels, sessions] = [
      { current: generated.userReport.streakDays },
      generated.metrics.wheels,
      generated.metrics.sessions,
    ]

    await notificationService.emit(NotificationEvent.WEEKLY_SUMMARY, candidate.id, {
      streak: streak?.current ?? 0,
      wheels,
      sessions,
    })
  }
}

export async function aiInactiveCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const mentors = await prisma.userAIMentor.findMany({
    where: {
      lastInteractionAt: { lt: threshold },
    },
    distinct: ['userId'],
    select: {
      userId: true,
      lastInteractionAt: true,
      user: {
        select: {
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

  for (const mentor of mentors) {
    const preferences = mentor.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.aiRemindersEnabled) continue
    if (!(await hasMentorNotificationAccess(mentor.userId))) continue

    await notificationService.emit(NotificationEvent.AI_INACTIVE, mentor.userId, {
      lastInteractionAt: mentor.lastInteractionAt.toISOString(),
    })
  }
}

export async function streakBrokenCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const todayStart = getStartOfUtcDay()
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1)

  const candidates = await prisma.streak.findMany({
    where: {
      ruleKey: 'daily_checkin',
      endAt: null,
      current: { gt: 1 },
      lastAt: { lt: yesterdayStart },
    },
    select: {
      userId: true,
      user: {
        select: {
          notificationPreference: {
            select: {
              telegramEnabled: true,
              streakBrokenEnabled: true,
              timezone: true,
            },
          },
        },
      },
    },
  })

  for (const candidate of candidates) {
    const preferences = candidate.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.streakBrokenEnabled) continue
    if (!(await hasMentorNotificationAccess(candidate.userId))) continue
    if (getMinutesInTimezone(new Date(), preferences.timezone) !== 8 * 60) continue
    await notificationService.emit(NotificationEvent.STREAK_BROKEN, candidate.userId)
  }
}

export async function markMissedDaysCron(): Promise<void> {
  const todayStart = getStartOfUtcDay()
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1)
  const yesterdayEnd = new Date(todayStart.getTime() - 1)
  const catchUpDeadline = getEndOfUtcDay(todayStart)
  const dayKey = yesterdayStart.toISOString().slice(0, 10)

  const missedEntries = await prisma.dailyEntry.findMany({
    where: {
      date: { gte: yesterdayStart, lte: yesterdayEnd },
      status: { in: ['PENDING', 'IN_PROGRESS', 'PARTIAL'] },
    },
    select: {
      id: true,
      userId: true,
      date: true,
      content: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  })

  if (missedEntries.length === 0) {
    return
  }

  for (const entry of missedEntries) {
    const nextContent =
      entry.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
        ? {
            ...(entry.content as Record<string, unknown>),
            status: 'SKIPPED',
            skippedAt: new Date().toISOString(),
            completedLate: false,
          }
        : {
            status: 'SKIPPED',
            skippedAt: new Date().toISOString(),
            completedLate: false,
          }

    await prisma.dailyEntry.update({
      where: { id: entry.id },
      data: {
        status: 'SKIPPED',
        content: nextContent,
        canCatchUpUntil: catchUpDeadline,
      },
    })

    await prisma.streak.updateMany({
      where: {
        userId: entry.userId,
        ruleKey: 'daily_checkin',
        endAt: null,
      },
      data: {
        endAt: new Date(),
      },
    })

    const content = buildNotificationContent('MISSED_DAY_CATCHUP', {
      userName: entry.user.name ?? 'Привіт',
      dayNumber: Number(dayKey.slice(-2)),
    })

    await notificationRecordService.create({
      userId: entry.userId,
      type: 'MISSED_DAY_CATCHUP',
      title: content.title,
      body: content.body,
      data: {
        ctaText: content.ctaText ?? null,
        ctaUrl: content.ctaUrl ?? '/dashboard/cycle?date=yesterday',
        date: entry.date.toISOString(),
        canCatchUpUntil: catchUpDeadline.toISOString(),
      },
      channel: 'IN_APP',
      status: 'SENT',
      templateKey: `missed_day_catchup_${dayKey}`,
      sentAt: new Date(),
    })

    await notificationService.emit(NotificationEvent.STREAK_BROKEN, entry.userId, {
      date: entry.date.toISOString(),
      canCatchUpUntil: catchUpDeadline.toISOString(),
    }).catch(error => {
      console.error('[scheduler] failed to emit streak broken notification', {
        userId: entry.userId,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    })

    await Promise.all([
      invalidateDayCache(entry.userId, entry.date),
      invalidateDailyHistoryCache(entry.userId),
      cacheDel(`user:${entry.userId}`),
    ])
  }
}

export async function subscriptionExpiringCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      telegramEnabled: true,
      subscriptionEnabled: true,
    },
    select: {
      userId: true,
      timezone: true,
    },
  })

  for (const preference of preferences) {
    if (getMinutesInTimezone(now, preference.timezone) !== 10 * 60) continue
    if (!(await hasMentorNotificationAccess(preference.userId))) continue

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: preference.userId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        OR: [
          { currentPeriodEnd: { not: null } },
          { trialEndsAt: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        currentPeriodEnd: true,
        trialEndsAt: true,
      },
    })

    const expiresAt = subscription?.currentPeriodEnd ?? subscription?.trialEndsAt
    if (!expiresAt) continue

    const hoursLeft = expiresAt.getTime() - now.getTime()
    if (hoursLeft <= 0) continue

    const daysLeft = Math.ceil(hoursLeft / (24 * 60 * 60 * 1000))
    if (daysLeft !== 3 && daysLeft !== 1) continue

    await notificationService.emit(NotificationEvent.SUBSCRIPTION_EXPIRING, preference.userId, {
      expiresAt: expiresAt.toISOString(),
      daysLeft,
    })
  }
}

export async function subscriptionExpiredCron(): Promise<void> {
  const now = new Date()
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      trialEndsAt: { not: null, lte: now },
      NOT: { email: { startsWith: 'telegram-guest-' } },
    },
    select: {
      id: true,
      funnelStage: true,
      notificationPreference: {
        select: {
          telegramEnabled: true,
          subscriptionEnabled: true,
          timezone: true,
        },
      },
    },
  })

  for (const user of users) {
    const previousStage = user.funnelStage
    const snapshot = await syncLifecycleForUser(user.id)
    if (previousStage !== 'CHURNED' && snapshot.state === 'expired') {
      await scheduleWinBackSequence(user.id).catch(error => {
        console.error('[scheduler] failed to schedule win-back', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'unknown_error',
        })
      })
    }

    const preference = user.notificationPreference
    const timezone = preference?.timezone ?? process.env.TZ ?? 'Europe/Kyiv'
    if (!isWithinScheduledMinute(now, timezone, 8 * 60, 1)) continue

    const pausedContext = await resolvePausedMentorContext(user.id)
    if (!pausedContext) continue
    const generated = await runWeeklyAnalysis(user.id)

    const msSinceExpired = now.getTime() - pausedContext.expiresAt.getTime()
    if (msSinceExpired < 0) continue

    const daysSinceExpired = Math.floor(msSinceExpired / (24 * 60 * 60 * 1000))

    if (!preference?.telegramEnabled || !preference.subscriptionEnabled) continue

    await notificationService.emit(NotificationEvent.SUBSCRIPTION_EXPIRED, user.id, {
      expiresAt: pausedContext.expiresAt.toISOString(),
      previousPlan: pausedContext.previousPlan,
      daysSinceExpired,
    })

    if (daysSinceExpired > 0) continue

    await notificationService.emit(NotificationEvent.POST_TRIAL_REPORTS, user.id, {
      daysSinceExpired,
      streak: generated?.userReport.streakDays ?? 0,
      wheels: generated?.metrics.wheels ?? 0,
      sessions: generated?.metrics.sessions ?? 0,
    })
  }
}

export async function microTaskReminderCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()

  const tasks = await prisma.microTask.findMany({
    where: {
      status: 'active',
      isCompleted: false,
      dueAt: { not: null },
    },
    select: {
      userId: true,
      title: true,
      dueAt: true,
      stepsCompleted: true,
      user: {
        select: {
          notificationPreference: {
            select: {
              telegramEnabled: true,
              aiRemindersEnabled: true,
              timezone: true,
            },
          },
        },
      },
    },
  })

  for (const task of tasks) {
    const preferences = task.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.aiRemindersEnabled || !task.dueAt) continue
    const pausedContext = await resolvePausedMentorContext(task.userId)
    if (pausedContext) continue

    if (!(await hasMentorNotificationAccess(task.userId))) continue

    const started = Array.isArray(task.stepsCompleted) && task.stepsCompleted.some(Boolean)
    const localMinutes = getMinutesInTimezone(now, preferences.timezone)
    const msLeft = task.dueAt.getTime() - now.getTime()

    if (!started && localMinutes === 14 * 60) {
      await notificationService.sendMicroTaskReminder(task.userId, task.title, false)
      continue
    }

    if (msLeft > 0 && msLeft <= 2 * 60 * 60 * 1000) {
      await notificationService.sendMicroTaskReminder(task.userId, task.title, true)
    }
  }
}

export async function expireMicroTasksCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()

  const tasks = await prisma.microTask.findMany({
    where: {
      status: 'active',
      isCompleted: false,
      dueAt: { lt: now },
    },
    select: {
      id: true,
      userId: true,
      title: true,
    },
  })

  for (const task of tasks) {
    await prisma.microTask.update({
      where: { id: task.id },
      data: { status: 'expired' },
    })
  }
}

export async function nudgeCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  await processScheduledNudges()
}

async function sendWebMapTelegramNotification(
  userId: string,
  payload: { text: string; buttons?: Array<{ label: string; url: string }> },
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramEnabled: true,
    },
  })

  if (!user?.telegramChatId || user.telegramEnabled === false) {
    return
  }

  const options = payload.buttons && payload.buttons.length > 0
    ? {
        reply_markup: {
          inline_keyboard: [
            payload.buttons.map(button => ({
              text: button.label,
              url: button.url,
            })),
          ],
        },
      }
    : undefined

  await sendDedupedTelegramMessage(user.telegramChatId, payload.text, options)
}

export async function webMapMonthStartReminderCron(): Promise<void> {
  const now = new Date()
  const month = now.getMonth() + 1

  const maps = await prisma.annualStrategyMap.findMany({
    where: { status: 'active' },
    include: {
      goals: { where: { isMain: true }, take: 1 },
      monthlyReviews: {
        where: { month, year: now.getFullYear() },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  for (const map of maps) {
    const currentMonthPlan = map.monthlyReviews[0]
    if (!currentMonthPlan) continue
    const mainGoal = map.goals[0]

    await sendWebMapTelegramNotification(map.userId, {
      text:
        `Починається новий місяць. Фокус: ${currentMonthPlan.focus ?? 'Онови фокус місяця'}. ` +
        `Головна ціль: ${mainGoal?.progress ?? 0}%`,
      buttons: [
        {
          label: 'Відкрити план місяця',
          url: `${process.env.WEBAPP_URL}/dashboard/vision`,
        },
      ],
    }).catch(error => {
      console.error('[scheduler] web-map month start reminder error', {
        userId: map.userId,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    })
  }
}

export async function webMapMonthEndAnalysisCron(): Promise<void> {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (tomorrow.getDate() !== 1) {
    return
  }

  const maps = await prisma.annualStrategyMap.findMany({
    where: { status: 'active' },
    select: { userId: true },
  })

  for (const map of maps) {
    await runMonthlyAnalysis(map.userId).catch(error => {
      console.error('[scheduler] web-map monthly-analysis error', {
        userId: map.userId,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    })
  }
}

export async function webMapBehindGoalsCron(): Promise<void> {
  const now = new Date()
  const currentMonth = now.getMonth() + 1

  const maps = await prisma.annualStrategyMap.findMany({
    where: { status: 'active' },
    include: {
      goals: {
        where: { status: 'behind' },
      },
    },
  })

  for (const map of maps) {
    for (const goal of map.goals) {
      if (!goal.targetMonth) continue
      const monthsBehind = currentMonth - goal.targetMonth
      if (monthsBehind < 2) continue

      await sendWebMapTelegramNotification(map.userId, {
        text: `Ціль "${goal.title}" відстає вже ${monthsBehind} місяці. AI-коуч підготував рекомендацію.`,
        buttons: [
          {
            label: 'Відкрити карту',
            url: `${process.env.WEBAPP_URL}/dashboard/vision`,
          },
        ],
      }).catch(() => undefined)
    }
  }
}

export function startScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true
  schedulerStopping = false

  const timezone = process.env.TZ || 'Europe/Kyiv'
  startNotificationWorker()

  register(cron.schedule('* * * * *', () => {
    runScheduled(dailyMorningCron)
  }, { timezone }))

  register(cron.schedule('* * * * *', () => {
    runScheduled(dailyEveningCron)
  }, { timezone }))

  register(cron.schedule('0 * * * *', () => {
    runScheduled(streakRiskCron)
  }, { timezone }))

  register(cron.schedule('* * * * *', () => {
    runScheduled(weeklySummaryCron)
  }, { timezone }))

  register(cron.schedule('0 * * * *', () => {
    runScheduled(aiInactiveCron)
  }, { timezone }))

  register(cron.schedule('* * * * *', () => {
    runScheduled(streakBrokenCron)
  }, { timezone }))

  register(cron.schedule('5 0 * * *', () => {
    runScheduled(markMissedDaysCron)
  }, { timezone }))

  register(cron.schedule('0 * * * *', () => {
    runScheduled(subscriptionExpiringCron)
  }, { timezone }))

  register(cron.schedule('5 * * * *', () => {
    runScheduled(subscriptionExpiredCron)
  }, { timezone }))

  register(cron.schedule('0 * * * *', () => {
    runScheduled(microTaskReminderCron)
  }, { timezone }))

  register(cron.schedule('*/10 * * * *', () => {
    runScheduled(expireMicroTasksCron)
  }, { timezone }))

  register(cron.schedule('15 * * * *', () => {
    runScheduled(nudgeCron)
  }, { timezone }))

  register(cron.schedule('0 3 1 * *', () => {
    runScheduled(async () => {
      const result = await refreshMarketResearch()
      console.info('[scheduler] monthly content research refresh completed', result)
    })
  }, { timezone }))

  register(cron.schedule('0 9 1 * *', () => {
    runScheduled(webMapMonthStartReminderCron)
  }, { timezone }))

  register(cron.schedule('0 20 28-31 * *', () => {
    runScheduled(webMapMonthEndAnalysisCron)
  }, { timezone }))

  register(cron.schedule('0 10 * * 1', () => {
    runScheduled(webMapBehindGoalsCron)
  }, { timezone }))
}

export function stopScheduler() {
  if (!schedulerStarted) return
  schedulerStopping = true
  for (const task of scheduledTasks.splice(0)) {
    task.stop()
    task.destroy()
  }
  stopNotificationWorker()
  schedulerStarted = false
}
