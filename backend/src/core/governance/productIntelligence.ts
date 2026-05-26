import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { buildBehavioralAnalyticsSnapshot, type BehavioralAnalyticsSnapshot, type BehavioralEventRecord } from '../../modules/analytics/behavioral.js'
import { getAIInsights, getConversionRates, getDropOffPoints, getFunnelStats, getOverviewStats, getRetentionStats } from '../../modules/analytics/service.js'
import { buildRuntimeResilienceSnapshotFromCounts, type RuntimeResilienceSnapshot } from '../runtime/runtimeResilience.js'
import { FEATURE_FLAG_NAMES, getFeatureFlagCatalog, resolveFeatureGate, validateFeatureFlagFoundation } from './featureFlags.js'

type Period = '7d' | '30d' | '90d'

type PeriodRange = {
  start: Date
  now: Date
}

export type RankedItem = {
  key: string
  count: number
  success_count: number
  success_rate: number
}

export type PathRankingItem = {
  path: string[]
  count: number
  success_rate: number
}

export type ProductIntelligenceSnapshot = {
  generated_at: string
  period: Period
  product_id: string | null
  readiness_distribution: {
    low: number
    medium: number
    high: number
    trend: 'up' | 'down' | 'stable'
  }
  result_effectiveness: RankedItem[]
  cta_effectiveness: RankedItem[]
  message_effectiveness: RankedItem[]
  retention_effectiveness: {
    day1: number
    day3: number
    day7: number
    churn_prediction: 'low' | 'medium' | 'high'
    lifecycle_decay_score: number
    emotional_disengagement_markers: string[]
    habit_break_detection: boolean
    zoom_dropout_detection: boolean
    upgrade_fatigue_detection: boolean
  }
  zoom_effectiveness: {
    registered_users: number
    attended_users: number
    attendance_rate: number
    dropout_count: number
  }
  upgrade_effectiveness: {
    payment_started_users: number
    payment_success_users: number
    payment_abandonment_rate: number
    upgrade_rate: number
    average_time_to_purchase_ms: number
  }
  churn_correlation: {
    churn_risk_score: number
    top_signals: string[]
    bottlenecks: string[]
  }
  lifecycle_bottlenecks: Array<{
    from: string
    to: string
    dropOffRate: number
    lostUsers: number
  }>
  behavioral_cluster_patterns: {
    top_intents: Array<{ label: string; count: number }>
    top_problems: Array<{ label: string; count: number }>
    top_categories: Array<{ label: string; count: number }>
    top_results: Array<{ label: string; count: number }>
  }
  conversion_path_ranking: PathRankingItem[]
  best_retention_path: PathRankingItem | null
  best_upgrade_path: PathRankingItem | null
  best_return_path: PathRankingItem | null
}

export type BehavioralAdaptationPlan = {
  adaptive_reminder_timing: string
  adaptive_cta_ordering: string[]
  adaptive_micro_series_selection: string
  adaptive_inactivity_recovery: string
  adaptive_escalation_timing: string
  adaptive_onboarding_pacing: 'slow' | 'normal' | 'fast'
  reasons: string[]
}

export type OperatorGovernanceSnapshot = {
  runtime_health_view: RuntimeResilienceSnapshot
  funnel_health_view: {
    overview: Awaited<ReturnType<typeof getOverviewStats>>
    funnel: Awaited<ReturnType<typeof getFunnelStats>>
    conversions: Awaited<ReturnType<typeof getConversionRates>>
    drop_offs: Awaited<ReturnType<typeof getDropOffPoints>>
    retention: Awaited<ReturnType<typeof getRetentionStats>>
  }
  replay_anomaly_view: {
    replay_attempts: number
    payment_replay_attempts: number
    webhook_invalid: number
    duplicate_rate: number
  }
  retry_anomaly_view: {
    retry_pressure_score: number
    retry_amplification_detected: boolean
  }
  payment_anomaly_view: {
    payment_started: number
    payment_success: number
    payment_failed: number
    abandonment_rate: number
  }
  telegram_anomaly_view: {
    message_opened: number
    cta_clicked: number
    callback_replay_attempts: number
    interaction_rate: number
  }
  degraded_runtime_view: {
    breaker_state: RuntimeResilienceSnapshot['breaker_state']
    degradation_classification: string | null
    throttling_marker: string | null
  }
  readiness_distribution_view: ProductIntelligenceSnapshot['readiness_distribution']
  manual_review_markers: string[]
  operator_intervention_markers: string[]
}

