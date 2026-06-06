import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { sanitizeSecurityPayload } from '../../core/state-machine/securityFoundation.js'
import {
  buildBehavioralAnalyticsSnapshot,
  validateBehavioralAnalyticsLayer,
  type BehavioralAnalyticsSnapshot,
  type BehavioralEventRecord,
} from './behavioral.js'

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

export interface CanonicalCoachMetrics {
  totalUsers: number
  testInProgress: number
  testCompleted: number
  focusPaid: number
  activeZoomUsers: number
  testToFocusConversion: number
  abSystemUpgrades: number
  revenueCents: number
  mrr: number
}

export interface RevenueCurrencyStat {
  currency: string
  count: number
  sumCents: number
}

export interface RevenueProductStat {
  code: string
  name: string
  currency: string
  count: number
  sumCents: number
}

export interface CanonicalRevenueMetrics {
  periodStart: Date
  periodEnd: Date
  revenueCents: number
  paymentCount: number
  paidUsers: number
  paidUsersByProduct: Array<{
    code: string
    users: number
  }>
  renewals: number
  mrrCents: number
  arpuCents: number
  revenueByCurrency: RevenueCurrencyStat[]
  revenueByProduct: RevenueProductStat[]
  successfulPaymentEvents: number
  matchedPaymentEvents: number
  unmatchedPaymentEvents: number
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

export interface FounderFunnelStep {
  key: string
  label: string
  users: number
  conversionRate: number
  dropOffRate: number
  avgHoursToNext: number
  lastActionBeforeExit: string
}

export interface FounderAnalytics {
  funnel: FounderFunnelStep[]
  retention: {
    day1: number
    day3: number
    avgStreak: number
    actionsPerUser: number
  }
  behavior: {
    firstActionCompletionRate: number
    stuckUsersRate: number
    weakestPoint: string
    heuristic: string
    suggestion: string
  }
  channels: {
    webUsers: number
    miniAppUsers: number
    telegramUsers: number
    webOnlyUsers: number
    telegramReturnRate: number
    miniAppEngagementRate: number
  }
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

function countDistinctUserIds(rows: Array<{ userId: string | null }>): number {
  return new Set(rows.map((row) => row.userId).filter((userId): userId is string => Boolean(userId))).size
}

function isObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const CANONICAL_REVENUE_CACHE_TTL_MS = 30_000
const canonicalRevenueCache = new Map<string, { expiresAt: number; promise: Promise<CanonicalRevenueMetrics> }>()

function cleanupCanonicalRevenueCache(nowTs = Date.now()): void {
  for (const [key, entry] of canonicalRevenueCache.entries()) {
    if (entry.expiresAt <= nowTs) {
      canonicalRevenueCache.delete(key)
    }
  }
}

function resolveRevenueCacheKey(input?: Period | { start: Date; end: Date }): string {
  if (!input) return 'period:30d'
  if (typeof input === 'string') return `period:${input}`
  return `range:${input.start.toISOString()}|${input.end.toISOString()}`
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

function normalizePaymentReference(value: unknown): string | null {
  const reference = String(value ?? '').trim()
  return reference || null
}

function extractPaymentReference(payload: Prisma.JsonValue | null): string | null {
  if (!isObject(payload)) {
    return null
  }

  return normalizePaymentReference(
    payload.payRef
    ?? payload.orderReference
    ?? payload.order_reference
    ?? payload.paymentId
    ?? payload.payment_id
    ?? payload.transactionId
    ?? payload.transaction_id
  )
}

function extractRevenueKind(metadata: Prisma.JsonValue | null): string | null {
  if (!isObject(metadata)) {
    return null
  }

  const value = metadata.kind ?? metadata.scope ?? metadata.type
  return typeof value === 'string' ? value.trim().toLowerCase() || null : null
}

function extractRevenueProductCode(row: {
  productId: string | null
  product?: { code: string; name: string } | null
  metadata: Prisma.JsonValue | null
}): string {
  if (row.product?.code) {
    return row.product.code
  }

  if (row.productId) {
    return row.productId
  }

  if (isObject(row.metadata)) {
    const candidate = row.metadata.productId ?? row.metadata.planCode ?? row.metadata.productCode ?? row.metadata.product_code
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return 'unknown'
}

function extractRevenueProductName(row: {
  productId: string | null
  product?: { code: string; name: string } | null
  metadata: Prisma.JsonValue | null
}): string {
  if (row.product?.name) {
    return row.product.name
  }

  const code = extractRevenueProductCode(row)
  return code === 'unknown' ? 'Unknown product' : code
}

function extractRevenueAmountCents(value: Prisma.JsonValue | null): number | null {
  if (!isObject(value)) {
    return null
  }

  if (typeof value.amountCents === 'number' && Number.isFinite(value.amountCents)) {
    return Math.round(value.amountCents)
  }

  if (typeof value.amount === 'number' && Number.isFinite(value.amount)) {
    return Math.round(value.amount * 100)
  }

  return null
}

function isRecurringRevenueKind(kind: string | null): boolean {
  if (!kind) {
    return false
  }

  return kind.includes('subscription') || kind.includes('renewal')
}

const RECURRING_REVENUE_PRODUCT_CODES = new Set([
  'focus',
  'stankey',
  'absystem',
  'absystem_ai',
])

function getRecurringFamilyKey(row: {
  userId: string
  productId: string | null
  product?: { code: string; name: string } | null
  metadata: Prisma.JsonValue | null
}): string | null {
  if (!isObject(row.metadata)) {
    return null
  }

  const kind = extractRevenueKind(row.metadata)
  const productCode = extractRevenueProductCode(row)
  const planCode = typeof row.metadata.planCode === 'string' ? row.metadata.planCode.trim() : ''
  const paymentProduct = typeof row.metadata.productId === 'string' ? row.metadata.productId.trim() : ''
  const normalizedProductCode = productCode.trim().toLowerCase()

  if (!isRecurringRevenueKind(kind) && !planCode && !paymentProduct && !RECURRING_REVENUE_PRODUCT_CODES.has(normalizedProductCode)) {
    return null
  }

  const family = planCode || paymentProduct || (RECURRING_REVENUE_PRODUCT_CODES.has(normalizedProductCode) ? normalizedProductCode : '') || kind || 'subscription'
  return `${row.userId}:${family}`
}

function isBetterRevenueRow(
  candidate: {
    amountCents: number
    kind: string | null
    createdAt: Date
    source: 'purchaseHistory' | 'paymentEvent'
  },
  current: {
    amountCents: number
    kind: string | null
    createdAt: Date
    source: 'purchaseHistory' | 'paymentEvent'
  } | null,
): boolean {
  if (!current) {
    return true
  }

  const candidatePriority = candidate.source === 'purchaseHistory' ? 2 : 1
  const currentPriority = current.source === 'purchaseHistory' ? 2 : 1
  if (candidatePriority !== currentPriority) {
    return candidatePriority > currentPriority
  }

  const candidateIsBillingWebhook = candidate.kind === 'billing_webhook'
  const currentIsBillingWebhook = current.kind === 'billing_webhook'
  if (candidateIsBillingWebhook !== currentIsBillingWebhook) {
    return !candidateIsBillingWebhook
  }

  if (candidate.amountCents !== current.amountCents) {
    return candidate.amountCents > current.amountCents
  }

  return candidate.createdAt > current.createdAt
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

const FOUNDER_FUNNEL = [
  { key: 'founder_wheel_started', label: 'Wheel started' },
  { key: 'founder_wheel_completed', label: 'Wheel completed' },
  { key: 'founder_goals_opened', label: 'Goals opened' },
  { key: 'founder_goals_edited', label: 'Goals edited' },
  { key: 'founder_goals_saved', label: 'Goals saved' },
  { key: 'founder_web_map_opened', label: 'Web Map opened' },
  { key: 'founder_web_map_first_step_completed', label: 'First step completed' },
  { key: 'founder_day_2_return', label: 'Day 2 return' },
] as const

function getFounderHeuristic(steps: FounderFunnelStep[]) {
  const weakest = [...steps].slice(0, -1).sort((left, right) => left.conversionRate - right.conversionRate)[0]
  if (!weakest) {
    return {
      weakestPoint: 'Недостатньо даних',
      heuristic: 'Поки що замало сигналів, щоб робити висновок.',
      suggestion: 'Назбирай більше проходів через wheel → goals → web map.',
    }
  }

  if (weakest.key === 'founder_goals_saved') {
    return {
      weakestPoint: weakest.label,
      heuristic: 'Цілі виглядають занадто складними.',
      suggestion: "Додай 'Сьогоднішній крок' одразу після списку цілей.",
    }
  }

  if (weakest.key === 'founder_web_map_opened') {
    return {
      weakestPoint: weakest.label,
      heuristic: 'Немає чіткого першого кроку після goals.',
      suggestion: 'Показуй Web Map як єдиний наступний крок після збереження цілей.',
    }
  }

  if (weakest.key === 'founder_day_2_return') {
    return {
      weakestPoint: weakest.label,
      heuristic: 'Слабкий habit loop або nudges.',
      suggestion: "Підсиль 'Сьогоднішній крок' і Telegram-нагадування на другий день.",
    }
  }

  return {
    weakestPoint: weakest.label,
    heuristic: 'Користувачі гублять ритм між кроками funnel.',
    suggestion: 'Прибери зайві CTA і лиши один наступний крок у кожному етапі.',
  }
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

export async function getCanonicalRevenueMetrics(
  input?: Period | { start: Date; end: Date },
): Promise<CanonicalRevenueMetrics> {
  const cacheKey = resolveRevenueCacheKey(input)
  const nowTs = Date.now()
  cleanupCanonicalRevenueCache(nowTs)
  const cached = canonicalRevenueCache.get(cacheKey)
  if (cached && cached.expiresAt > nowTs) {
    return cached.promise
  }
  if (cached) {
    canonicalRevenueCache.delete(cacheKey)
  }

  const { start, now: end } = input
    ? typeof input === 'string'
      ? getPeriodRange(input)
      : { start: input.start, now: input.end }
      : getPeriodRange('30d')

  const promise = (async (): Promise<CanonicalRevenueMetrics> => {
    const [purchaseRows, successEvents] = await Promise.all([
      prisma.purchaseHistory.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          amountCents: { gt: 0 },
          user: { deletedAt: null },
        },
        select: {
          id: true,
          userId: true,
          productId: true,
          amountCents: true,
          currency: true,
          createdAt: true,
          metadata: true,
          product: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }),
      prisma.event.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          type: { in: ['payment_success', 'subscription_activated'] },
        },
        select: {
          userId: true,
          type: true,
          createdAt: true,
          payload: true,
        },
      }),
    ])

    const revenueLedger = new Map<string, {
      userId: string
      amountCents: number
      currency: string
      productCode: string
      productName: string
      kind: string | null
      createdAt: Date
      source: 'purchaseHistory' | 'paymentEvent'
    }>()
    const successfulEventKeys = new Set<string>()

    for (const event of successEvents) {
      const paymentRef = extractPaymentReference(event.payload)
      if (paymentRef) {
        successfulEventKeys.add(paymentRef)
      }

      const amountCents = extractRevenueAmountCents(event.payload)
      const userId = event.userId ?? null
      if (!paymentRef || !userId || !amountCents || amountCents <= 0) {
        continue
      }

      const currency = isObject(event.payload) && typeof event.payload.currency === 'string'
        ? event.payload.currency.trim() || 'EUR'
        : 'EUR'
      const productCode = isObject(event.payload)
        ? normalizePaymentReference(event.payload.productId ?? event.payload.planId ?? event.payload.productCode ?? event.payload.scope) ?? 'unknown'
        : 'unknown'
      const kind = event.type.toLowerCase()

      const candidate = {
        userId,
        amountCents,
        currency,
        productCode,
        productName: productCode === 'unknown' ? 'Unknown product' : productCode,
        kind,
        createdAt: event.createdAt,
        source: 'paymentEvent' as const,
      }

      const current = revenueLedger.get(paymentRef) ?? null
      if (isBetterRevenueRow(candidate, current)) {
        revenueLedger.set(paymentRef, candidate)
      }
    }

    for (const row of purchaseRows) {
      const metadata = isObject(row.metadata) ? row.metadata : null
      const paymentRef = normalizePaymentReference(
        metadata?.payRef
        ?? metadata?.orderReference
        ?? metadata?.order_reference
        ?? metadata?.paymentId
        ?? metadata?.payment_id
        ?? metadata?.transactionId
        ?? metadata?.transaction_id
      ) ?? `purchase:${row.id}`

      const candidate = {
        userId: row.userId,
        amountCents: row.amountCents,
        currency: row.currency,
        productCode: extractRevenueProductCode(row),
        productName: extractRevenueProductName(row),
        kind: extractRevenueKind(metadata),
        createdAt: row.createdAt,
        source: 'purchaseHistory' as const,
      }

      const current = revenueLedger.get(paymentRef) ?? null
      if (isBetterRevenueRow(candidate, current)) {
        revenueLedger.set(paymentRef, candidate)
      }
    }

    const ledger = [...revenueLedger.entries()]
      .map(([paymentRef, entry]) => ({ paymentRef, ...entry }))
      .filter((entry) => entry.amountCents > 0)

    const revenueCents = ledger.reduce((sum, entry) => sum + entry.amountCents, 0)
    const paymentCount = ledger.length
    const paidUsers = getDistinctUserCount(ledger.map((entry) => entry.userId))

    const revenueByCurrencyMap = new Map<string, RevenueCurrencyStat>()
    const revenueByProductMap = new Map<string, RevenueProductStat>()
    const paidUsersByProductMap = new Map<string, Set<string>>()
    const familyCountMap = new Map<string, number>()
    const recurringFamilyLatestMap = new Map<string, { amountCents: number; createdAt: Date }>()

    for (const entry of ledger) {
      const currencyBucket = revenueByCurrencyMap.get(entry.currency) ?? {
        currency: entry.currency,
        count: 0,
        sumCents: 0,
      }
      currencyBucket.count += 1
      currencyBucket.sumCents += entry.amountCents
      revenueByCurrencyMap.set(entry.currency, currencyBucket)

      const productKey = `${entry.productCode}:${entry.currency}`
      const productBucket = revenueByProductMap.get(productKey) ?? {
        code: entry.productCode,
        name: entry.productName,
        currency: entry.currency,
        count: 0,
        sumCents: 0,
      }
      productBucket.count += 1
      productBucket.sumCents += entry.amountCents
      revenueByProductMap.set(productKey, productBucket)

      const normalizedProductCode = entry.productCode.trim().toLowerCase()
      const usersBucket = paidUsersByProductMap.get(normalizedProductCode) ?? new Set<string>()
      usersBucket.add(entry.userId)
      paidUsersByProductMap.set(normalizedProductCode, usersBucket)

      const familyKey = getRecurringFamilyKey({
        userId: entry.userId,
        productId: null,
        product: null,
        metadata: {
          kind: entry.kind ?? '',
          productId: RECURRING_REVENUE_PRODUCT_CODES.has(normalizedProductCode) ? entry.productCode : null,
          planCode: RECURRING_REVENUE_PRODUCT_CODES.has(normalizedProductCode) ? entry.productCode : null,
        } as Prisma.JsonObject,
      })

      if (familyKey) {
        familyCountMap.set(familyKey, (familyCountMap.get(familyKey) ?? 0) + 1)
        const currentLatest = recurringFamilyLatestMap.get(familyKey)
        if (!currentLatest || entry.createdAt > currentLatest.createdAt) {
          recurringFamilyLatestMap.set(familyKey, {
            amountCents: entry.amountCents,
            createdAt: entry.createdAt,
          })
        }
      }
    }

    const renewals = [...familyCountMap.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0)
    const mrrCents = [...recurringFamilyLatestMap.values()].reduce((sum, value) => sum + value.amountCents, 0)
    const arpuCents = paidUsers > 0 ? Math.round(revenueCents / paidUsers) : 0
    const successfulPaymentEvents = successEvents.length
    const matchedPaymentEvents = [...successfulEventKeys].filter((paymentRef) => revenueLedger.has(paymentRef)).length

    return {
      periodStart: start,
      periodEnd: end,
      revenueCents,
      paymentCount,
      paidUsers,
      paidUsersByProduct: [...paidUsersByProductMap.entries()]
        .map(([code, users]) => ({ code, users: users.size }))
        .sort((left, right) => right.users - left.users || left.code.localeCompare(right.code)),
      renewals,
      mrrCents,
      arpuCents,
      revenueByCurrency: [...revenueByCurrencyMap.values()].sort((left, right) => right.sumCents - left.sumCents),
      revenueByProduct: [...revenueByProductMap.values()].sort((left, right) => right.sumCents - left.sumCents),
      successfulPaymentEvents,
      matchedPaymentEvents,
      unmatchedPaymentEvents: Math.max(0, successfulPaymentEvents - matchedPaymentEvents),
    }
  })()

