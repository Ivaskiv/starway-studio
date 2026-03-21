import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'

type Period = '7d' | '30d' | '90d'

interface PeriodRange {
  now: Date
  start: Date
}

export interface OverviewStats {
  totalUsers: number
  activeUsers: number
  newUsers: number
  avgActionsPerUser: number
  streakUsers: number
}

export interface FunnelStageStat {
  stage: 'start' | 'lead_magnet' | 'wheel' | 'trial' | 'engagement' | 'purchase'
  users: number
  conversionRate: number
}

export interface FunnelStats {
  stages: FunnelStageStat[]
}

export interface ConversionRates {
  startToLeadMagnet: number
  leadMagnetToWheel: number
  wheelToTrial: number
  trialToPurchase: number
}

export interface DropOffPoint {
  from: FunnelStageStat['stage']
  to: FunnelStageStat['stage']
  dropOffRate: number
  lostUsers: number
}

export interface QuestionGroup {
  text: string
  count: number
  detectedIntent: string
  category: string
  productContext: string
}

export interface TopEvent {
  type: string
  count: number
}

export interface LiveEventItem {
  id: string
  type: string
  source: string
  state: string | null
  createdAt: string
  user: {
    id: string | null
    label: string
  }
}

export interface JourneyItem {
  id: string
  type: string
  source: string
  state: string | null
  payload: Prisma.JsonValue
  createdAt: string
}

export interface RetentionStats {
  day1: number
  day3: number
  day7: number
}

export interface InsightCount {
  label: string
  count: number
}

export interface AIInsights {
  topIntents: InsightCount[]
  topProblems: InsightCount[]
  topCategories: InsightCount[]
}

function getPeriodRange(period: Period = '30d'): PeriodRange {
  const now = new Date()
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { now, start }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function safeRate(part: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return round((part / total) * 100)
}

function isObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getStringField(payload: Prisma.JsonValue | null, key: string): string | null {
  if (!isObject(payload)) {
    return null
  }

  const value = payload[key]
  return typeof value === 'string' ? value : null
}

function getDistinctUserCount(values: Array<string | null | undefined>): number {
  return new Set(values.filter((value): value is string => Boolean(value))).size
}

function incrementCount(map: Map<string, number>, key: string | null): void {
  if (!key) {
    return
  }

  map.set(key, (map.get(key) ?? 0) + 1)
}

function toRankedCounts(map: Map<string, number>, limit: number): InsightCount[] {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}

function isLeadMagnetState(state: string | null): boolean {
  return typeof state === 'string' && state.startsWith('lm_')
}

function hasWheelSignal(event: { type: string; payload: Prisma.JsonValue | null }): boolean {
  if (event.type.includes('wheel')) {
    return true
  }

  return getStringField(event.payload, 'productContext') === 'wheel'
}

function hasPurchaseSignal(event: { type: string; payload: Prisma.JsonValue | null }): boolean {
  return event.type.includes('purchase') || event.type.includes('subscription')
}

function buildStageUsers(events: Array<{ userId: string | null; type: string; state: string | null; payload: Prisma.JsonValue | null }>) {
  const buckets: Record<FunnelStageStat['stage'], Set<string>> = {
    start: new Set<string>(),
    lead_magnet: new Set<string>(),
    wheel: new Set<string>(),
    trial: new Set<string>(),
    engagement: new Set<string>(),
    purchase: new Set<string>(),
  }

  for (const event of events) {
    if (!event.userId) {
      continue
    }

    if (event.type === 'telegram_start' || event.type === 'web_onboarding_started' || event.type === 'miniapp_opened') {
      buckets.start.add(event.userId)
    }

    if (isLeadMagnetState(event.state) || getStringField(event.payload, 'productContext') === 'lead_magnet') {
      buckets.lead_magnet.add(event.userId)
    }

    if (hasWheelSignal(event)) {
      buckets.wheel.add(event.userId)
    }

    if (event.state === 'in_trial' || event.type.includes('trial')) {
      buckets.trial.add(event.userId)
    }

    if (
      event.type === 'telegram_morning_completed'
      || event.type === 'telegram_evening_completed'
      || event.type === 'telegram_task_completed'
      || event.type === 'ai_reply_generated'
      || event.type.includes('engagement')
    ) {
      buckets.engagement.add(event.userId)
    }

    if (hasPurchaseSignal(event)) {
      buckets.purchase.add(event.userId)
    }
  }

  return buckets
}

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
          name: true,
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
      label: event.user?.firstName ?? event.user?.name ?? event.user?.email ?? 'Unknown user',
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
    payload: event.payload,
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

export async function getAIInsights(period: Period = '30d', limit = 8): Promise<AIInsights> {
  const { start } = getPeriodRange(period)
  const questionEvents = await prisma.event.findMany({
    where: {
      type: 'user_question',
      createdAt: { gte: start },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      payload: true,
    },
  })

  const intents = new Map<string, number>()
  const problems = new Map<string, number>()
  const categories = new Map<string, number>()

  for (const event of questionEvents) {
    const intent = getStringField(event.payload, 'detectedIntent')
    const category = getStringField(event.payload, 'category')
    incrementCount(intents, intent)
    incrementCount(categories, category)

    if (intent === 'support' || intent === 'resistance' || category === 'objection') {
      incrementCount(problems, getStringField(event.payload, 'text'))
    }
  }

  return {
    topIntents: toRankedCounts(intents, limit),
    topProblems: toRankedCounts(problems, limit),
    topCategories: toRankedCounts(categories, limit),
  }
}
