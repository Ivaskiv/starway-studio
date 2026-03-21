import type { Request, Response } from 'express'
import { prisma } from '../../db/client.js'
import { BANNER_SEGMENTS, generateBanners } from '../banners/banner.service.js'
import {
  getAIInsights,
  getConversionRates,
  getDropOffPoints,
  getFunnelStats,
  getLiveActivity,
  getOverviewStats,
  getRetentionStats,
  getTopEvents,
  getTopQuestions,
  getUserJourney,
} from './service.js'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function computeChange(current: number, previous: number): { change: string; trend: 'up' | 'down' | 'stable' } {
  if (previous === 0 && current === 0) return { change: '0%', trend: 'stable' }
  if (previous === 0) return { change: '100%', trend: 'up' }
  const diff = current - previous
  const percent = Math.round((diff / previous) * 100)
  if (percent === 0) return { change: '0%', trend: 'stable' }
  return { change: `${Math.abs(percent)}%`, trend: percent > 0 ? 'up' : 'down' }
}

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const productId = (req as any).productId as string | undefined
    const periodParam = String(req.query.period ?? '30d')
    const periodDays = periodParam === '7d' ? 7 : periodParam === '90d' ? 90 : 30
    const now = new Date()
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    const prevStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000)
    const prevEnd = periodStart

    const userWhere = productId ? { deletedAt: null, productId } : { deletedAt: null }
    const totalUsers = await prisma.user.count({ where: userWhere })
    const newUsersDuringPeriod = await prisma.user.count({
      where: { ...userWhere, createdAt: { gte: periodStart } },
    })
    const prevNewUsers = await prisma.user.count({
      where: { ...userWhere, createdAt: { gte: prevStart, lt: prevEnd } },
    })

    const funnelWhere = productId ? { deletedAt: null, ownerId: (req as any).user?.id, id: productId } : { deletedAt: null }
    const totalFunnels = await prisma.funnel.count({ where: funnelWhere })
    const activeFunnels = await prisma.funnel.count({
      where: { ...funnelWhere, isActive: true },
    })

    const revenueWhere = productId ? { productId } : undefined
    const revenueSum = await prisma.purchaseHistory.aggregate({ _sum: { amountCents: true }, where: revenueWhere })
    const totalRevenueCents = revenueSum._sum.amountCents ?? 0

    const funnels = await prisma.funnel.findMany({
      where: { deletedAt: null },
      take: 3,
      orderBy: { purchaseHistories: { _count: 'desc' } },
      include: { purchaseHistories: true },
    })

    const funnelsPayload = funnels.map((funnel) => {
      const conversions = funnel.purchaseHistories.length
      const visitors = conversions * 15 + 120
      return {
        name: funnel.name ?? funnel.slug,
        visitors,
        conversions,
        rate: visitors === 0 ? 0 : Math.min(100, Math.round((conversions / visitors) * 100)),
      }
    })

    const recentPurchases = await prisma.purchaseHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: true, funnel: true },
    })

    const recentActivity = recentPurchases.map((purchase) => ({
      user: purchase.user?.name ?? purchase.user?.email ?? 'Невідомий',
      action: purchase.funnel ? `Subscription to ${purchase.funnel.name}` : 'Purchase',
      time: purchase.createdAt.toISOString(),
      type: 'purchase' as const,
    }))

    const { change: userChange, trend: userTrend } = computeChange(newUsersDuringPeriod, prevNewUsers)
    const { change: funnelChange, trend: funnelTrend } = computeChange(activeFunnels, totalFunnels - activeFunnels)

    const stats = [
      {
        label: 'Активних користувачів',
        value: totalUsers,
        change: userChange,
        trend: userTrend,
        color: '#38bdf8',
      },
      {
        label: 'Активних воронок',
        value: activeFunnels,
        change: funnelChange,
        trend: funnelTrend,
        color: '#a855f7',
      },
      {
        label: 'Доходу (EUR)',
        value: `€${(totalRevenueCents / 100).toFixed(2)}`,
        change: '5%',
        trend: 'up' as const,
        color: '#0a2446',
      },
      {
        label: 'Конверсія',
        value: `${Math.min(100, Math.round((funnelsPayload.reduce((acc, f) => acc + f.conversions, 0) / Math.max(1, funnelsPayload.reduce((acc, f) => acc + f.visitors, 0))) * 100))}%`,
        change: '1%',
        trend: 'up' as const,
        color: '#22c55e',
      },
    ]

    return res.json({ stats, funnels: funnelsPayload, recentActivity })
  } catch (error: any) {
    console.error('Analytics stats error', error)
    if (error?.code === 'P1001') {
      const fallbackStats = [
        { label: 'Активних користувачів', value: 0, change: '0%', trend: 'stable', color: '#38bdf8' },
        { label: 'Активних воронок', value: 0, change: '0%', trend: 'stable', color: '#a855f7' },
        { label: 'Доходу (EUR)', value: '€0.00', change: '0%', trend: 'stable', color: '#0a2446' },
        { label: 'Конверсія', value: '0%', change: '0%', trend: 'stable', color: '#22c55e' },
      ]
      return res.json({
        stats: fallbackStats,
        funnels: [],
        recentActivity: [],
        warning: 'analytics_db_unreachable',
      })
    }
    return res.status(500).json({ error: 'analytics_stats_failed' })
  }
}