  canonicalRevenueCache.set(cacheKey, {
    expiresAt: nowTs + CANONICAL_REVENUE_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    const current = canonicalRevenueCache.get(cacheKey)
    if (current?.promise === promise) {
      canonicalRevenueCache.delete(cacheKey)
    }
    throw error
  }
}

export async function getCanonicalCoachMetrics(): Promise<CanonicalCoachMetrics> {
  const revenue = await getCanonicalRevenueMetrics()
  const [
    totalUsers,
    testInProgress,
    testCompleted,
    activePaidSubscriptions,
    zoomAttendees,
  ] = await Promise.all([
    prisma.user.count({
      where: { deletedAt: null },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        testStartedAt: { not: null },
        testCompletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        testCompletedAt: { not: null },
      },
    }),
    prisma.productSubscription.findMany({
      where: {
        status: { equals: 'active', mode: 'insensitive' },
        paidAt: { not: null },
        product: {
          code: {
            in: ['focus', 'absystem', 'absystem_ai'],
          },
        },
      },
      select: {
        userId: true,
        product: {
          select: {
            code: true,
          },
        },
      },
    }),
    prisma.zoomSessionAttendee.findMany({
      where: {
        attended: true,
        user: {
          deletedAt: null,
        },
      },
      select: {
        userId: true,
      },
    }),
  ])

