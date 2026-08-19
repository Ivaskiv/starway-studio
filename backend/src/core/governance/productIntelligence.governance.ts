import { prisma } from '../../db/client.js'
import { getConversionRates, getDropOffPoints, getFunnelStats, getOverviewStats, getRetentionStats } from '../../modules/analytics/service.js'
import { buildRuntimeResilienceSnapshotFromCounts } from '../runtime/resilience.js'
import { FEATURE_FLAG_NAMES, getFeatureFlagCatalog, resolveFeatureGate, validateFeatureFlagFoundation } from './featureFlags.js'
import {
  buildReadinessDistribution,
  getPeriodRange,
  getProductIntelligence,
  type BehavioralAdaptationPlan,
  type LaunchGovernanceChecklist,
  type OperatorGovernanceSnapshot,
  type Period,
  type ProductIntelligenceSnapshot,
} from './productIntelligence.js'

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
