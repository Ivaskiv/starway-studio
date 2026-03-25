import cron, { type ScheduledTask } from 'node-cron'

import { prisma } from '../../db/client.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { notificationService } from '../notifications/NotificationService.js'
import { startNotificationWorker, stopNotificationWorker } from '../notifications/worker.js'

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

function getStartOfUtcDay(date = new Date()) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
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
    if (getMinutesInTimezone(now, preference.timezone) !== preference.dailyMorningTime) return
    await notificationService.emit(NotificationEvent.DAILY_MORNING_DUE, preference.userId)
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
    if (getMinutesInTimezone(now, preference.timezone) !== preference.dailyEveningTime) return
    await notificationService.emit(NotificationEvent.DAILY_EVENING_DUE, preference.userId)
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
    if (candidate.user.dailyEntries.length > 0) continue

    await notificationService.emit(NotificationEvent.STREAK_RISK, candidate.userId, {
      current: candidate.current,
      mode: 'risk',
    })
  }
}

export async function weeklySummaryCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      telegramEnabled: true,
      weeklySummaryEnabled: true,
    },
    select: {
      userId: true,
      timezone: true,
    },
  })

  for (const preference of preferences) {
    if (getWeekdayInTimezone(now, preference.timezone) !== 'Sun') continue
    if (getMinutesInTimezone(now, preference.timezone) !== 19 * 60) continue

    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const [streak, wheels, sessions] = await Promise.all([
      prisma.streak.findFirst({
        where: { userId: preference.userId, ruleKey: 'daily_checkin', endAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { current: true },
      }),
      prisma.wheelAssessment.count({
        where: { userId: preference.userId, createdAt: { gte: weekStart } },
      }),
      prisma.dailyEntry.count({
        where: { userId: preference.userId, createdAt: { gte: weekStart } },
      }),
    ])

    await notificationService.emit(NotificationEvent.WEEKLY_SUMMARY, preference.userId, {
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
    if (getMinutesInTimezone(new Date(), preferences.timezone) !== 8 * 60) continue
    await notificationService.emit(NotificationEvent.STREAK_BROKEN, candidate.userId)
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

    await notificationService.sendExpiredTaskNotice(task.userId, task.title)
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

  register(cron.schedule('0 19 * * 0', () => {
    runScheduled(weeklySummaryCron)
  }, { timezone }))

  register(cron.schedule('0 * * * *', () => {
    runScheduled(aiInactiveCron)
  }, { timezone }))

  register(cron.schedule('* * * * *', () => {
    runScheduled(streakBrokenCron)
  }, { timezone }))

  register(cron.schedule('0 * * * *', () => {
    runScheduled(subscriptionExpiringCron)
  }, { timezone }))

  register(cron.schedule('0 * * * *', () => {
    runScheduled(microTaskReminderCron)
  }, { timezone }))

  register(cron.schedule('*/10 * * * *', () => {
    runScheduled(expireMicroTasksCron)
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