export type LaunchGovernanceChecklist = {
  launch_ready: boolean
  release_ready: boolean
  rollback_ready: boolean
  migration_ready: boolean
  redis_ready: boolean
  db_schema_ready: boolean
  webhook_ready: boolean
  telegram_webhook_ready: boolean
  payment_ready: boolean
  environment_consistency: boolean
  feature_flag_rollout_ready: boolean
  blockers: string[]
  checks: Array<{ key: string; ready: boolean; details: string }>
}

type EventLike = {
  userId: string | null
  type: string
  state: string | null
  source: string
  payload: Prisma.JsonValue | null
  createdAt: Date
}

type RankedBucket = {
  count: number
  success: number
}

function getPeriodRange(period: Period = '30d'): PeriodRange {
  const now = new Date()
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  return {
    now,
    start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
  }
}

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getField(payload: Prisma.JsonValue | null, key: string): unknown {
  return isJsonObject(payload) ? payload[key] : undefined
}

function getStringField(payload: Prisma.JsonValue | null, keys: string[]): string | null {
  for (const key of keys) {
    const value = getField(payload, key)
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function getBooleanField(payload: Prisma.JsonValue | null, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = getField(payload, key)
    if (typeof value === 'boolean') {
      return value
    }
  }
  return null
}

function getNumberField(payload: Prisma.JsonValue | null, keys: string[]): number | null {
  for (const key of keys) {
    const value = getField(payload, key)
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }
  return null
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function extractProductId(payload: Prisma.JsonValue | null): string | null {
  return getStringField(payload, ['productId', 'product_id', 'product', 'productKey'])
}

function matchesProductScope(event: EventLike, productId: string | null): boolean {
  if (!productId) return true
  const payload = isJsonObject(event.payload) ? event.payload : null
  const payloadProductId = extractProductId(payload)
  const sourceProduct = getStringField(payload, ['source_product_id', 'sourceProductId'])
  return payloadProductId === productId || sourceProduct === productId || event.source === productId
}

function bucketSuccess(
  buckets: Map<string, RankedBucket>,
  key: string | null,
  success = false,
): void {
  if (!key) return
  const entry = buckets.get(key) ?? { count: 0, success: 0 }
  entry.count += 1
  entry.success += success ? 1 : 0
  buckets.set(key, entry)
}

function rankBuckets(buckets: Map<string, RankedBucket>, limit = 10): RankedItem[] {
  return [...buckets.entries()]
    .map(([key, value]) => ({
      key,
      count: value.count,
      success_count: value.success,
      success_rate: value.count > 0 ? Math.round((value.success / value.count) * 1000) / 10 : 0,
    }))
    .sort((left, right) => right.success_rate - left.success_rate || right.count - left.count)
    .slice(0, limit)
}

function buildPathSignature(events: EventLike[], markers: string[]): string | null {
  const ordered = events
    .map((event) => {
      const canonical = normalizeText(getStringField(event.payload, ['canonical_event', 'canonicalEvent']))
      return canonical ?? event.type
    })
    .filter(Boolean)

  const found: string[] = []
  let cursor = 0
  for (const marker of markers) {
    const index = ordered.findIndex((value, idx) => idx >= cursor && value === marker)
    if (index === -1) {
      return null
    }
    found.push(marker)
    cursor = index + 1
  }

  return found.join('>')
}

function rankPaths(events: EventLike[], templates: string[][], successPredicate: (events: EventLike[]) => boolean): PathRankingItem[] {
  const perUser = new Map<string, EventLike[]>()
  for (const event of events) {
    if (!event.userId) continue
    const bucket = perUser.get(event.userId) ?? []
    bucket.push(event)
    perUser.set(event.userId, bucket)
  }

  const counts = new Map<string, RankedBucket>()
  for (const userEvents of perUser.values()) {
    for (const template of templates) {
      const signature = buildPathSignature(userEvents, template)
      if (!signature) continue
      bucketSuccess(counts, signature, successPredicate(userEvents))
    }
  }

  return rankBuckets(counts, 10).map((item) => ({
    path: item.key.split('>'),
    count: item.count,
    success_rate: item.success_rate,
  }))
}

function buildReadinessDistribution(events: EventLike[]): ProductIntelligenceSnapshot['readiness_distribution'] {
  const midpoint = events.length > 0 ? events[Math.floor(events.length / 2)]?.createdAt.getTime() ?? Date.now() : Date.now()
  const buckets = { low: 0, medium: 0, high: 0 }
  const firstHalf = { low: 0, medium: 0, high: 0 }
  const secondHalf = { low: 0, medium: 0, high: 0 }

  for (const event of events) {
    const readiness = isJsonObject(event.payload) ? event.payload.readiness : null
    const level = normalizeText(isJsonObject(readiness) ? readiness.level : null)
    if (level === 'low' || level === 'medium' || level === 'high') {
      buckets[level] += 1
      if (event.createdAt.getTime() <= midpoint) {
        firstHalf[level] += 1
      } else {
        secondHalf[level] += 1
      }
    }
  }

  const firstScore = firstHalf.high * 2 + firstHalf.medium
  const secondScore = secondHalf.high * 2 + secondHalf.medium
  const trend = secondScore > firstScore ? 'up' : secondScore < firstScore ? 'down' : 'stable'

  return {
    ...buckets,
    trend,
  }
}

function buildChurnSignals(snapshot: BehavioralAnalyticsSnapshot, funnelDropOffs: Array<{ from: string; to: string; dropOffRate: number; lostUsers: number }>) {
  const churnRiskScore = Math.round(Math.min(100, asNumber(snapshot.metrics.retention_risk_score)))
  const topSignals: string[] = []

  if ((snapshot.retentionMarkers.abandoned_payment ?? 0) > 0) topSignals.push('abandoned_payment')
  if ((snapshot.retentionMarkers.missed_zoom_count ?? 0) > 0) topSignals.push('missed_zoom')
  if ((snapshot.retentionMarkers.no_reply_streak ?? 0) > 0) topSignals.push('no_reply_streak')
  if (asNumber(snapshot.metrics.payment_abandonment_rate) > 0) topSignals.push('payment_abandonment')

  const bottlenecks = funnelDropOffs
    .slice()
    .sort((left, right) => right.dropOffRate - left.dropOffRate)
    .slice(0, 3)
    .map(item => `${item.from}->${item.to}`)

  return {
    churn_risk_score: churnRiskScore,
    top_signals: topSignals,
    bottlenecks,
  }
}

function buildEffectivenessRankings(events: EventLike[]) {
  const byUser = new Map<string, EventLike[]>()
  for (const event of events) {
    if (!event.userId) continue
    const bucket = byUser.get(event.userId) ?? []
    bucket.push(event)
    byUser.set(event.userId, bucket)
  }

  const ctaBuckets = new Map<string, RankedBucket>()
  const messageBuckets = new Map<string, RankedBucket>()
  const resultBuckets = new Map<string, RankedBucket>()

  for (const userEvents of byUser.values()) {
    const sorted = userEvents.slice().sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    const didConvert = (predicates: Array<(event: EventLike) => boolean>) => predicates.some(predicate => sorted.some(predicate))
    const lastWasRetained = sorted.some((event) => {
      const canonical = normalizeText(getStringField(event.payload, ['canonical_event', 'canonicalEvent'])) ?? event.type
      return canonical === 'FLOW_COMPLETED' || canonical === 'payment_success' || canonical === 'PAYMENT_SUCCESS' || canonical === 'ZOOM_ATTENDED'
    })

    for (const event of sorted) {
      const canonical = normalizeText(getStringField(event.payload, ['canonical_event', 'canonicalEvent'])) ?? event.type
      if (canonical === 'CTA_CLICKED') {
        const ctaId = getStringField(event.payload, ['cta_id', 'ctaId'])
        bucketSuccess(ctaBuckets, ctaId, didConvert([
          (item) => item.createdAt.getTime() >= event.createdAt.getTime() && ['PAYMENT_SUCCESS', 'payment_success', 'ZOOM_ATTENDED', 'FLOW_COMPLETED', 'subscription_activated'].includes(normalizeText(getStringField(item.payload, ['canonical_event', 'canonicalEvent'])) ?? item.type),
        ]))
      }

      if (canonical === 'MESSAGE_OPENED') {
        const messageKey = getStringField(event.payload, ['message_key', 'messageKey'])
        bucketSuccess(messageBuckets, messageKey, didConvert([
          (item) => item.createdAt.getTime() >= event.createdAt.getTime() && (normalizeText(getStringField(item.payload, ['cta_id', 'ctaId'])) !== null || ['CTA_CLICKED', 'FLOW_TRIGGERED', 'FLOW_COMPLETED'].includes(normalizeText(getStringField(item.payload, ['canonical_event', 'canonicalEvent'])) ?? item.type)),
        ]))
      }

      if (canonical === 'TEST_COMPLETED' || canonical === 'RESULT_OPENED') {
        const resultType = getStringField(event.payload, ['result_type', 'resultType']) ?? 'default'
        bucketSuccess(resultBuckets, resultType, didConvert([
          (item) => item.createdAt.getTime() >= event.createdAt.getTime() && ['CTA_CLICKED', 'PAYMENT_STARTED', 'PAYMENT_SUCCESS'].includes(normalizeText(getStringField(item.payload, ['canonical_event', 'canonicalEvent'])) ?? item.type),
        ]))
      }
    }

    if (lastWasRetained) {
      bucketSuccess(resultBuckets, 'retained_path', true)
    }
  }

  return {
    ctaEffectiveness: rankBuckets(ctaBuckets, 10),
    messageEffectiveness: rankBuckets(messageBuckets, 10),
    resultEffectiveness: rankBuckets(resultBuckets, 10),
  }
}

async function loadEvents(period: Period, productId: string | null): Promise<EventLike[]> {
  const { start } = getPeriodRange(period)
  const events = await prisma.event.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: 'asc' },
    select: {
      userId: true,
      type: true,
      state: true,
      source: true,
      payload: true,
      createdAt: true,
    },
  })

  return events.filter(event => matchesProductScope(event, productId))
}

