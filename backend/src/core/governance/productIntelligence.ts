/**
 * Product intelligence owner.
 * Aggregates product events and analytics into a canonical snapshot:
 * readiness, CTA/message/result effectiveness, Zoom/payment/retention,
 * churn signals, lifecycle bottlenecks and conversion paths.
 * Consumed by governance/adaptive decision layers; does not control runtime directly.
 */
import {
  buildBehavioralAnalyticsSnapshot,
  type BehavioralEventRecord,
} from '../../modules/analytics/behavioral.js'
import {
  getAIInsights,
  getConversionRates,
  getDropOffPoints,
  getFunnelStats,
  getOverviewStats,
  getRetentionStats,
} from '../../modules/analytics/service.js'
import type { RuntimeResilienceSnapshot } from '../runtime/resilience.js'
import {
  asNumber,
  buildChurnSignals,
  buildEffectivenessRankings,
  buildReadinessDistribution,
  getStringField,
  loadEvents,
  normalizeText,
  rankPaths,
} from './productIntelligence.analytics.js'

export type Period = '7d' | '30d' | '90d'

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

export async function getProductIntelligence(
  period: Period = '30d',
  input?: { productId?: string | null }
): Promise<ProductIntelligenceSnapshot> {
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
  const churnCorrelation = buildChurnSignals(
    behavioral,
    dropOffs.map((item) => ({
      from: item.from,
      to: item.to,
      dropOffRate: item.dropOffRate,
      lostUsers: item.lostUsers,
    }))
  )

  const zoomRegistered = events.filter((event) => {
    const canonical =
      normalizeText(
        getStringField(event.payload, ['canonical_event', 'canonicalEvent'])
      ) ?? event.type
    return canonical === 'ZOOM_REGISTERED'
  }).length
  const zoomAttended = events.filter((event) => {
    const canonical =
      normalizeText(
        getStringField(event.payload, ['canonical_event', 'canonicalEvent'])
      ) ?? event.type
    return canonical === 'ZOOM_ATTENDED'
  }).length
  const paymentStarted = events.filter((event) => {
    const canonical =
      normalizeText(
        getStringField(event.payload, ['canonical_event', 'canonicalEvent'])
      ) ?? event.type
    return canonical === 'PAYMENT_STARTED'
  }).length
  const paymentSuccess = events.filter((event) => {
    const canonical =
      normalizeText(
        getStringField(event.payload, ['canonical_event', 'canonicalEvent'])
      ) ?? event.type
    return canonical === 'PAYMENT_SUCCESS' || canonical === 'payment_success'
  }).length
  const paymentFailed = events.filter((event) => {
    const canonical =
      normalizeText(
        getStringField(event.payload, ['canonical_event', 'canonicalEvent'])
      ) ?? event.type
    return canonical === 'PAYMENT_FAILED'
  }).length

  const upgradeEffectiveness = {
    payment_started_users: paymentStarted,
    payment_success_users: paymentSuccess,
    payment_abandonment_rate:
      paymentStarted > 0
        ? Math.round(
            ((paymentStarted - paymentSuccess) / paymentStarted) * 1000
          ) / 10
        : 0,
    upgrade_rate:
      paymentStarted > 0
        ? Math.round((paymentSuccess / paymentStarted) * 1000) / 10
        : 0,
    average_time_to_purchase_ms: asNumber(behavioral.metrics.time_to_purchase),
  }

  const zoomEffectiveness = {
    registered_users: zoomRegistered,
    attended_users: zoomAttended,
    attendance_rate:
      zoomRegistered > 0
        ? Math.round((zoomAttended / zoomRegistered) * 1000) / 10
        : 0,
    dropout_count: Math.max(0, zoomRegistered - zoomAttended),
  }

  const retentionEffectiveness = {
    day1: retention.day1,
    day3: retention.day3,
    day7: retention.day7,
    churn_prediction: (churnCorrelation.churn_risk_score >= 70
      ? 'high'
      : churnCorrelation.churn_risk_score >= 40
        ? 'medium'
        : 'low') as ProductIntelligenceSnapshot['retention_effectiveness']['churn_prediction'],
    lifecycle_decay_score:
      Math.round(asNumber(behavioral.metrics.retention_risk_score) * 10) / 10,
    emotional_disengagement_markers: [
      ...new Set([
        ...(asNumber(behavioral.metrics.retention_risk_score) >= 60
          ? ['high_retention_risk']
          : []),
        ...(behavioral.dropOffPatterns.payment_abandoned > 0
          ? ['payment_abandoned']
          : []),
        ...(behavioral.dropOffPatterns.joined_no_zoom > 0
          ? ['zoom_dropout']
          : []),
      ]),
    ],
    habit_break_detection:
      (behavioral.retentionMarkers.no_reply_streak ?? 0) > 0,
    zoom_dropout_detection: behavioral.dropOffPatterns.joined_no_zoom > 0,
    upgrade_fatigue_detection: paymentFailed > 0 && paymentSuccess === 0,
  }

  const conversionPathRanking = rankPaths(
    events,
    [
      [
        'TEST_STARTED',
        'RESULT_OPENED',
        'CTA_CLICKED',
        'PAYMENT_STARTED',
        'PAYMENT_SUCCESS',
      ],
      [
        'RESULT_OPENED',
        'CTA_CLICKED',
        'ZOOM_REGISTERED',
        'ZOOM_ATTENDED',
        'FLOW_COMPLETED',
      ],
      ['MESSAGE_OPENED', 'CTA_CLICKED', 'FLOW_TRIGGERED', 'FLOW_COMPLETED'],
      ['MESSAGE_OPENED', 'RESTORE_PROGRESS', 'FLOW_COMPLETED'],
    ],
    (userEvents) =>
      userEvents.some((event) => {
        const canonical =
          normalizeText(
            getStringField(event.payload, ['canonical_event', 'canonicalEvent'])
          ) ?? event.type
        return [
          'PAYMENT_SUCCESS',
          'subscription_activated',
          'ZOOM_ATTENDED',
          'FLOW_COMPLETED',
        ].includes(canonical)
      })
  )

  const bestRetentionPath =
    conversionPathRanking.find((item) =>
      item.path.includes('RESTORE_PROGRESS')
    ) ?? null
  const bestUpgradePath =
    conversionPathRanking.find((item) =>
      item.path.includes('PAYMENT_SUCCESS')
    ) ?? null
  const bestReturnPath =
    conversionPathRanking.find(
      (item) =>
        item.path.includes('MESSAGE_OPENED') &&
        item.path.includes('FLOW_COMPLETED')
    ) ?? null

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
    lifecycle_bottlenecks: dropOffs.map((item) => ({
      from: item.from,
      to: item.to,
      dropOffRate: item.dropOffRate,
      lostUsers: item.lostUsers,
    })),
    behavioral_cluster_patterns: {
      top_intents: aiInsights.topIntents,
      top_problems: aiInsights.topProblems,
      top_categories: aiInsights.topCategories,
      top_results: Object.entries(
        behavioral.metrics.result_distribution as Record<string, number>
      )
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

export { buildReadinessDistribution, getPeriodRange } from './productIntelligence.analytics.js'

export {
  buildBehavioralAdaptationPlan,
  buildRetentionIntelligence,
  getLaunchGovernanceChecklist,
  getOperatorGovernanceSnapshot,
  validateLaunchGovernanceFoundation,
  validateOperatorGovernanceFoundation,
} from './productIntelligence.governance.js'
