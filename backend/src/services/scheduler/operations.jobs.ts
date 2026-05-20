// backend/src/services/scheduler/operations.jobs.ts — operational, microtask, web-map jobs.
// Інструкція: тут операційні задачі: missed days, microtasks, nudges, subscription та web-map.

import { prisma } from '../../db/client.js'
import { cacheDel } from '../../lib/cache/index.js'
import { invalidateDailyHistoryCache, invalidateDayCache } from '../../lib/db/dailyCache.js'
import { sendDedupedTelegramMessage } from '../../lib/telegram.js'
import { buildNotificationContent } from '../../lib/notifications/templates.js'
import { processScheduledNudges } from '../../modules/telegram-mentor/services/nudge.service.js'
import { runWeeklyAnalysis } from '../../modules/ai-mentor/weekly-analysis/service.js'
import { runMonthlyAnalysis } from '../../modules/web-map/web-map.service.js'
import { syncLifecycleForUser } from '../../modules/flow-control/service.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { resolvePausedMentorContext } from '../notifications/mentorLifecycle.js'
import { notificationService } from '../notifications/NotificationService.js'
import { notificationRecordService } from '../notifications/services/NotificationRecordService.js'
import { ensureNotificationPreferenceTableAvailability, getEndOfUtcDay, getMinutesInTimezone, getStartOfUtcDay, hasMentorNotificationAccess, isWithinScheduledMinute } from './common.js'

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
    await syncLifecycleForUser(user.id)
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