export async function getProductIntelligence(period: Period = '30d', input?: { productId?: string | null }): Promise<ProductIntelligenceSnapshot> {
  const events = await loadEvents(period, input?.productId ?? null)
  const behavioralRecords: BehavioralEventRecord[] = events.map((event) => ({
    userId: event.userId,
    type: event.type,
    state: event.state,
    payload: event.payload,
    createdAt: event.createdAt,
  }))

  const behavioral = buildBehavioralAnalyticsSnapshot(behavioralRecords)
  const funnel = await getFunnelStats(period)
  const conversions = await getConversionRates(period)
  const dropOffs = await getDropOffPoints(period)
  const retention = await getRetentionStats(period)
  const aiInsights = await getAIInsights(period, 6)
  const overview = await getOverviewStats(period)

  const readinessDistribution = buildReadinessDistribution(events)
  const effectiveness = buildEffectivenessRankings(events)
  const churnCorrelation = buildChurnSignals(behavioral, dropOffs.map(item => ({
    from: item.from,
    to: item.to,
    dropOffRate: item.dropOffRate,
    lostUsers: item.lostUsers,
  })))

  const zoomRegistered = events.filter((event) => {
    const canonical = normalizeText(getStringField(event.payload, ['canonical_event', 'canonicalEvent'])) ?? event.type
    return canonical === 'ZOOM_REGISTERED'
  }).length
  const zoomAttended = events.filter((event) => {
    const canonical = normalizeText(getStringField(event.payload, ['canonical_event', 'canonicalEvent'])) ?? event.type
    return canonical === 'ZOOM_ATTENDED'
  }).length
  const paymentStarted = events.filter((event) => {
    const canonical = normalizeText(getStringField(event.payload, ['canonical_event', 'canonicalEvent'])) ?? event.type
    return canonical === 'PAYMENT_STARTED'
  }).length
  const paymentSuccess = events.filter((event) => {
    const canonical = normalizeText(getStringField(event.payload, ['canonical_event', 'canonicalEvent'])) ?? event.type
    return canonical === 'PAYMENT_SUCCESS' || canonical === 'payment_success'
  }).length
  const paymentFailed = events.filter((event) => {
    const canonical = normalizeText(getStringField(event.payload, ['canonical_event', 'canonicalEvent'])) ?? event.type
    return canonical === 'PAYMENT_FAILED'
  }).length

  const upgradeEffectiveness = {
    payment_started_users: paymentStarted,
    payment_success_users: paymentSuccess,
    payment_abandonment_rate: paymentStarted > 0 ? Math.round(((paymentStarted - paymentSuccess) / paymentStarted) * 1000) / 10 : 0,
    upgrade_rate: paymentStarted > 0 ? Math.round((paymentSuccess / paymentStarted) * 1000) / 10 : 0,
    average_time_to_purchase_ms: asNumber(behavioral.metrics.time_to_purchase),
  }

  const zoomEffectiveness = {
    registered_users: zoomRegistered,
    attended_users: zoomAttended,
    attendance_rate: zoomRegistered > 0 ? Math.round((zoomAttended / zoomRegistered) * 1000) / 10 : 0,
    dropout_count: Math.max(0, zoomRegistered - zoomAttended),
  }

  const retentionEffectiveness = {
    day1: retention.day1,
    day3: retention.day3,
    day7: retention.day7,
    churn_prediction: (
      churnCorrelation.churn_risk_score >= 70
        ? 'high'
        : churnCorrelation.churn_risk_score >= 40
          ? 'medium'
          : 'low'
    ) as ProductIntelligenceSnapshot['retention_effectiveness']['churn_prediction'],
    lifecycle_decay_score: Math.round(asNumber(behavioral.metrics.retention_risk_score) * 10) / 10,
    emotional_disengagement_markers: [...new Set([
      ...(asNumber(behavioral.metrics.retention_risk_score) >= 60 ? ['high_retention_risk'] : []),
      ...(behavioral.dropOffPatterns.payment_abandoned > 0 ? ['payment_abandoned'] : []),
      ...(behavioral.dropOffPatterns.joined_no_zoom > 0 ? ['zoom_dropout'] : []),
    ])],
    habit_break_detection: (behavioral.retentionMarkers.no_reply_streak ?? 0) > 0,
    zoom_dropout_detection: behavioral.dropOffPatterns.joined_no_zoom > 0,
    upgrade_fatigue_detection: paymentFailed > 0 && paymentSuccess === 0,
  }

  const conversionPathRanking = rankPaths(events, [
    ['TEST_STARTED', 'RESULT_OPENED', 'CTA_CLICKED', 'PAYMENT_STARTED', 'PAYMENT_SUCCESS'],
    ['RESULT_OPENED', 'CTA_CLICKED', 'ZOOM_REGISTERED', 'ZOOM_ATTENDED', 'FLOW_COMPLETED'],
    ['MESSAGE_OPENED', 'CTA_CLICKED', 'FLOW_TRIGGERED', 'FLOW_COMPLETED'],
    ['MESSAGE_OPENED', 'RESTORE_PROGRESS', 'FLOW_COMPLETED'],
  ], (userEvents) => userEvents.some((event) => {
    const canonical = normalizeText(getStringField(event.payload, ['canonical_event', 'canonicalEvent'])) ?? event.type
    return ['PAYMENT_SUCCESS', 'subscription_activated', 'ZOOM_ATTENDED', 'FLOW_COMPLETED'].includes(canonical)
  }))

  const bestRetentionPath = conversionPathRanking.find((item) => item.path.includes('RESTORE_PROGRESS')) ?? null
  const bestUpgradePath = conversionPathRanking.find((item) => item.path.includes('PAYMENT_SUCCESS')) ?? null
  const bestReturnPath = conversionPathRanking.find((item) => item.path.includes('MESSAGE_OPENED') && item.path.includes('FLOW_COMPLETED')) ?? null

  return {
    generated_at: new Date().toISOString(),
    period,
    product_id: input?.productId ?? null,
    readiness_distribution: readinessDistribution,
    result_effectiveness: effectiveness.resultEffectiveness,
    cta_effectiveness: effectiveness.ctaEffectiveness,
    message_effectiveness: effectiveness.messageEffectiveness,
    retention_effectiveness: retentionEffectiveness,
    zoom_effectiveness: zoomEffectiveness,
    upgrade_effectiveness: upgradeEffectiveness,
    churn_correlation: churnCorrelation,
    lifecycle_bottlenecks: dropOffs.map(item => ({
      from: item.from,
      to: item.to,
      dropOffRate: item.dropOffRate,
      lostUsers: item.lostUsers,
    })),
    behavioral_cluster_patterns: {
      top_intents: aiInsights.topIntents,
      top_problems: aiInsights.topProblems,
      top_categories: aiInsights.topCategories,
      top_results: Object.entries(behavioral.metrics.result_distribution as Record<string, number>)
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 6),
    },
    conversion_path_ranking: conversionPathRanking,
    best_retention_path: bestRetentionPath,
    best_upgrade_path: bestUpgradePath,
    best_return_path: bestReturnPath,
  }
}

