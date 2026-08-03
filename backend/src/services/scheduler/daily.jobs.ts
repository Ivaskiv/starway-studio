// backend/src/services/scheduler/daily.jobs.ts — daily mentor/streak notification jobs.
// Інструкція: тут щоденні нагадування, streak-логіка, weekly summary та inactive AI checks.

import { Markup } from 'telegraf'

import { prisma, withRetry } from '../../db/client.js'
import { bot, coachBot, sendOpsTelegramMessage } from '../../lib/telegram.js'
import { NotificationEvent } from '../notifications/NotificationEvent.js'
import { notificationService } from '../notifications/NotificationService.js'
import { runWeeklyAnalysis } from '../../modules/ai-mentor/weekly-analysis/service.js'
import { getCanonicalRevenueMetrics } from '../../modules/analytics/service.js'
import { resolvePausedMentorContext } from '../notifications/mentorLifecycle.js'
import { ensureNotificationPreferenceTableAvailability, getMinutesInTimezone, getStartOfUtcDay, getWeekdayInTimezone, hasActiveSchedulerProductEntitlement, hasMentorNotificationAccess, isWithinScheduledMinute } from './common.js'
import { generateAiBriefingInsights } from './dailyBriefing.ai.js'
import { parseZoomPostReport } from '../../modules/zoom/zoomPostReport.types.js'
import { generateCoachAgentsWebDeepLink } from '../../modules/deeplinks/service.js'

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

function getCoachChatId(): string | null {
  const chatId = process.env.STARWAY_OPS_CHAT_ID?.trim() || process.env.OPS_TELEGRAM_CHAT_ID?.trim() || ''
  return chatId || null
}

function readCoachTelegramAccessId(): string {
  return String(
    process.env.COACH_TELEGRAM_ID
    ?? process.env.TEST_COACH_MENTOR_TELEGRAM_ID
    ?? '',
  ).trim()
}

async function resolveScheduledCoachUserId(): Promise<string | null> {
  const telegramUserId = readCoachTelegramAccessId()

  if (telegramUserId) {
    const coach = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramUserId },
          { telegramChatId: telegramUserId },
        ],
      },
      select: { id: true },
    })

    if (coach?.id) {
      return coach.id
    }
  }

  const fallbackCoach = await prisma.user.findFirst({
    where: {
      OR: [
        { role: 'SUPERADMIN' },
        { role: 'EXPERT' },
      ],
    },
    orderBy: [
      { role: 'desc' },
      { createdAt: 'asc' },
    ],
    select: { id: true },
  })

  return fallbackCoach?.id ?? null
}

async function resolveCoachAgentsUrl(): Promise<string> {
  const coachUserId = await resolveScheduledCoachUserId()
  if (!coachUserId) {
    throw new Error('COACH_USER_NOT_RESOLVED_FOR_SCHEDULED_AGENTS_LINK')
  }

  return generateCoachAgentsWebDeepLink(coachUserId)
}

function getKyivNow(now = new Date()): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }))
}

function startOfKyivDay(now = new Date()): Date {
  const date = getKyivNow(now)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfKyivDay(now = new Date()): Date {
  const date = startOfKyivDay(now)
  date.setDate(date.getDate() + 1)
  date.setMilliseconds(date.getMilliseconds() - 1)
  return date
}

function startOfKyivWeek(now = new Date()): Date {
  const date = getKyivNow(now)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfKyivWeek(now = new Date()): Date {
  const date = startOfKyivWeek(now)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

function startOfKyivMonth(now = new Date()): Date {
  const date = getKyivNow(now)
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfKyivMonth(now = new Date()): Date {
  const date = getKyivNow(now)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function isLastSaturdayOfMonth(now = new Date()): boolean {
  const date = getKyivNow(now)
  if (date.getDay() !== 6) return false
  const nextSaturday = new Date(date)
  nextSaturday.setDate(nextSaturday.getDate() + 7)
  return nextSaturday.getMonth() !== date.getMonth()
}

function formatKyivDate(date: Date): string {
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Kyiv',
  })
}

function formatKyivDateTime(date: Date): string {
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  })
}

function formatPercent(part: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

function formatMoney(valueCents: number, currency: string): string {
  const amount = (valueCents / 100).toFixed(currency === 'UAH' ? 0 : 2)
  return `${amount} ${currency}`
}

function safeRate(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
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

  await sendOpsTelegramMessage(reportText, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      Markup.button.callback('📝 Аналізуємо і плануємо контент', 'content_os:start_planning'),
    ]).reply_markup,
  }, {
    messageType: 'weekly_content_reminder',
    source: 'weeklyContentReminderCron',
  }).catch((error) => {
    console.error('[scheduler] weekly content reminder failed', error)
  })
}

