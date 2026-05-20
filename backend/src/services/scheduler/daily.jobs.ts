// backend/src/services/scheduler/daily.jobs.ts — daily mentor/streak notification jobs.
// Інструкція: тут щоденні нагадування, streak-логіка, weekly summary та inactive AI checks.

import { prisma } from '../../db/client.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { notificationService } from '../notifications/NotificationService.js'
import { runWeeklyAnalysis } from '../../modules/ai-mentor/weekly-analysis/service.js'
import { resolvePausedMentorContext } from '../notifications/mentorLifecycle.js'
import { ensureNotificationPreferenceTableAvailability, getMinutesInTimezone, getStartOfUtcDay, getWeekdayInTimezone, hasMentorNotificationAccess, isWithinScheduledMinute } from './common.js'

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
