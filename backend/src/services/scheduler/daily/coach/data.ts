// backend/src/services/scheduler/daily.jobs.ts — daily mentor/streak notification jobs.
// Інструкція: тут щоденні нагадування, streak-логіка, weekly summary та inactive AI checks.


import { prisma } from '../../../../db/client.js'
import { getCanonicalRevenueMetrics } from '../../../../modules/analytics/service.js'
import { parseZoomPostReport } from '../../../../modules/zoom/reports/zoomPostReport.types.js'
import {
endOfKyivDay,
endOfKyivMonth,
endOfKyivWeek,
formatMoney,
safeRate,
startOfKyivMonth,
startOfKyivWeek,
} from '../shared.js'

export type CurrencyAggregate = {
  currency: string
  count: number
  sumCents: number
}

export type ProductRevenueAggregate = {
  code: string
  name: string
  currency: string
  count: number
  sumCents: number
}

export type CoachReportButton =
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

export type WeeklyPlannerSnapshot = {
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

export type MonthlyStrategicSnapshot = {
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

export function formatRevenueSummary(rows: CurrencyAggregate[]): string {
  if (rows.length === 0) return '—'
  return rows
    .map((row) => `${row.currency} ${formatMoney(row.sumCents, row.currency)} / ${row.count}`)
    .join(' | ')
}

export function formatProductRevenueSummary(rows: ProductRevenueAggregate[], limit = 3): string {
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

export async function loadDailyCoachBriefingData(now = new Date()): Promise<DailyCoachBriefingData> {
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

export async function loadWeeklyPlannerSnapshot(now = new Date()): Promise<WeeklyPlannerSnapshot> {
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

export async function loadMonthlyStrategicSnapshot(now = new Date()): Promise<MonthlyStrategicSnapshot> {
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
