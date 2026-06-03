// backend/src/services/scheduler/daily.jobs.ts — daily mentor/streak notification jobs.
// Інструкція: тут щоденні нагадування, streak-логіка, weekly summary та inactive AI checks.

import { Markup } from 'telegraf'

import { prisma } from '../../db/client.js'
import { bot } from '../../lib/telegram.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { notificationService } from '../notifications/NotificationService.js'
import { runWeeklyAnalysis } from '../../modules/ai-mentor/weekly-analysis/service.js'
import { resolvePausedMentorContext } from '../notifications/mentorLifecycle.js'
import { ensureNotificationPreferenceTableAvailability, getMinutesInTimezone, getStartOfUtcDay, getWeekdayInTimezone, hasMentorNotificationAccess, isWithinScheduledMinute } from './common.js'

function startOfWeekMonday(date = new Date()): Date {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function endOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
  })
}

function formatDateTimeShort(date: Date): string {
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function readWeeklyContentStats(weekStart: Date, weekEnd: Date, nextWeekStart: Date, nextWeekEnd: Date) {
  const [newSubscriptions, focusClicks, testUsers, zoomSessions, weeklyProof] = await Promise.all([
    prisma.productSubscription.count({
      where: {
        paidAt: { gte: weekStart, lte: weekEnd },
        product: { code: 'focus' },
      },
    }),
    prisma.user.count({
      where: {
        offerShownAt: { gte: weekStart, lte: weekEnd },
        testCompletedAt: { not: null },
      },
    }),
    prisma.user.findMany({
      where: {
        testCompletedAt: { gte: weekStart, lte: weekEnd },
        testResultType: { not: null },
      },
      select: {
        testResultType: true,
      },
    }),
    prisma.zoomSession.findMany({
      where: {
        scheduledAt: {
          gte: nextWeekStart,
          lte: nextWeekEnd,
        },
        status: { in: ['SCHEDULED', 'ACTIVE'] },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        topic: true,
        scheduledAt: true,
        type: true,
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    }),
    prisma.contentItem.findMany({
      where: {
        topic: { startsWith: `weekly-proof:${weekStart.toISOString().slice(0, 10)}` },
        status: 'approved',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        type: true,
        content: true,
      },
      take: 5,
    }),
  ])

  const testResultCounts = testUsers.reduce<Record<string, number>>((acc, item) => {
    const key = item.testResultType?.trim() || 'невизначено'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const [dominantType, dominantCount] = Object.entries(testResultCounts).sort((a, b) => b[1] - a[1])[0] ?? ['невизначено', 0]

  const zoomSchedule = zoomSessions.length > 0
    ? zoomSessions.map((session) => `• ${formatDateTimeShort(session.scheduledAt)} — ${session.topic} (${session.type}, ${session._count.attendees} учасників)`).join('\n')
    : '• Zoom не заплановано'

  const weeklyProofSummary = weeklyProof.length > 0
    ? weeklyProof.map((item) => `• ${escapeHtml(item.type)}: ${escapeHtml(String(item.content).slice(0, 180))}`).join('\n')
    : '• Немає approved weekly-proof артефактів'

  return {
    newSubscriptions,
    focusClicks,
    dominantType,
    dominantCount,
    zoomSchedule,
    weeklyProofSummary,
  }
}

export async function weeklyContentReminderCron(): Promise<void> {
  const coachChatId = process.env.STARWAY_OPS_CHAT_ID?.trim() || process.env.OPS_TELEGRAM_CHAT_ID?.trim()
  if (!coachChatId) return

  const now = new Date()
  const currentWeekStart = startOfWeekMonday(now)
  const lastWeekStart = addDays(currentWeekStart, -7)
  const lastWeekEnd = endOfDay(addDays(lastWeekStart, 6))
  const nextWeekStart = addDays(currentWeekStart, 7)
  const nextWeekEnd = endOfDay(addDays(nextWeekStart, 6))

  const stats = await readWeeklyContentStats(lastWeekStart, lastWeekEnd, nextWeekStart, nextWeekEnd)

  const reportText = [
    '📊 <b>Авто-звіт за тиждень</b>',
    `${formatShortDate(lastWeekStart)} — ${formatShortDate(lastWeekEnd)}`,
    '',
    `💳 Нові підписки ФОКУС: <b>${stats.newSubscriptions}</b>`,
    `👆 Кліки «Хочу у ФОКУС»: <b>${stats.focusClicks}</b>`,
    `🧪 Домінуючий тип тесту: <b>${escapeHtml(stats.dominantType)}</b> (${stats.dominantCount} осіб)`,
    '',
    '📅 <b>Zoom наступного тижня:</b>',
    stats.zoomSchedule,
    '',
    '📝 <b>Weekly proof:</b>',
    stats.weeklyProofSummary,
    '',
    '─────────────────',
    'Натисни кнопку нижче, щоб почати планування 👇',
  ].join('\n')

  await bot.telegram.sendMessage(coachChatId, reportText, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      Markup.button.callback('📝 Аналізуємо і плануємо контент', 'content_os:start_planning'),
    ]).reply_markup,
  }).catch((error) => {
    console.error('[scheduler] weekly content reminder failed', error)
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

  const mentors = await prisma.userAiMentor.findMany({
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
