import { prisma } from '../../db/client.js'
import { sanitizeSecurityPayload } from '../../core/state-machine/securityFoundation.js'
import type { ConversionRates, DropOffPoint, FunnelStageStat, FunnelStats, JourneyItem, LiveEventItem, OverviewStats, Period, QuestionGroup, RetentionStats, TopEvent } from './types.js'
import { getPeriodRange, incrementCount, round, safeRate, toRankedCounts } from './shared.js'
import { getDistinctUserCount } from './tracking.utils.js'
import { getStringField } from './tracking.utils.js'
import { buildStageUsers } from './tracking.service.js'

export async function getOverviewStats(period: Period = '30d'): Promise<OverviewStats> {
  const { start } = getPeriodRange(period)

  const [totalUsers, newUsers, events, streakUsers] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: start } } }),
    prisma.event.findMany({
      where: { createdAt: { gte: start } },
      select: {
        userId: true,
      },
    }),
    prisma.streak.count({
      where: {
        updatedAt: { gte: start },
        current: { gt: 0 },
      },
    }),
  ])

  const activeUsers = getDistinctUserCount(events.map(event => event.userId))
  const avgActionsPerUser = activeUsers > 0 ? round(events.length / activeUsers) : 0

  return {
    totalUsers,
    activeUsers,
    newUsers,
    avgActionsPerUser,
    streakUsers,
  }
}

export async function getFunnelStats(period: Period = '30d'): Promise<FunnelStats> {
  const { start } = getPeriodRange(period)
  const events = await prisma.event.findMany({
    where: { createdAt: { gte: start } },
    select: {
      userId: true,
      type: true,
      state: true,
      payload: true,
    },
  })

  const buckets = buildStageUsers(events)
  const stageOrder: FunnelStageStat['stage'][] = ['start', 'lead_magnet', 'wheel', 'trial', 'engagement', 'purchase']

  const stages = stageOrder.map((stage, index) => {
    const users = buckets[stage].size
    const prevUsers = index === 0 ? users : buckets[stageOrder[index - 1]].size

    return {
      stage,
      users,
      conversionRate: index === 0 ? 100 : safeRate(users, prevUsers),
    }
  })

  return { stages }
}

export async function getConversionRates(period: Period = '30d'): Promise<ConversionRates> {
  const funnel = await getFunnelStats(period)
  const byStage = new Map(funnel.stages.map(stage => [stage.stage, stage.users]))

  const startUsers = byStage.get('start') ?? 0
  const leadUsers = byStage.get('lead_magnet') ?? 0
  const wheelUsers = byStage.get('wheel') ?? 0
  const trialUsers = byStage.get('trial') ?? 0
  const purchaseUsers = byStage.get('purchase') ?? 0

  return {
    startToLeadMagnet: safeRate(leadUsers, startUsers),
    leadMagnetToWheel: safeRate(wheelUsers, leadUsers),
    wheelToTrial: safeRate(trialUsers, wheelUsers),
    trialToPurchase: safeRate(purchaseUsers, trialUsers),
  }
}

export async function getDropOffPoints(period: Period = '30d'): Promise<DropOffPoint[]> {
  const funnel = await getFunnelStats(period)
  const result: DropOffPoint[] = []

  for (let index = 0; index < funnel.stages.length - 1; index += 1) {
    const current = funnel.stages[index]
    const next = funnel.stages[index + 1]
    const lostUsers = Math.max(0, current.users - next.users)

    result.push({
      from: current.stage,
      to: next.stage,
      lostUsers,
      dropOffRate: safeRate(lostUsers, current.users),
    })
  }

  return result.sort((left, right) => right.dropOffRate - left.dropOffRate)
}

