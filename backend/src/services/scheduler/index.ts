import cron, { type ScheduledTask } from 'node-cron'

import { prisma } from '../../db/client.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { notificationService } from '../notifications/NotificationService.js'
import { startNotificationWorker, stopNotificationWorker } from '../notifications/worker.js'

const scheduledTasks: ScheduledTask[] = []
let schedulerStarted = false

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

export async function dailyMorningCron(): Promise<void> {
  const now = new Date()
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      telegramEnabled: true,
      aiRemindersEnabled: true,
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
  const now = new Date()
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      telegramEnabled: true,
      aiRemindersEnabled: true,
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
              streakAlertsEnabled: true,
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
    if (!preferences?.telegramEnabled || !preferences.streakAlertsEnabled) continue
    if (candidate.user.dailyEntries.length > 0) continue

    await notificationService.emit(NotificationEvent.STREAK_RISK, candidate.userId, {
      current: candidate.current,
      mode: 'risk',
    })
  }
}

export async function weeklySummaryCron(): Promise<void> {
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
              streakAlertsEnabled: true,
              timezone: true,
            },
          },
        },
      },
    },
  })

  for (const candidate of candidates) {
    const preferences = candidate.user.notificationPreference
    if (!preferences?.telegramEnabled || !preferences.streakAlertsEnabled) continue
    if (getMinutesInTimezone(new Date(), preferences.timezone) !== 8 * 60) continue
    await notificationService.emit(NotificationEvent.STREAK_BROKEN, candidate.userId)
  }
}

export function startScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true

  const timezone = process.env.TZ || 'Europe/Kyiv'
  startNotificationWorker()

  register(cron.schedule('* * * * *', () => {
    setImmediate(() => dailyMorningCron().catch(console.error))
  }, { timezone }))

  register(cron.schedule('* * * * *', () => {
    setImmediate(() => dailyEveningCron().catch(console.error))
  }, { timezone }))

  register(cron.schedule('0 * * * *', () => {
    setImmediate(() => streakRiskCron().catch(console.error))
  }, { timezone }))

  register(cron.schedule('0 19 * * 0', () => {
    setImmediate(() => weeklySummaryCron().catch(console.error))
  }, { timezone }))

  register(cron.schedule('0 * * * *', () => {
    setImmediate(() => aiInactiveCron().catch(console.error))
  }, { timezone }))

  register(cron.schedule('* * * * *', () => {
    setImmediate(() => streakBrokenCron().catch(console.error))
  }, { timezone }))
}

export function stopScheduler() {
  if (!schedulerStarted) return
  for (const task of scheduledTasks.splice(0)) {
    task.stop()
    task.destroy()
  }
  stopNotificationWorker()
  schedulerStarted = false
}