  const focusPaid = countDistinctUserIds(activePaidSubscriptions.filter((row) => row.product.code.toLowerCase() === 'focus'))
  const activeZoomUsers = countDistinctUserIds(zoomAttendees)
  const abSystemUpgrades = countDistinctUserIds(activePaidSubscriptions.filter((row) => {
    const code = row.product.code.toLowerCase()
    return code === 'absystem' || code === 'absystem_ai'
  }))
  const revenueCents = revenue.revenueCents
  const mrr = revenue.mrrCents / 100

  return {
    totalUsers,
    testInProgress,
    testCompleted,
    focusPaid,
    activeZoomUsers,
    testToFocusConversion: safeRate(focusPaid, testCompleted),
    abSystemUpgrades,
    revenueCents,
    mrr,
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

export async function getFounderAnalytics(period: Period = '30d'): Promise<FounderAnalytics> {
  const { start } = getPeriodRange(period)
  const founderTypes = FOUNDER_FUNNEL.map((item) => item.key)
  const [events, allEvents, retention, streakRows] = await Promise.all([
    prisma.event.findMany({
      where: {
        createdAt: { gte: start },
        type: { in: founderTypes },
        userId: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        userId: true,
        type: true,
        source: true,
        createdAt: true,
      },
    }),
    prisma.event.findMany({
      where: {
        createdAt: { gte: start },
        userId: { not: null },
      },
      select: {
        userId: true,
        source: true,
        type: true,
      },
    }),
    getRetentionStats(period),
    prisma.streak.findMany({
      where: { ruleKey: 'daily_checkin' },
      select: { current: true },
    }),
  ])

  const eventsByUser = new Map<string, typeof events>()
  const sourceUsers = {
    web: new Set<string>(),
    miniapp: new Set<string>(),
    telegram: new Set<string>(),
  }

  for (const event of events) {
    if (!event.userId) continue
    const bucket = eventsByUser.get(event.userId) ?? []
    bucket.push(event)
    eventsByUser.set(event.userId, bucket)
  }

  for (const event of allEvents) {
    if (!event.userId) continue
    if (event.source === 'web') sourceUsers.web.add(event.userId)
    if (event.source === 'miniapp') sourceUsers.miniapp.add(event.userId)
    if (event.source === 'telegram') sourceUsers.telegram.add(event.userId)
  }

  const funnel: FounderFunnelStep[] = FOUNDER_FUNNEL.map((step, index) => {
    const stepUsers = new Set(
      events.filter((event) => event.type === step.key).map((event) => String(event.userId))
    )
    const prevUsers = index === 0
      ? stepUsers
      : new Set(
          events.filter((event) => event.type === FOUNDER_FUNNEL[index - 1]?.key).map((event) => String(event.userId))
        )
    const nextKey = FOUNDER_FUNNEL[index + 1]?.key
    const users = stepUsers.size
    const conversionRate = index === 0 ? 100 : safeRate(users, prevUsers.size)
    const nextUsers = nextKey
      ? new Set(events.filter((event) => event.type === nextKey).map((event) => String(event.userId)))
      : new Set<string>()
    const droppedUsers = [...stepUsers].filter((userId) => !nextUsers.has(userId))
    const dropOffRate = nextKey ? safeRate(droppedUsers.length, stepUsers.size) : 0
    const dropDurations = droppedUsers
      .map((userId) => {
        const userEvents = eventsByUser.get(userId) ?? []
        const currentEvent = userEvents.find((event) => event.type === step.key)
        const latestEvent = userEvents[userEvents.length - 1]
        if (!currentEvent || !latestEvent) return null
        return Math.max(0, (latestEvent.createdAt.getTime() - currentEvent.createdAt.getTime()) / 3_600_000)
      })
      .filter((value): value is number => value !== null)
    const avgHoursToNext = dropDurations.length
      ? round(dropDurations.reduce((sum, value) => sum + value, 0) / dropDurations.length)
      : 0
    const lastActionCounts = new Map<string, number>()
    for (const userId of droppedUsers) {
      const userEvents = eventsByUser.get(userId) ?? []
      const latestType = userEvents[userEvents.length - 1]?.type ?? step.key
      incrementCount(lastActionCounts, latestType)
    }
    const lastActionBeforeExit = [...lastActionCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? step.key

    return {
      key: step.key,
      label: step.label,
      users,
      conversionRate,
      dropOffRate,
      avgHoursToNext,
      lastActionBeforeExit,
    }
  })

  const webMapOpenedUsers = new Set(events.filter((event) => event.type === 'founder_web_map_opened').map((event) => String(event.userId)))
  const firstActionUsers = new Set(events.filter((event) => event.type === 'founder_web_map_first_step_completed').map((event) => String(event.userId)))
  const day2Users = new Set(events.filter((event) => event.type === 'founder_day_2_return').map((event) => String(event.userId)))
  const webUsers = sourceUsers.web.size
  const miniAppUsers = sourceUsers.miniapp.size
  const telegramUsers = sourceUsers.telegram.size
  const webOnlyUsers = [...sourceUsers.web].filter((userId) => !sourceUsers.miniapp.has(userId) && !sourceUsers.telegram.has(userId)).length
  const avgStreak = streakRows.length
    ? round(streakRows.reduce((sum, row) => sum + row.current, 0) / streakRows.length)
    : 0
  const actionsPerUser = sourceUsers.web.size || sourceUsers.miniapp.size || sourceUsers.telegram.size
    ? round(allEvents.length / new Set([...sourceUsers.web, ...sourceUsers.miniapp, ...sourceUsers.telegram]).size)
    : 0
  const behaviorHeuristic = getFounderHeuristic(funnel)

  return {
    funnel,
    retention: {
      day1: retention.day1,
      day3: retention.day3,
      avgStreak,
      actionsPerUser,
    },
    behavior: {
      firstActionCompletionRate: safeRate(firstActionUsers.size, webMapOpenedUsers.size),
      stuckUsersRate: safeRate(
        [...webMapOpenedUsers].filter((userId) => !firstActionUsers.has(userId)).length,
        webMapOpenedUsers.size,
      ),
      weakestPoint: behaviorHeuristic.weakestPoint,
      heuristic: behaviorHeuristic.heuristic,
      suggestion: behaviorHeuristic.suggestion,
    },
    channels: {
      webUsers,
      miniAppUsers,
      telegramUsers,
      webOnlyUsers,
      telegramReturnRate: safeRate(
        [...day2Users].filter((userId) => sourceUsers.telegram.has(userId)).length,
        telegramUsers,
      ),
      miniAppEngagementRate: safeRate(
        [...firstActionUsers].filter((userId) => sourceUsers.miniapp.has(userId)).length,
        miniAppUsers,
      ),
    },
  }
}

export async function getBehavioralAnalytics(period: Period = '30d'): Promise<BehavioralAnalyticsSnapshot> {
  const { start } = getPeriodRange(period)
  const events = await prisma.event.findMany({
    where: { createdAt: { gte: start } },
    select: {
      userId: true,
      type: true,
      state: true,
      payload: true,
      createdAt: true,
    },
  })

  const records: BehavioralEventRecord[] = events.map((event) => ({
    userId: event.userId,
    type: event.type,
    state: event.state,
    payload: event.payload,
    createdAt: event.createdAt,
  }))

  const snapshot = buildBehavioralAnalyticsSnapshot(records)
  const validation = validateBehavioralAnalyticsLayer()

  if (!validation.ok) {
    console.warn('[analytics] behavioral layer validation failed', validation.errors)
  }

  return snapshot
}
