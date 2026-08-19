// backend/src/services/scheduler/daily.jobs.ts — daily mentor/streak notification jobs.
// Інструкція: тут щоденні нагадування, streak-логіка, weekly summary та inactive AI checks.

import { Markup } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { sendOpsTelegramMessage } from '../../../lib/telegram.js'
import {
addDays,
endOfDay,
escapeHtml,
formatDateTimeShort,
formatShortDate,
startOfWeekMonday,
} from './shared.js'

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

  await sendOpsTelegramMessage(reportText, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      Markup.button.callback('Аналізуємо і плануємо контент', 'content_os:start_planning'),
    ]).reply_markup,
  }, {
    messageType: 'weekly_content_reminder',
    source: 'weeklyContentReminderCron',
  }).catch((error) => {
    console.error('[scheduler] weekly content reminder failed', error)
  })
}