type CurrencyAggregate = {
  currency: string
  count: number
  sumCents: number
}

type ProductRevenueAggregate = {
  code: string
  name: string
  currency: string
  count: number
  sumCents: number
}

type CoachReportButton =
  | {
      text: string
      callback_data: string
    }
  | {
      text: string
      url: string
    }

export type DailyCoachBriefingData = {
  since: Date
  monthStart: Date
  monthNow: Date
  leads: number
  testsStarted: number
  testsCompleted: number
  focusOfferShown: number
  checkoutOpenedUsers: number
  focusPaidUsers: number
  resultCounts: Array<{ label: string; count: number }>
  dailyRevenue: CurrencyAggregate[]
  monthRevenue: CurrencyAggregate[]
  dailyRevenueCents: number
  monthRevenueCents: number
  dailyPaidUsers: number
  monthPaidUsers: number
  dailyPaymentsCount: number
  monthPaymentsCount: number
  dailyRenewals: number
  monthRenewals: number
  dailyMrrCents: number
  monthMrrCents: number
  dailyArpuCents: number
  monthArpuCents: number
  activeSubscriptions: number
  completedSubscriptions: number
  renewals: number
  newUsers: number
  activeUsers: number
  inactiveUsers: number
  gone7dUsers: number
  reactivationUsers: number
  blockedTestUsers: number
  blockedOfferUsers: number
  blockedCheckoutUsers: number
  productRevenue: ProductRevenueAggregate[]
}

type WeeklyPlannerSnapshot = {
  weekStart: Date
  weekEnd: Date
  zooms: Array<{
    id: string
    scheduledAt: Date
    topic: string
    type: string
    status: string
    hasAudio: boolean
  }>
  notes: Array<{
    content: string
    createdAt: Date
  }>
  audioItems: Array<{
    createdAt: Date
    fileName: string
    folder: string | null
  }>
  contentPlanReady: boolean
  contentPlanDrafts: number
  contentPlans: number
  leads: number
  salesCount: number
  salesRevenue: CurrencyAggregate[]
}

type MonthlyStrategicSnapshot = {
  monthStart: Date
  monthEnd: Date
  revenue: CurrencyAggregate[]
  revenueTotalCents: number
  paidUsers: number
  paymentsCount: number
  avgCheckCents: number
  renewals: number
  mrrCents: number
  arpuCents: number
  funnel: {
    testsStarted: number
    testsCompleted: number
    focusOfferShown: number
    checkoutOpenedUsers: number
    focusPaidUsers: number
    testToPayRate: number
    offerToPayRate: number
  }
  audience: {
    newUsers: number
    activeUsers: number
    churnUsers: number
  }
  content: {
    zooms: number
    audios: number
    contentPlans: number
    reels: number
  }
  productRevenue: ProductRevenueAggregate[]
}

function formatRevenueSummary(rows: CurrencyAggregate[]): string {
  if (rows.length === 0) return '—'
  return rows
    .map((row) => `${row.currency} ${formatMoney(row.sumCents, row.currency)} / ${row.count}`)
    .join(' | ')
}

function formatProductRevenueSummary(rows: ProductRevenueAggregate[], limit = 3): string {
  if (rows.length === 0) return '—'
  return rows
    .sort((left, right) => right.sumCents - left.sumCents)
    .slice(0, limit)
    .map((row) => `${row.name} (${row.code}): ${formatMoney(row.sumCents, row.currency)}`)
    .join(' | ')
}

function getPaidUsersByProduct(rows: Array<{ code: string; users: number }>, productCode: string): number {
  const normalized = productCode.trim().toLowerCase()
  return rows.find((row) => row.code.trim().toLowerCase() === normalized)?.users ?? 0
}