export function buildBehavioralAdaptationPlan(snapshot: ProductIntelligenceSnapshot): BehavioralAdaptationPlan {
  const highRisk = snapshot.retention_effectiveness.churn_prediction === 'high' || snapshot.churn_correlation.churn_risk_score >= 70
  const mediumRisk = snapshot.retention_effectiveness.churn_prediction === 'medium' || snapshot.churn_correlation.churn_risk_score >= 40
  const highReadiness = snapshot.readiness_distribution.high >= snapshot.readiness_distribution.low
  const lowReadiness = snapshot.readiness_distribution.low > snapshot.readiness_distribution.high

  const adaptiveReminderTiming = highRisk
    ? '2h,24h'
    : mediumRisk
      ? '24h,48h'
      : '48h,72h'

  const adaptiveCtaOrdering = highRisk
    ? ['RESTORE_PROGRESS', 'PAY_FOCUS_1M', 'PAY_FOCUS_3M', 'OPEN_FOCUS', 'OPEN_PLATFORM']
    : highReadiness
      ? ['OPEN_PLATFORM', 'OPEN_ZOOM', 'PAY_FOCUS_1M', 'PAY_FOCUS_3M', 'OPEN_FOCUS']
      : ['OPEN_FOCUS', 'JOIN_CHANNEL', 'RESTORE_PROGRESS', 'PAY_FOCUS_1M', 'OPEN_PLATFORM']

  const adaptiveMicroSeriesSelection = highRisk
    ? 'retention'
    : snapshot.zoom_effectiveness.dropout_count > 0
      ? 'zoom'
      : snapshot.upgrade_effectiveness.payment_abandonment_rate > 40
        ? 'payment'
        : 'result'

  const adaptiveInactivityRecovery = highRisk
    ? 'restore-first'
    : mediumRisk
      ? 'soft-reminder-first'
      : 'normal-nudge'

  const adaptiveEscalationTiming = snapshot.upgrade_effectiveness.upgrade_rate < 20 || snapshot.zoom_effectiveness.attendance_rate < 50
    ? 'immediate'
    : highRisk
      ? 'early'
      : 'standard'

  const adaptiveOnboardingPacing = lowReadiness
    ? 'slow'
    : highReadiness && snapshot.retention_effectiveness.day7 >= snapshot.retention_effectiveness.day1
      ? 'fast'
      : 'normal'

  const reasons = [
    `readiness=${snapshot.readiness_distribution.high}/${snapshot.readiness_distribution.medium}/${snapshot.readiness_distribution.low}`,
    `churn=${snapshot.churn_correlation.churn_risk_score}`,
    `zoom=${snapshot.zoom_effectiveness.attendance_rate}`,
    `upgrade=${snapshot.upgrade_effectiveness.upgrade_rate}`,
  ]

  return {
    adaptive_reminder_timing: adaptiveReminderTiming,
    adaptive_cta_ordering: adaptiveCtaOrdering,
    adaptive_micro_series_selection: adaptiveMicroSeriesSelection,
    adaptive_inactivity_recovery: adaptiveInactivityRecovery,
    adaptive_escalation_timing: adaptiveEscalationTiming,
    adaptive_onboarding_pacing: adaptiveOnboardingPacing,
    reasons,
  }
}