export async function getTopEvents(period: Period = '30d', limit = 10): Promise<TopEvent[]> {
  const { start } = getPeriodRange(period)
  const groups = await prisma.event.groupBy({
    by: ['type'],
    where: { createdAt: { gte: start } },
    _count: { type: true },
    orderBy: { _count: { type: 'desc' } },
    take: limit,
  })

  return groups.map(group => ({
    type: group.type,
    count: group._count.type,
  }))
}

export async function getTopQuestions(period: Period = '30d', limit = 20): Promise<QuestionGroup[]> {
  const { start } = getPeriodRange(period)
  const events = await prisma.event.findMany({
    where: {
      createdAt: { gte: start },
      type: 'user_question',
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      payload: true,
    },
  })

  const groups = new Map<string, QuestionGroup>()

  for (const event of events) {
    const text = getStringField(event.payload, 'text')
    if (!text) {
      continue
    }

    const detectedIntent = getStringField(event.payload, 'detectedIntent') ?? 'unknown'
    const category = getStringField(event.payload, 'category') ?? 'unknown'
    const productContext = getStringField(event.payload, 'productContext') ?? 'general'
    const key = `${text}::${detectedIntent}::${category}::${productContext}`
    const existing = groups.get(key)

    if (existing) {
      existing.count += 1
      continue
    }

    groups.set(key, {
      text,
      count: 1,
      detectedIntent,
      category,
      productContext,
    })
  }

  return [...groups.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
}

export async function getLiveActivity(limit = 20): Promise<LiveEventItem[]> {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
                  },
      },
    },
  })

  return events.map(event => ({
    id: event.id,
    type: event.type,
    source: event.source,
    state: event.state,
    createdAt: event.createdAt.toISOString(),
    user: {
      id: event.user?.id ?? null,
      label: event.user?.firstName ?? event.user?.firstName ?? event.user?.email ?? 'Unknown user',
    },
  }))
}

export async function getUserJourney(userId: string): Promise<JourneyItem[]> {
  const events = await prisma.event.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      type: true,
      source: true,
      state: true,
      payload: true,
      createdAt: true,
    },
  })

  return events.map(event => ({
    id: event.id,
    type: event.type,
    source: event.source,
    state: event.state,
    payload: sanitizeSecurityPayload(event.payload),
    createdAt: event.createdAt.toISOString(),
  }))
}

export async function getRetentionStats(period: Period = '30d'): Promise<RetentionStats> {
  const { start } = getPeriodRange(period)
  const firstEvents = await prisma.event.findMany({
    where: {
      userId: { not: null },
      createdAt: { gte: start },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      userId: true,
      createdAt: true,
    },
  })

  const firstSeenByUser = new Map<string, Date>()
  for (const event of firstEvents) {
    if (!event.userId || firstSeenByUser.has(event.userId)) {
      continue
    }

    firstSeenByUser.set(event.userId, event.createdAt)
  }

  const userIds = [...firstSeenByUser.keys()]
  if (userIds.length === 0) {
    return { day1: 0, day3: 0, day7: 0 }
  }

  const followUpEvents = await prisma.event.findMany({
    where: {
      userId: { in: userIds },
      createdAt: { gte: start },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      userId: true,
      createdAt: true,
    },
  })

  const retained = {
    day1: new Set<string>(),
    day3: new Set<string>(),
    day7: new Set<string>(),
  }

  for (const event of followUpEvents) {
    if (!event.userId) {
      continue
    }

    const firstSeen = firstSeenByUser.get(event.userId)
    if (!firstSeen) {
      continue
    }

    const deltaDays = (event.createdAt.getTime() - firstSeen.getTime()) / 86400000
    if (deltaDays >= 1) {
      retained.day1.add(event.userId)
    }
    if (deltaDays >= 3) {
      retained.day3.add(event.userId)
    }
    if (deltaDays >= 7) {
      retained.day7.add(event.userId)
    }
  }

  return {
    day1: safeRate(retained.day1.size, userIds.length),
    day3: safeRate(retained.day3.size, userIds.length),
    day7: safeRate(retained.day7.size, userIds.length),
  }
}
