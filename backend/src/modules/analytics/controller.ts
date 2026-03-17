import type { Request, Response } from 'express'
import { prisma } from '../../db/client.js'

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
