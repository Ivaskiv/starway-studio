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
  trackingIntegrity?: TrackingIntegrity | null
}

export interface TrackingIntegrity {
  isDisconnected: boolean
  coreProblem: string
  weakestStep: 'lead_magnet_to_app_entry' | 'lead_magnet_to_wheel' | 'wheel_to_trial' | 'trial_to_engagement' | 'trial_to_purchase'
  conversion: number
  sampleSize: number
  reasons: string[]
  actions: string[]
  worstSource: string | null
  sourceConversion: number
  leadUsers: number
  appUsers: number
  matchedUsers: number
  unlinkedEvents: number
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

function getTrackingPayload(payload: Prisma.JsonValue | null): Prisma.JsonObject | null {
  if (!isObject(payload)) {
    return null
  }

  const tracking = 'tracking' in payload ? payload.tracking : null
  return isObject(tracking ?? null) ? (tracking as Prisma.JsonObject) : null
}

function getTrackingIdentity(payload: Prisma.JsonValue | null): string | null {
  const tracking = getTrackingPayload(payload)
  const directEmail = getStringField(payload, 'email')
  const trackingEmail = tracking ? getStringField(tracking as Prisma.JsonValue, 'email') : null
  const identity = String(directEmail ?? trackingEmail ?? '').trim().toLowerCase()
  return identity || null
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

const APP_ENTRY_EVENT_TYPES = new Set([
  'lead_entered_app',
  'miniapp_opened',
  'web_onboarding_started',
  'telegram_start',
  'web_app_opened',
])

function normalizeSourceLabel(value: string | null | undefined): string {
  const source = String(value ?? '').trim()
  return source || 'unknown'
}

function humanizeTrackingSource(value: string | null | undefined): string {
  const source = String(value ?? '').trim()
  if (!source) return 'Невідоме джерело'

  const normalized = source.toLowerCase()

  if (normalized === 'telegram-router') return 'Telegram router'
  if (normalized === 'telegram') return 'Telegram'
  if (normalized === 'miniapp') return 'Mini app'
  if (normalized === 'web') return 'Web'
  if (normalized === 'sendpulse_or_external') return 'SendPulse / external'
  if (normalized === 'lead_entered_app') return 'Вхід у продукт'
  if (normalized === 'user_inactive') return 'Неактивний користувач'

  if (/^[0-9a-f]{24,}$/.test(normalized) || /^[0-9a-f-]{32,}$/.test(normalized)) {
    return 'Лід-магніт без назви'
  }

  return source
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join(' ')
}

function buildDisconnectedTrackingIntegrity(params: {
  leadUsers: number
  appUsers: number
  matchedUsers: number
  worstSource: string | null
  sourceConversion: number
  unlinkedEvents: number
}): TrackingIntegrity {
  return {
    isDisconnected: true,
    coreProblem: 'відсутній зв’язок між lead magnet і продуктом',
    weakestStep: 'lead_magnet_to_app_entry',
    conversion: 0,
    sampleSize: params.leadUsers,
    reasons: [
      'користувачі з lead magnet не передаються в продукт',
      'немає user matching (email / utm / id)',
      'дані з різних систем не зв’язані',
    ],
    actions: [
      'передавати email або user_id при переході в продукт',
      "додати подію 'lead_entered_app'",
      'зв’язати SendPulse / Telegram / Web через єдиний user_id',
    ],
    worstSource: params.worstSource,
    sourceConversion: params.sourceConversion,
    leadUsers: params.leadUsers,
    appUsers: params.appUsers,
    matchedUsers: params.matchedUsers,
    unlinkedEvents: params.unlinkedEvents,
  }
}

async function getTrackingIntegrity(period: Period = '30d'): Promise<TrackingIntegrity | null> {
  const { start } = getPeriodRange(period)

  const [leads, appEntryEvents] = await Promise.all([
    prisma.funnelLead.findMany({
      where: { createdAt: { gte: start } },
      select: {
        userId: true,
        source: true,
        user: {
          select: {
            id: true,
            email: true,
            telegramUserId: true,
            telegramChatId: true,
          },
        },
      },
    }),
    prisma.event.findMany({
      where: {
        createdAt: { gte: start },
        type: { in: [...APP_ENTRY_EVENT_TYPES] },
      },
      select: {
        userId: true,
        type: true,
        source: true,
        payload: true,
      },
    }),
  ])

  const leadIdentities = new Set(
    leads
      .map((lead) => {
        const leadEmail = lead.user?.email ? normalizeSourceLabel(lead.user.email).toLowerCase() : null
        return lead.userId ?? leadEmail
      })
      .filter((value): value is string => Boolean(value)),
  )
  const appIdentities = new Set(
    appEntryEvents
      .map((event) => event.userId ?? getTrackingIdentity(event.payload))
      .filter((value): value is string => Boolean(value)),
  )
  const matchedIdentities = new Set([...leadIdentities].filter((identity) => appIdentities.has(identity)))
  const unlinkedAppEntryEvents = appEntryEvents.filter((event) => !event.userId && !getTrackingIdentity(event.payload)).length

  const sourceStats = new Map<string, { leads: Set<string>; appUsers: Set<string> }>()
  for (const lead of leads) {
    const source = normalizeSourceLabel(lead.source)
    const bucket = sourceStats.get(source) ?? { leads: new Set<string>(), appUsers: new Set<string>() }
    const identity = lead.userId ?? (lead.user?.email ? normalizeSourceLabel(lead.user.email).toLowerCase() : null)
    if (identity) {
      bucket.leads.add(identity)
    }
    sourceStats.set(source, bucket)
  }
  for (const event of appEntryEvents) {
    const identity = event.userId ?? getTrackingIdentity(event.payload)
    if (!identity) continue
    for (const [source, bucket] of sourceStats.entries()) {
      if (bucket.leads.has(identity)) {
        bucket.appUsers.add(identity)
        sourceStats.set(source, bucket)
      }
    }
  }

  const rankedSources = [...sourceStats.entries()]
    .map(([source, bucket]) => ({
      source: humanizeTrackingSource(source),
      leads: bucket.leads.size,
      conversion: safeRate(bucket.appUsers.size, bucket.leads.size),
    }))
    .filter((item) => item.leads >= 10 || item.conversion < 100)
    .sort((left, right) => left.conversion - right.conversion || right.leads - left.leads)

  const worstSource = rankedSources[0] ?? null
  const disconnected = leadIdentities.size > 0 && matchedIdentities.size === 0

  if (disconnected) {
    return buildDisconnectedTrackingIntegrity({
      leadUsers: leadIdentities.size,
      appUsers: appIdentities.size,
      matchedUsers: matchedIdentities.size,
      worstSource: worstSource?.source ?? null,
      sourceConversion: worstSource?.conversion ?? 0,
      unlinkedEvents: unlinkedAppEntryEvents,
    })
  }

  if (leadIdentities.size === 0 && appIdentities.size === 0) {
    return null
  }

  const matchedRate = safeRate(matchedIdentities.size, Math.max(1, leadIdentities.size))

  return {
    isDisconnected: false,
    coreProblem: matchedIdentities.size > 0 ? 'трафік і продукт вже зв’язані' : 'немає стабільного потоку нових користувачів',
    weakestStep: matchedIdentities.size > 0 ? 'lead_magnet_to_wheel' : 'lead_magnet_to_app_entry',
    conversion: matchedRate,
    sampleSize: leadIdentities.size,
    reasons: matchedIdentities.size > 0
      ? ['є зв’язок між lead magnet і продуктом', 'дані не виглядають розірваними']
      : [
          'користувачі з lead magnet не передаються в продукт',
          'немає user matching (email / utm / id)',
          'дані з різних систем не зв’язані',
        ],
    actions: matchedIdentities.size > 0
      ? ['продовжити підсилювати наступний bottleneck', 'підняти конверсію на слабкому кроці']
      : [
          'передавати email або user_id при переході в продукт',
          "додати подію 'lead_entered_app'",
          'зв’язати SendPulse / Telegram / Web через єдиний user_id',
        ],
    worstSource: worstSource?.source ?? null,
    sourceConversion: worstSource?.conversion ?? 0,
    leadUsers: leadIdentities.size,
    appUsers: appIdentities.size,
    matchedUsers: matchedIdentities.size,
    unlinkedEvents: unlinkedAppEntryEvents,
  }
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
    trackingIntegrity: await getTrackingIntegrity(period),
  }
}