export function buildRetentionIntelligence(snapshot: ProductIntelligenceSnapshot) {
  const churnPrediction = snapshot.retention_effectiveness.churn_prediction
  const inactivityEscalation = churnPrediction === 'high'
    ? 'immediate'
    : churnPrediction === 'medium'
      ? 'soft'
      : 'monitor'

  return {
    churn_prediction: churnPrediction,
    inactivity_escalation: inactivityEscalation,
    lifecycle_decay_score: snapshot.retention_effectiveness.lifecycle_decay_score,
    emotional_disengagement_markers: snapshot.retention_effectiveness.emotional_disengagement_markers,
    habit_break_detection: snapshot.retention_effectiveness.habit_break_detection,
    zoom_dropout_detection: snapshot.retention_effectiveness.zoom_dropout_detection,
    upgrade_fatigue_detection: snapshot.retention_effectiveness.upgrade_fatigue_detection,
    retention_lifecycle_analytics: {
      day1: snapshot.retention_effectiveness.day1,
      day3: snapshot.retention_effectiveness.day3,
      day7: snapshot.retention_effectiveness.day7,
      churn_risk_score: snapshot.churn_correlation.churn_risk_score,
    },
  }
}

export async function getOperatorGovernanceSnapshot(period: Period = '30d', input?: { productId?: string | null }): Promise<OperatorGovernanceSnapshot> {
  const [intelligence, overview, funnel, conversions, dropOffs, retention, behavioral] = await Promise.all([
    getProductIntelligence(period, input),
    getOverviewStats(period),
    getFunnelStats(period),
    getConversionRates(period),
    getDropOffPoints(period),
    getRetentionStats(period),
    prisma.event.findMany({
      where: { createdAt: { gte: getPeriodRange(period).start } },
      select: {
        type: true,
        payload: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const counts = {
    callbackReplayAttempts: behavioral.filter((event) => event.type === 'callback_replay_attempt').length,
    paymentReplayAttempts: behavioral.filter((event) => event.type === 'payment_callback_replay_attempt').length,
    webhookInvalid: behavioral.filter((event) => event.type === 'billing_webhook_invalid').length,
    telegramCallbackEvents: behavioral.filter((event) => event.type === 'CTA_CLICKED' || event.type === 'MESSAGE_OPENED').length,
    paymentSuccessEvents: behavioral.filter((event) => event.type === 'payment_success' || event.type === 'PAYMENT_SUCCESS').length,
    flowTriggeredEvents: behavioral.filter((event) => event.type === 'FLOW_TRIGGERED').length,
    notificationJobs: behavioral.filter((event) => event.type.includes('notification')).length,
    notificationSent: behavioral.filter((event) => event.type.includes('notification_sent')).length,
  }
  const runtimeHealthView = buildRuntimeResilienceSnapshotFromCounts(counts)

  const paymentStarted = behavioral.filter((event) => event.type === 'PAYMENT_STARTED' || event.type === 'payment_started').length
  const paymentFailed = behavioral.filter((event) => event.type === 'PAYMENT_FAILED' || event.type === 'payment_failed').length
  const messageOpened = behavioral.filter((event) => event.type === 'MESSAGE_OPENED').length
  const ctaClicked = behavioral.filter((event) => event.type === 'CTA_CLICKED').length

  return {
    runtime_health_view: runtimeHealthView,
    funnel_health_view: {
      overview,
      funnel,
      conversions,
      drop_offs: dropOffs,
      retention,
    },
    replay_anomaly_view: {
      replay_attempts: counts.callbackReplayAttempts + counts.paymentReplayAttempts,
      payment_replay_attempts: counts.paymentReplayAttempts,
      webhook_invalid: counts.webhookInvalid,
      duplicate_rate: counts.callbackReplayAttempts + counts.paymentReplayAttempts > 0
        ? Math.round(((counts.callbackReplayAttempts + counts.paymentReplayAttempts) / Math.max(1, behavioral.length)) * 1000) / 10
        : 0,
    },
    retry_anomaly_view: {
      retry_pressure_score: counts.callbackReplayAttempts * 12 + counts.paymentReplayAttempts * 18 + counts.webhookInvalid * 10,
      retry_amplification_detected: counts.callbackReplayAttempts + counts.paymentReplayAttempts > 5,
    },
    payment_anomaly_view: {
      payment_started: paymentStarted,
      payment_success: counts.paymentSuccessEvents,
      payment_failed: paymentFailed,
      abandonment_rate: paymentStarted > 0 ? Math.round(((paymentStarted - counts.paymentSuccessEvents) / Math.max(1, paymentStarted)) * 1000) / 10 : 0,
    },
    telegram_anomaly_view: {
      message_opened: messageOpened,
      cta_clicked: ctaClicked,
      callback_replay_attempts: counts.callbackReplayAttempts,
      interaction_rate: messageOpened > 0 ? Math.round((ctaClicked / messageOpened) * 1000) / 10 : 0,
    },
    degraded_runtime_view: {
      breaker_state: runtimeHealthView.breaker_state,
      degradation_classification: runtimeHealthView.degradation_classification,
      throttling_marker: runtimeHealthView.throttling_marker,
    },
    readiness_distribution_view: intelligence.readiness_distribution,
    manual_review_markers: [
      ...(intelligence.retention_effectiveness.churn_prediction === 'high' ? ['high_retention_risk'] : []),
      ...(intelligence.upgrade_effectiveness.payment_abandonment_rate > 30 ? ['payment_abandonment'] : []),
      ...(intelligence.zoom_effectiveness.dropout_count > 0 ? ['zoom_dropout'] : []),
    ],
    operator_intervention_markers: [
      ...(runtimeHealthView.breaker_state !== 'closed' ? ['runtime_degraded'] : []),
      ...(counts.callbackReplayAttempts > 0 ? ['replay_pressure'] : []),
      ...(counts.webhookInvalid > 0 ? ['invalid_webhook'] : []),
      ...(counts.paymentReplayAttempts > 0 ? ['payment_replay'] : []),
    ],
  }
}

export async function getLaunchGovernanceChecklist(): Promise<LaunchGovernanceChecklist> {
  const checks = [
    {
      key: 'runtime_idempotency',
      ready: validateFeatureFlagFoundation().ok,
      details: validateFeatureFlagFoundation().ok ? 'feature flags deterministic' : 'feature flag registry mismatch',
    },
    {
      key: 'database_url',
      ready: Boolean(process.env.DATABASE_URL?.trim()),
      details: process.env.DATABASE_URL?.trim() ? 'DATABASE_URL configured' : 'DATABASE_URL missing',
    },
    {
      key: 'redis_ready',
      ready: Boolean(process.env.REDIS_URL?.trim()),
      details: process.env.REDIS_URL?.trim() ? 'Redis configured' : 'Redis missing',
    },
    {
      key: 'webhook_ready',
      ready: Boolean(process.env.WAYFORPAY_CALLBACK_URL?.trim()),
      details: process.env.WAYFORPAY_CALLBACK_URL?.trim() ? 'WayForPay callback configured' : 'WayForPay callback missing',
    },
    {
      key: 'telegram_webhook_ready',
      ready: Boolean(process.env.TELEGRAM_WEBHOOK_URL?.trim()),
      details: process.env.TELEGRAM_WEBHOOK_URL?.trim() ? 'Telegram webhook configured' : 'Telegram webhook missing',
    },
    {
      key: 'payment_ready',
      ready: Boolean(process.env.WAYFORPAY_MERCHANT?.trim()) && Boolean(process.env.WAYFORPAY_SECRET?.trim()),
      details: Boolean(process.env.WAYFORPAY_MERCHANT?.trim()) && Boolean(process.env.WAYFORPAY_SECRET?.trim())
        ? 'WayForPay credentials configured'
        : 'WayForPay credentials missing',
    },
    {
      key: 'environment_consistency',
      ready: Boolean(process.env.NODE_ENV?.trim()),
      details: process.env.NODE_ENV?.trim() ? `NODE_ENV=${process.env.NODE_ENV}` : 'NODE_ENV missing',
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.key)
  const launchReady = blockers.length === 0

  return {
    launch_ready: launchReady,
    release_ready: launchReady,
    rollback_ready: true,
    migration_ready: Boolean(process.env.DATABASE_URL?.trim()) && Boolean(process.env.REDIS_URL?.trim()),
    redis_ready: Boolean(process.env.REDIS_URL?.trim()),
    db_schema_ready: Boolean(process.env.DATABASE_URL?.trim()),
    webhook_ready: Boolean(process.env.WAYFORPAY_CALLBACK_URL?.trim()),
    telegram_webhook_ready: Boolean(process.env.TELEGRAM_WEBHOOK_URL?.trim()),
    payment_ready: Boolean(process.env.WAYFORPAY_MERCHANT?.trim()) && Boolean(process.env.WAYFORPAY_SECRET?.trim()),
    environment_consistency: Boolean(process.env.NODE_ENV?.trim()),
    feature_flag_rollout_ready: validateFeatureFlagFoundation().ok,
    blockers,
    checks,
  }
}

export function validateProductIntelligenceFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const readinessDistribution = buildReadinessDistribution([
    {
      userId: 'u-1',
      type: 'MESSAGE_OPENED',
      state: 'S3_TEST_RESULT',
      source: 'telegram',
      payload: { readiness: { level: 'high', signals: { attended_zoom: true } } },
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    },
    {
      userId: 'u-1',
      type: 'CTA_CLICKED',
      state: 'S4_FOCUS_INVITE',
      source: 'telegram',
      payload: { cta_id: 'OPEN_FOCUS' },
      createdAt: new Date('2025-01-02T00:00:00.000Z'),
    },
  ])

  if (readinessDistribution.high < 1) errors.push('product_intelligence_readiness_invalid')

  return {
    ok: errors.length === 0,
    errors,
  }
}

export function validateOperatorGovernanceFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const runtimeHealth = buildRuntimeResilienceSnapshotFromCounts({
    callbackReplayAttempts: 0,
    paymentReplayAttempts: 0,
    webhookInvalid: 0,
    telegramCallbackEvents: 1,
    paymentSuccessEvents: 1,
    flowTriggeredEvents: 1,
    notificationJobs: 0,
    notificationSent: 0,
  })

  if (runtimeHealth.breaker_state !== 'closed') {
    errors.push('operator_runtime_health_invalid')
  }

  const featureCatalog = getFeatureFlagCatalog()
  if (featureCatalog.length !== FEATURE_FLAG_NAMES.length) {
    errors.push('operator_feature_catalog_invalid')
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

export function validateLaunchGovernanceFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const sample = resolveFeatureGate({
    flagName: 'launch_governance',
    tenantId: 'tenant-launch',
    userId: 'user-launch',
    environment: 'production',
  })

  if (typeof sample.enabled !== 'boolean') errors.push('launch_feature_gate_invalid')
  if (!validateFeatureFlagFoundation().ok) errors.push('launch_feature_flag_invalid')

  return {
    ok: errors.length === 0,
    errors,
  }
}