async function loadDailyCoachBriefingData(now = new Date()): Promise<DailyCoachBriefingData> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const monthStart = startOfKyivMonth(now)
  const monthEnd = endOfKyivDay(now)

  const [dailyRevenueSnapshot, monthRevenueSnapshot, leads, testsStarted, testsCompletedRows, focusOfferShown, checkoutOpenedRows, activeSubscriptions, completedSubscriptions, newUsers, activeUsers, inactiveUsers, gone7dUsers, reactivationUsers] = await Promise.all([
    getCanonicalRevenueMetrics({ start: since, end: now }),
    getCanonicalRevenueMetrics({ start: monthStart, end: monthEnd }),
    prisma.funnelLead.count({ where: { createdAt: { gte: since, lte: now } } }),
    prisma.user.count({ where: { deletedAt: null, testStartedAt: { gte: since, lte: now } } }),
    prisma.user.findMany({
      where: { deletedAt: null, testCompletedAt: { gte: since, lte: now } },
      select: { testResultType: true },
    }),
    prisma.user.count({ where: { deletedAt: null, offerShownAt: { gte: since, lte: now } } }),
    prisma.checkoutSession.findMany({
      where: {
        createdAt: { gte: since, lte: now },
        productCode: 'focus',
      },
      select: { userId: true },
    }),
    prisma.subscription.count({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
    }),
    prisma.subscription.count({
      where: { status: { in: ['CANCELED', 'EXPIRED'] } },
    }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: since, lte: now } } }),
    prisma.user.count({
      where: {
        deletedAt: null,
        events: { some: { createdAt: { gte: since, lte: now } } },
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        events: { none: { createdAt: { gte: since, lte: now } } },
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { lt: startOfKyivWeek(now) },
        events: { none: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } },
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { lt: startOfKyivWeek(now) },
        events: { none: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } },
        NOT: {
          subscriptions: {
            some: { status: { in: ['ACTIVE', 'TRIAL'] } },
          },
        },
      },
    }),
  ])

  const checkoutOpenedUsers = new Set(checkoutOpenedRows.map((row) => row.userId)).size
  const focusPaidUsers = getPaidUsersByProduct(dailyRevenueSnapshot.paidUsersByProduct, 'focus')
  const resultCounts = testsCompletedRows.reduce<Record<string, number>>((acc, row) => {
    const key = row.testResultType?.trim() || 'невизначено'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const testsCompleted = testsCompletedRows.length
  const blockedTestUsers = Math.max(0, testsStarted - testsCompleted)
  const blockedOfferUsers = Math.max(0, focusOfferShown - checkoutOpenedUsers)
  const blockedCheckoutUsers = Math.max(0, checkoutOpenedUsers - focusPaidUsers)

  return {
    since,
    monthStart,
    monthNow: now,
    leads,
    testsStarted,
    testsCompleted,
    focusOfferShown,
    checkoutOpenedUsers,
    focusPaidUsers,
    resultCounts: Object.entries(resultCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count),
    dailyRevenue: dailyRevenueSnapshot.revenueByCurrency,
    monthRevenue: monthRevenueSnapshot.revenueByCurrency,
    dailyRevenueCents: dailyRevenueSnapshot.revenueCents,
    monthRevenueCents: monthRevenueSnapshot.revenueCents,
    dailyPaidUsers: dailyRevenueSnapshot.paidUsers,
    monthPaidUsers: monthRevenueSnapshot.paidUsers,
    dailyPaymentsCount: dailyRevenueSnapshot.paymentCount,
    monthPaymentsCount: monthRevenueSnapshot.paymentCount,
    dailyRenewals: dailyRevenueSnapshot.renewals,
    monthRenewals: monthRevenueSnapshot.renewals,
    dailyMrrCents: dailyRevenueSnapshot.mrrCents,
    monthMrrCents: monthRevenueSnapshot.mrrCents,
    dailyArpuCents: dailyRevenueSnapshot.arpuCents,
    monthArpuCents: monthRevenueSnapshot.arpuCents,
    activeSubscriptions,
    completedSubscriptions,
    renewals: monthRevenueSnapshot.renewals,
    newUsers,
    activeUsers,
    inactiveUsers,
    gone7dUsers,
    reactivationUsers,
    blockedTestUsers,
    blockedOfferUsers,
    blockedCheckoutUsers,
    productRevenue: monthRevenueSnapshot.revenueByProduct,
  }
}

async function loadWeeklyPlannerSnapshot(now = new Date()): Promise<WeeklyPlannerSnapshot> {
  const weekStart = startOfKyivWeek(now)
  const weekEnd = endOfKyivWeek(now)

  const [zooms, notes, audioItems, contentPlans, leads, revenueSnapshot] = await Promise.all([
    prisma.zoomSession.findMany({
      where: {
        scheduledAt: { gte: weekStart, lte: weekEnd },
        status: { not: 'CANCELLED' },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        scheduledAt: true,
        topic: true,
        type: true,
        status: true,
        postSessionReport: true,
      },
    }),
    prisma.note.findMany({
      where: {
        createdAt: { gte: weekStart, lte: weekEnd },
        source: { in: ['coach_bot', 'coach_content_flow'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { content: true, createdAt: true },
    }),
    prisma.runtimeOutbox.findMany({
      where: {
        scope: 'zoom_audio_ingest',
        type: 'ZOOM_AUDIO_UPLOADED',
        status: 'DONE',
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        createdAt: true,
        payload: true,
      },
    }),
    prisma.contentPlan.findMany({
      where: {
        planScope: 'WEEKLY',
        periodStart: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        status: true,
      },
    }),
    prisma.funnelLead.count({ where: { createdAt: { gte: weekStart, lte: weekEnd } } }),
    getCanonicalRevenueMetrics({ start: weekStart, end: weekEnd }),
  ])

  const zoomsWithAudio = zooms.map((zoom) => {
    const report = parseZoomPostReport(zoom.postSessionReport)
    return {
      id: zoom.id,
      scheduledAt: zoom.scheduledAt,
      topic: zoom.topic,
      type: zoom.type,
      status: zoom.status,
      hasAudio: Boolean(report?.audioFileId),
    }
  })

  const audioData = audioItems.map((item) => {
    const payload = item.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
      ? item.payload as Record<string, unknown>
      : {}
    return {
      createdAt: item.createdAt,
      fileName: String(payload.fileName ?? payload.cloudinaryPublicId ?? 'audio').trim(),
      folder: typeof payload.cloudinaryFolder === 'string' ? payload.cloudinaryFolder : null,
    }
  })

  const contentPlanReady = contentPlans.some((plan) => plan.status === 'CONFIRMED')
  const contentPlanDrafts = contentPlans.filter((plan) => plan.status === 'DRAFT').length

  return {
    weekStart,
    weekEnd,
    zooms: zoomsWithAudio,
    notes,
    audioItems: audioData,
    contentPlanReady,
    contentPlanDrafts,
    contentPlans: contentPlans.length,
    leads,
    salesCount: revenueSnapshot.paymentCount,
    salesRevenue: revenueSnapshot.revenueByCurrency,
  }
}

async function loadMonthlyStrategicSnapshot(now = new Date()): Promise<MonthlyStrategicSnapshot> {
  const monthStart = startOfKyivMonth(now)
  const monthEnd = endOfKyivMonth(now)
  const [monthRevenueSnapshot, zooms, audios, contentPlans, reels, newUsers, activeUsers, churnUsers, testsStarted, testsCompletedRows, focusOfferShown, checkoutOpenedRows] = await Promise.all([
    getCanonicalRevenueMetrics({ start: monthStart, end: monthEnd }),
    prisma.zoomSession.count({
      where: {
        scheduledAt: { gte: monthStart, lte: monthEnd },
        status: { not: 'CANCELLED' },
      },
    }),
    prisma.runtimeOutbox.count({
      where: {
        scope: 'zoom_audio_ingest',
        type: 'ZOOM_AUDIO_UPLOADED',
        status: 'DONE',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.contentPlan.count({
      where: {
        periodStart: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.contentItem.count({
      where: {
        type: 'reel',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.user.count({
      where: { deletedAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        events: { some: { createdAt: { gte: monthStart, lte: monthEnd } } },
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { lt: monthStart },
        events: { none: { createdAt: { gte: monthStart, lte: monthEnd } } },
      },
    }),
    prisma.user.count({
      where: { deletedAt: null, testStartedAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, testCompletedAt: { gte: monthStart, lte: monthEnd } },
      select: { testResultType: true },
    }),
    prisma.user.count({ where: { deletedAt: null, offerShownAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.checkoutSession.findMany({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        productCode: 'focus',
      },
      select: { userId: true },
    }),
  ])

  const focusPaidUsers = getPaidUsersByProduct(monthRevenueSnapshot.paidUsersByProduct, 'focus')
  const checkoutOpenedUsers = new Set(checkoutOpenedRows.map((row) => row.userId)).size
  const testsCompleted = testsCompletedRows.length
  const testToPayRate = safeRate(focusPaidUsers, testsCompleted)
  const offerToPayRate = safeRate(focusPaidUsers, focusOfferShown)
  const revenueTotalCents = monthRevenueSnapshot.revenueCents
  const paymentsCount = monthRevenueSnapshot.paymentCount
  const avgCheckCents = paymentsCount > 0 ? Math.round(revenueTotalCents / Math.max(1, paymentsCount)) : 0

  return {
    monthStart,
    monthEnd,
    revenue: monthRevenueSnapshot.revenueByCurrency,
    revenueTotalCents,
    paidUsers: monthRevenueSnapshot.paidUsers,
    paymentsCount,
    avgCheckCents,
    renewals: monthRevenueSnapshot.renewals,
    mrrCents: monthRevenueSnapshot.mrrCents,
    arpuCents: monthRevenueSnapshot.arpuCents,
    funnel: {
      testsStarted,
      testsCompleted,
      focusOfferShown,
      checkoutOpenedUsers,
      focusPaidUsers,
      testToPayRate,
      offerToPayRate,
    },
    audience: {
      newUsers,
      activeUsers,
      churnUsers,
    },
    content: {
      zooms,
      audios,
      contentPlans,
      reels,
    },
    productRevenue: monthRevenueSnapshot.revenueByProduct,
  }
}

function pickBestConversion(snapshot: DailyCoachBriefingData): string {
  const testConversion = safeRate(snapshot.testsCompleted, Math.max(snapshot.testsStarted, 1))
  const focusConversion = safeRate(snapshot.focusPaidUsers, Math.max(snapshot.focusOfferShown, 1))
  const checkoutConversion = safeRate(snapshot.focusPaidUsers, Math.max(snapshot.checkoutOpenedUsers, 1))
  const entries = [
    { label: 'test → completion', value: testConversion },
    { label: 'offer → payment', value: focusConversion },
    { label: 'checkout → payment', value: checkoutConversion },
  ].sort((left, right) => right.value - left.value)

  const best = entries[0]
  return `${best.label} — ${best.value}%`
}

function pickWeakestBlock(snapshot: DailyCoachBriefingData): string {
  const blocks = [
    { label: 'Тест', drop: safeRate(snapshot.blockedTestUsers, Math.max(snapshot.testsStarted, 1)), count: snapshot.blockedTestUsers },
    { label: 'Focus Offer', drop: safeRate(snapshot.blockedOfferUsers, Math.max(snapshot.focusOfferShown, 1)), count: snapshot.blockedOfferUsers },
    { label: 'Checkout', drop: safeRate(snapshot.blockedCheckoutUsers, Math.max(snapshot.checkoutOpenedUsers, 1)), count: snapshot.blockedCheckoutUsers },
  ].sort((left, right) => right.drop - left.drop)

  const weakest = blocks[0]
  return `${weakest.label} — ${weakest.count} втрат (${weakest.drop}%)`
}

function pickSlippingProduct(rows: ProductRevenueAggregate[]): string {
  if (rows.length === 0) return 'Недостатньо продажів, щоб виділити продукт.'
  const weakest = [...rows].sort((left, right) => left.sumCents - right.sumCents)[0]
  return `${weakest.name} (${weakest.code}) — ${formatMoney(weakest.sumCents, weakest.currency)}`
}

async function buildCoachDailyBriefingText(snapshot: DailyCoachBriefingData): Promise<string> {
  const aiInsights = await generateAiBriefingInsights(snapshot)
  const resultBreakdown = snapshot.resultCounts.length > 0
    ? snapshot.resultCounts.map((item) => `${item.label}: ${item.count}`).join(' | ')
    : 'невизначено: 0'
  const dailyCurrency = snapshot.dailyRevenue[0]?.currency ?? snapshot.monthRevenue[0]?.currency ?? 'EUR'
  const monthCurrency = snapshot.monthRevenue[0]?.currency ?? dailyCurrency

  return [
    `📈 <b>Coach Daily Briefing</b>`,
    `${formatKyivDate(snapshot.monthNow)}`,
    '',
    `1) <b>Funnel Overview</b>`,
    `• Нові ліди: <b>${snapshot.leads}</b>`,
    `• Нові тести: <b>${snapshot.testsStarted}</b>`,
    `• Завершені тести: <b>${snapshot.testsCompleted}</b>`,
    `• Результати тестів: ${resultBreakdown}`,
    `• Focus offer побачили: <b>${snapshot.focusOfferShown}</b>`,
    `• Checkout відкрили: <b>${snapshot.checkoutOpenedUsers}</b>`,
    `• Успішні оплати Focus: <b>${snapshot.focusPaidUsers}</b>`,
    `• Конверсія test → pay: <b>${safeRate(snapshot.focusPaidUsers, Math.max(snapshot.testsCompleted, 1))}%</b>`,
    `• Конверсія offer → pay: <b>${safeRate(snapshot.focusPaidUsers, Math.max(snapshot.focusOfferShown, 1))}%</b>`,
    '',
    `2) <b>Revenue</b>`,
    `• Оплати за добу: <b>${snapshot.dailyRevenue.reduce((sum, row) => sum + row.count, 0)}</b>`,
    `• Сума за добу: <b>${formatRevenueSummary(snapshot.dailyRevenue)}</b>`,
    `• Paid users за добу: <b>${snapshot.dailyPaidUsers}</b>`,
    `• ARPU за добу: <b>${formatMoney(snapshot.dailyArpuCents, dailyCurrency)}</b>`,
    `• MTD: <b>${formatRevenueSummary(snapshot.monthRevenue)}</b>`,
    `• Paid users за місяць: <b>${snapshot.monthPaidUsers}</b>`,
    `• ARPU за місяць: <b>${formatMoney(snapshot.monthArpuCents, monthCurrency)}</b>`,
    `• MRR: <b>${formatMoney(snapshot.monthMrrCents, monthCurrency)}</b>`,
    `• Активні підписки: <b>${snapshot.activeSubscriptions}</b>`,
    `• Завершені підписки: <b>${snapshot.completedSubscriptions}</b>`,
    `• Продовження підписок: <b>${snapshot.renewals}</b>`,
    '',
    `3) <b>User Activity</b>`,
    `• Нові користувачі: <b>${snapshot.newUsers}</b>`,
    `• Активні користувачі: <b>${snapshot.activeUsers}</b>`,
    `• Користувачі без активності: <b>${snapshot.inactiveUsers}</b>`,
    `• Користувачі, що зникли &gt;7 днів: <b>${snapshot.gone7dUsers}</b>`,
    `• Потребують реактивації: <b>${snapshot.reactivationUsers}</b>`,
    '',
    `4) <b>Funnel Blockers</b>`,
    `• Тест: ${snapshot.testsStarted} стартували / ${snapshot.testsCompleted} завершили / ${snapshot.blockedTestUsers} відпали`,
    `• Focus Offer: ${snapshot.focusOfferShown} побачили / ${snapshot.checkoutOpenedUsers} відкрили checkout / ${snapshot.blockedOfferUsers} не відкрили checkout`,
    `• Checkout: ${snapshot.checkoutOpenedUsers} відкрили / ${snapshot.focusPaidUsers} оплатили / ${snapshot.blockedCheckoutUsers} не завершили оплату`,
    '',
    `5) <b>AI Recommendations</b>${aiInsights ? '' : ' <i>(стандартний режим)</i>'}`,
    `• Найбільший вузол втрати: ${aiInsights?.weakestBlock ?? pickWeakestBlock(snapshot)}`,
    `• Найкраща конверсія: ${aiInsights?.bestConversion ?? pickBestConversion(snapshot)}`,
    `• Що потребує уваги: ${aiInsights?.attentionNeeded ?? (snapshot.blockedCheckoutUsers > snapshot.blockedOfferUsers ? 'Checkout — тут втрачаємо найбільше грошей' : 'Focus Offer — слабко веде в checkout')}`,
    `• Який продукт просідає: ${aiInsights?.slippingProduct ?? pickSlippingProduct(snapshot.productRevenue)}`,
    '',
    `6) <b>Coach Prompt</b>`,
    aiInsights?.coachPrompt ?? 'Що робимо сьогодні?',
  ].join('\n')
}

function buildCoachWeeklyReminderText(title: string, snapshot: WeeklyPlannerSnapshot): string {
  const zoomLines = snapshot.zooms.length > 0
    ? snapshot.zooms.slice(0, 5).map((zoom) => {
      const time = formatKyivDateTime(zoom.scheduledAt)
      const audioBadge = zoom.hasAudio ? ' 🎧' : ''
      return `• ${time} — ${escapeHtml(zoom.topic)} (${escapeHtml(zoom.type)}, ${escapeHtml(zoom.status)})${audioBadge}`
    }).join('\n')
    : '• Zoom-сесій цього тижня ще немає'

  const noteLines = snapshot.notes.length > 0
    ? snapshot.notes.slice(0, 3).map((note) => `• ${formatKyivDateTime(note.createdAt)} — ${escapeHtml(note.content.slice(0, 140))}`).join('\n')
    : '• Нових нотаток немає'

  const audioLines = snapshot.audioItems.length > 0
    ? snapshot.audioItems.slice(0, 3).map((audio) => `• ${formatKyivDateTime(audio.createdAt)} — ${escapeHtml(audio.fileName)}${audio.folder ? ` (${escapeHtml(audio.folder)})` : ''}`).join('\n')
    : '• Нових аудіо немає'

  return [
    `🧭 <b>${escapeHtml(title)}</b>`,
    '',
    `• Zoom-сесії тижня: <b>${snapshot.zooms.length}</b>`,
    `• Нові нотатки: <b>${snapshot.notes.length}</b>`,
    `• Нові аудіо: <b>${snapshot.audioItems.length}</b>`,
    `• Готовність контенту: <b>${snapshot.contentPlanReady ? 'підтверджено' : 'ще не готово'}</b>`,
    `• Планів тижня: <b>${snapshot.contentPlans}</b> (draft: ${snapshot.contentPlanDrafts})`,
    '',
    '📅 <b>Zoom цього тижня</b>',
    zoomLines,
    '',
    '📝 <b>Нові нотатки</b>',
    noteLines,
    '',
    '🎧 <b>Нові аудіо</b>',
    audioLines,
    '',
    'CTA: /planner',
  ].join('\n')
}

function buildCoachMonthlyStrategicText(snapshot: MonthlyStrategicSnapshot): string {
  const bestProduct = snapshot.productRevenue.length > 0
    ? [...snapshot.productRevenue].sort((left, right) => right.sumCents - left.sumCents)[0]
    : null
  const weakestProduct = snapshot.productRevenue.length > 0
    ? [...snapshot.productRevenue].sort((left, right) => left.sumCents - right.sumCents)[0]
    : null
  const testDrop = Math.max(0, snapshot.funnel.testsStarted - snapshot.funnel.testsCompleted)
  const offerDrop = Math.max(0, snapshot.funnel.focusOfferShown - snapshot.funnel.checkoutOpenedUsers)
  const checkoutDrop = Math.max(0, snapshot.funnel.checkoutOpenedUsers - snapshot.funnel.focusPaidUsers)
  const bottleneck = [
    { label: 'Test', drop: safeRate(testDrop, Math.max(snapshot.funnel.testsStarted, 1)) },
    { label: 'Focus', drop: safeRate(offerDrop, Math.max(snapshot.funnel.focusOfferShown, 1)) },
    { label: 'Checkout', drop: safeRate(checkoutDrop, Math.max(snapshot.funnel.checkoutOpenedUsers, 1)) },
  ].sort((left, right) => right.drop - left.drop)[0]
  const currency = snapshot.revenue[0]?.currency ?? 'EUR'

  return [
    `📊 <b>Monthly Strategic Planner</b>`,
    `${formatKyivDate(snapshot.monthStart)} — ${formatKyivDate(snapshot.monthEnd)}`,
    '',
    `1) <b>Revenue</b>`,
    `• Місячний дохід: <b>${formatRevenueSummary(snapshot.revenue)}</b>`,
    `• Кількість оплат: <b>${snapshot.paymentsCount}</b>`,
    `• Paid users: <b>${snapshot.paidUsers}</b>`,
    `• Середній чек: <b>${snapshot.avgCheckCents > 0 ? formatMoney(snapshot.avgCheckCents, snapshot.revenue[0]?.currency ?? 'EUR') : '—'}</b>`,
    `• ARPU: <b>${formatMoney(snapshot.arpuCents, currency)}</b>`,
    `• MRR: <b>${formatMoney(snapshot.mrrCents, currency)}</b>`,
    `• Продовження підписок: <b>${snapshot.renewals}</b>`,
    `• Топ продуктів: <b>${escapeHtml(formatProductRevenueSummary(snapshot.productRevenue, 3))}</b>`,
    '',
    `2) <b>Funnel</b>`,
    `• Тести: ${snapshot.funnel.testsStarted}`,
    `• Завершили тест: ${snapshot.funnel.testsCompleted}`,
    `• Focus побачили: ${snapshot.funnel.focusOfferShown}`,
    `• Checkout відкрили: ${snapshot.funnel.checkoutOpenedUsers}`,
    `• Оплатили: ${snapshot.funnel.focusPaidUsers}`,
    `• Конверсія test → pay: ${snapshot.funnel.testToPayRate}%`,
    `• Конверсія offer → pay: ${snapshot.funnel.offerToPayRate}%`,
    '',
    `3) <b>Audience</b>`,
    `• Приріст бази: <b>${snapshot.audience.newUsers}</b>`,
    `• Активні користувачі: <b>${snapshot.audience.activeUsers}</b>`,
    `• Відтік: <b>${snapshot.audience.churnUsers}</b>`,
    '',
    `4) <b>Content</b>`,
    `• Zoom: <b>${snapshot.content.zooms}</b>`,
    `• Аудіо: <b>${snapshot.content.audios}</b>`,
    `• Контент-плани: <b>${snapshot.content.contentPlans}</b>`,
    `• Reels: <b>${snapshot.content.reels}</b>`,
    '',
    `5) <b>Strategic Recommendations</b>`,
    `• Що масштабувати: ${bestProduct ? `${bestProduct.name} (${formatMoney(bestProduct.sumCents, bestProduct.currency ?? 'EUR')})` : 'Немає даних по продуктам'}`,
    `• Що прибрати: ${weakestProduct ? `${weakestProduct.name} (${formatMoney(weakestProduct.sumCents, weakestProduct.currency ?? 'EUR')})` : 'Немає даних по продуктам'}`,
    `• Де вузьке місце: ${bottleneck.label} (${bottleneck.drop}%)`,
    `• Де втрачено грошей: ${formatMoney(Math.max(0, checkoutDrop) * Math.max(1, snapshot.avgCheckCents), snapshot.revenue[0]?.currency ?? 'EUR')}`,
    '',
    `6) <b>Planning CTA</b>`,
    `Створити план місяця / Запустити планер / Переглянути аналітику`,
  ].join('\n')
}

async function sendCoachPanelReport(
  text: string,
  buttons: CoachReportButton[][],
): Promise<void> {
  const chatId = getCoachChatId()
  if (!chatId) {
    throw new Error('coach_chat_id_missing')
  }

  const keyboard = buttons.map((row) => row.map((button) => {
    return 'url' in button
      ? Markup.button.url(button.text, button.url)
      : Markup.button.callback(button.text, button.callback_data)
  }))

  await coachBot.telegram.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
  })
}

export async function coachDailyBriefingCron(): Promise<void> {
  const snapshot = await loadDailyCoachBriefingData()
  const text = await buildCoachDailyBriefingText(snapshot)
  const agentsUrl = await resolveCoachAgentsUrl()
  await sendCoachPanelReport(text, [
    [
      { text: 'Контент', callback_data: 'coach-content:planner' },
      { text: 'Продажі', callback_data: 'coach-content:payments' },
      { text: 'Zoom', callback_data: 'coach:schedule' },
    ],
    [
      { text: 'Аналітика', callback_data: 'coach:analytics' },
      { text: 'Планер', callback_data: 'content_os:start_planning' },
    ],
    [
      { text: 'Агенти', url: agentsUrl },
    ],
  ])
}

export async function coachWeeklyPlannerTuesdayCron(): Promise<void> {
  const snapshot = await loadWeeklyPlannerSnapshot()
  const text = buildCoachWeeklyReminderText('Час оновити контент-план тижня.', snapshot)
  await sendCoachPanelReport(text, [
    [{ text: '🧭 /planner', callback_data: 'coach-content:planner' }],
  ])
}

export async function coachWeeklyPlannerSaturdayCron(): Promise<void> {
  const snapshot = await loadWeeklyPlannerSnapshot()
  const weekResults = [
    `Ліди: ${snapshot.leads}`,
    `Продажі: ${snapshot.salesCount}`,
    `Сума: ${formatRevenueSummary(snapshot.salesRevenue)}`,
    `Zoom: ${snapshot.zooms.length}`,
    `Контент: ${snapshot.contentPlanReady ? 'готово' : 'ще в роботі'}`,
  ].join('\n• ')
  const text = [
    '🧭 <b>Тиждень завершується. Підготуй наступний.</b>',
    '',
    `• ${weekResults}`,
    '',
    'CTA: /planner',
  ].join('\n')
  await sendCoachPanelReport(text, [
    [{ text: '🧭 /planner', callback_data: 'coach-content:planner' }],
  ])
}

export async function coachMonthlyStrategicPlannerCron(): Promise<void> {
  if (!isLastSaturdayOfMonth()) return
  const snapshot = await loadMonthlyStrategicSnapshot()
  const text = buildCoachMonthlyStrategicText(snapshot)
  const agentsUrl = await resolveCoachAgentsUrl()
  await sendCoachPanelReport(text, [
    [
      { text: 'Створити план місяця', callback_data: 'coach-content:monthly' },
    ],
    [
      { text: 'Запустити планер', callback_data: 'coach-content:planner' },
      { text: 'Переглянути аналітику', callback_data: 'coach:analytics' },
    ],
    [
      { text: 'Агенти', url: agentsUrl },
    ],
  ])
}

export async function dailyMorningCron(): Promise<void> {
  if (!(await ensureNotificationPreferenceTableAvailability())) return
  const now = new Date()
  const preferences = await withRetry(() => prisma.notificationPreference.findMany({
    where: {
      telegramEnabled: true,
      dailyMorningEnabled: true,
    },
    select: {
      userId: true,
      dailyMorningTime: true,
      timezone: true,
    },
  }))

  await Promise.all(preferences.map(async (preference) => {
    if (!isWithinScheduledMinute(now, preference.timezone, preference.dailyMorningTime)) return
    if (!(await hasActiveSchedulerProductEntitlement(preference.userId, ['stankey', 'absystem']))) return
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
  const preferences = await withRetry(() => prisma.notificationPreference.findMany({
    where: {
      telegramEnabled: true,
      dailyEveningEnabled: true,
    },
    select: {
      userId: true,
      dailyEveningTime: true,
      timezone: true,
    },
  }))

  await Promise.all(preferences.map(async (preference) => {
    if (!isWithinScheduledMinute(now, preference.timezone, preference.dailyEveningTime)) return
    if (!(await hasActiveSchedulerProductEntitlement(preference.userId, ['stankey', 'absystem']))) return
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
    if (!(await hasActiveSchedulerProductEntitlement(candidate.userId, ['absystem']))) continue
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
    if (!preference?.telegramEnabled || !preference.weeklySummaryEnabled) continue
    if (!(await hasMentorNotificationAccess(candidate.id))) continue
    if (!(await hasActiveSchedulerProductEntitlement(candidate.id, ['stankey', 'absystem']))) continue

    const generated = await runWeeklyAnalysis(candidate.id)
    if (!generated) continue

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
    if (!(await hasActiveSchedulerProductEntitlement(candidate.userId, ['absystem']))) continue
    if (getMinutesInTimezone(new Date(), preferences.timezone) !== 8 * 60) continue
    await notificationService.emit(NotificationEvent.STREAK_BROKEN, candidate.userId)
  }
}