type AnalyticsPeriod = '7d' | '30d' | '90d'

function getRequestedPeriod(value: unknown): AnalyticsPeriod {
  return value === '7d' || value === '90d' ? value : '30d'
}

function getRequestedLimit(value: unknown, fallback: number): number {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return fallback
  }

  return clamp(parsed, 1, 100)
}

export async function getOverview(req: Request, res: Response) {
  try {
    const period = getRequestedPeriod(req.query.period)
    const [overview, topEvents] = await Promise.all([
      getOverviewStats(period),
      getTopEvents(period, 5),
    ])

    return res.json({
      ...overview,
      topEvents,
    })
  } catch (error) {
    console.error('Analytics overview error', error)
    return res.status(500).json({ error: 'analytics_overview_failed' })
  }
}

export async function getFunnel(req: Request, res: Response) {
  try {
    const period = getRequestedPeriod(req.query.period)
    const [funnel, conversions, dropOffs] = await Promise.all([
      getFunnelStats(period),
      getConversionRates(period),
      getDropOffPoints(period),
    ])

    return res.json({
      ...funnel,
      conversions,
      dropOffs,
    })
  } catch (error) {
    console.error('Analytics funnel error', error)
    return res.status(500).json({ error: 'analytics_funnel_failed' })
  }
}

export async function getQuestions(req: Request, res: Response) {
  try {
    const period = getRequestedPeriod(req.query.period)
    const limit = getRequestedLimit(req.query.limit, 20)
    const questions = await getTopQuestions(period, limit)
    return res.json({ questions })
  } catch (error) {
    console.error('Analytics questions error', error)
    return res.status(500).json({ error: 'analytics_questions_failed' })
  }
}

export async function getRetention(req: Request, res: Response) {
  try {
    const period = getRequestedPeriod(req.query.period)
    const retention = await getRetentionStats(period)
    return res.json(retention)
  } catch (error) {
    console.error('Analytics retention error', error)
    return res.status(500).json({ error: 'analytics_retention_failed' })
  }
}

export async function getInsights(req: Request, res: Response) {
  try {
    const period = getRequestedPeriod(req.query.period)
    const limit = getRequestedLimit(req.query.limit, 8)
    const insights = await getAIInsights(period, limit)
    return res.json(insights)
  } catch (error) {
    console.error('Analytics insights error', error)
    return res.status(500).json({ error: 'analytics_insights_failed' })
  }
}

export async function getLive(req: Request, res: Response) {
  try {
    const limit = getRequestedLimit(req.query.limit, 20)
    const events = await getLiveActivity(limit)
    return res.json({ events })
  } catch (error) {
    console.error('Analytics live error', error)
    return res.status(500).json({ error: 'analytics_live_failed' })
  }
}

export async function getJourney(req: Request, res: Response) {
  try {
    const userId = String(req.params.userId ?? '')
    if (!userId) {
      return res.status(400).json({ error: 'user_id_required' })
    }

    const journey = await getUserJourney(userId)
    return res.json({ journey })
  } catch (error) {
    console.error('Analytics journey error', error)
    return res.status(500).json({ error: 'analytics_journey_failed' })
  }
}

type ProductOwnerRequest = Request & {
  productId?: string
  user?: {
    id: string
  }
}

export async function getBannerGenerations(req: Request, res: Response) {
  try {
    const banners = await prisma.bannerGeneration.findMany({
      orderBy: { createdAt: 'desc' },
      take: 18,
    })

    const grouped = BANNER_SEGMENTS.reduce<Record<string, typeof banners>>((acc, segment) => {
      acc[segment] = banners.filter(banner => banner.segment === segment)
      return acc
    }, {})

    return res.json({ banners: grouped })
  } catch (error) {
    console.error('Analytics banners error', error)
    return res.status(500).json({ error: 'analytics_banners_failed' })
  }
}

export async function generateBannerGenerations(req: Request, res: Response) {
  try {
    const request = req as ProductOwnerRequest
    void request.productId
    void request.user

    const period = req.body && typeof req.body === 'object' && 'period' in req.body && req.body.period === 'monthly'
      ? 'monthly'
      : 'weekly'

    await generateBanners(period)
    return res.json({ ok: true, period })
  } catch (error) {
    console.error('Analytics generate banners error', error)
    return res.status(500).json({ error: 'analytics_generate_banners_failed' })
  }
}
