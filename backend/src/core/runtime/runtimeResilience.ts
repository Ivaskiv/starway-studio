import { prisma } from '../../db/client.js'
import { buildRuntimeReplayDiagnostics, type RuntimeIdempotencyInput } from './runtimeIdempotency.js'

export type RuntimeCircuitBreakerName =
  | 'telegram_failure_breaker'
  | 'payment_webhook_breaker'
  | 'notification_flood_breaker'
  | 'analytics_overload_breaker'
  | 'retry_storm_breaker'
  | 'orchestration_amplification_breaker'

export type RuntimeCircuitBreakerState = 'closed' | 'degraded' | 'open'

export type RuntimeResilienceSnapshot = {
  breaker_state: RuntimeCircuitBreakerState
  breaker_name: RuntimeCircuitBreakerName | null
  failure_classification: string | null
  degradation_classification: string | null
  infra_risk_marker: string | null
  throttling_marker: string | null
  replay_chain_diagnostics: Awaited<ReturnType<typeof buildRuntimeReplayDiagnostics>> | null
}

type ResilienceCounts = {
  callbackReplayAttempts: number
  paymentReplayAttempts: number
  webhookInvalid: number
  telegramCallbackEvents: number
  paymentSuccessEvents: number
  flowTriggeredEvents: number
  notificationJobs: number
  notificationSent: number
}

const TELEGRAM_BREAKER_THRESHOLD = 12
const PAYMENT_BREAKER_THRESHOLD = 6
const NOTIFICATION_BREAKER_THRESHOLD = 80
const ANALYTICS_BREAKER_THRESHOLD = 200
const RETRY_BREAKER_THRESHOLD = 8
const ORCHESTRATION_BREAKER_THRESHOLD = 60

function countState(count: number, openThreshold: number, degradedThreshold = Math.max(2, Math.floor(openThreshold / 2))): RuntimeCircuitBreakerState {
  if (count >= openThreshold) return 'open'
  if (count >= degradedThreshold) return 'degraded'
  return 'closed'
}

function resolveBreaker(counts: ResilienceCounts): RuntimeCircuitBreakerName | null {
  const telegramState = countState(counts.callbackReplayAttempts + counts.telegramCallbackEvents, TELEGRAM_BREAKER_THRESHOLD)
  if (telegramState !== 'closed') return 'telegram_failure_breaker'

  const paymentState = countState(counts.paymentReplayAttempts + counts.paymentSuccessEvents + counts.webhookInvalid, PAYMENT_BREAKER_THRESHOLD)
  if (paymentState !== 'closed') return 'payment_webhook_breaker'

  const notificationState = countState(counts.notificationJobs + counts.notificationSent, NOTIFICATION_BREAKER_THRESHOLD)
  if (notificationState !== 'closed') return 'notification_flood_breaker'

  const analyticsState = countState(counts.flowTriggeredEvents, ANALYTICS_BREAKER_THRESHOLD)
  if (analyticsState !== 'closed') return 'analytics_overload_breaker'

  const retryState = countState(counts.callbackReplayAttempts + counts.paymentReplayAttempts, RETRY_BREAKER_THRESHOLD)
  if (retryState !== 'closed') return 'retry_storm_breaker'

  const orchestrationState = countState(counts.flowTriggeredEvents + counts.telegramCallbackEvents, ORCHESTRATION_BREAKER_THRESHOLD)
  if (orchestrationState !== 'closed') return 'orchestration_amplification_breaker'

  return null
}

function buildCounts(
  counts: ResilienceCounts,
): RuntimeResilienceSnapshot {
  const breakerName = resolveBreaker(counts)
  const breakerState = breakerName
    ? (counts.callbackReplayAttempts + counts.paymentReplayAttempts + counts.telegramCallbackEvents + counts.flowTriggeredEvents > 2 * TELEGRAM_BREAKER_THRESHOLD
      ? 'open'
      : 'degraded')
    : 'closed'

  const failureClassification = breakerName
    ? breakerName.replaceAll('_', '.')
    : null

  const degradationClassification =
    breakerState === 'open'
      ? 'runtime_degraded'
      : breakerState === 'degraded'
        ? 'runtime_throttled'
        : null

  const infraRiskMarker =
    counts.callbackReplayAttempts > 0 || counts.webhookInvalid > 0 || counts.paymentReplayAttempts > 0
      ? 'replay_or_webhook_pressure'
      : counts.notificationJobs > 0
        ? 'notification_pressure'
        : counts.flowTriggeredEvents > 0
          ? 'orchestration_pressure'
          : null

  const throttlingMarker =
    counts.callbackReplayAttempts > 2
      ? 'callback_throttle'
      : counts.paymentReplayAttempts > 1
        ? 'payment_throttle'
        : counts.notificationJobs > NOTIFICATION_BREAKER_THRESHOLD / 2
          ? 'notification_throttle'
          : null

  return {
    breaker_state: breakerState,
    breaker_name: breakerName,
    failure_classification: failureClassification,
    degradation_classification: degradationClassification,
    infra_risk_marker: infraRiskMarker,
    throttling_marker: throttlingMarker,
    replay_chain_diagnostics: null,
  }
}

export function buildRuntimeResilienceSnapshotFromCounts(counts: ResilienceCounts): RuntimeResilienceSnapshot {
  return buildCounts(counts)
}

export async function buildRuntimeResilienceSnapshot(input: RuntimeIdempotencyInput & { includeDiagnostics?: boolean }): Promise<RuntimeResilienceSnapshot> {
  const lookback = new Date(Date.now() - 15 * 60_000)
  const userId = input.userId ?? null

  const [
    callbackReplayAttempts,
    paymentReplayAttempts,
    webhookInvalid,
    telegramCallbackEvents,
    paymentSuccessEvents,
    flowTriggeredEvents,
    notificationJobs,
    notificationSent,
  ] = await Promise.all([
    prisma.event.count({
      where: {
        ...(userId ? { userId } : {}),
        type: 'callback_replay_attempt',
        createdAt: { gte: lookback },
      },
    }).catch(() => 0),
    prisma.event.count({
      where: {
        ...(userId ? { userId } : {}),
        type: 'payment_callback_replay_attempt',
        createdAt: { gte: lookback },
      },
    }).catch(() => 0),
    prisma.event.count({
      where: {
        ...(userId ? { userId } : {}),
        type: 'billing_webhook_invalid',
        createdAt: { gte: lookback },
      },
    }).catch(() => 0),
    prisma.event.count({
      where: {
        ...(userId ? { userId } : {}),
        type: 'CTA_CLICKED',
        createdAt: { gte: lookback },
      },
    }).catch(() => 0),
    prisma.event.count({
      where: {
        ...(userId ? { userId } : {}),
        type: 'payment_success',
        createdAt: { gte: lookback },
      },
    }).catch(() => 0),
    prisma.event.count({
      where: {
        ...(userId ? { userId } : {}),
        type: 'FLOW_TRIGGERED',
        createdAt: { gte: lookback },
      },
    }).catch(() => 0),
    prisma.notificationJob.count({
      where: {
        createdAt: { gte: lookback },
      },
    }).catch(() => 0),
    prisma.notification.count({
      where: {
        ...(userId ? { userId } : {}),
        createdAt: { gte: lookback },
      },
    }).catch(() => 0),
  ])

  const snapshot = buildCounts({
    callbackReplayAttempts,
    paymentReplayAttempts,
    webhookInvalid,
    telegramCallbackEvents,
    paymentSuccessEvents,
    flowTriggeredEvents,
    notificationJobs,
    notificationSent,
  })

  if (input.includeDiagnostics && userId) {
    snapshot.replay_chain_diagnostics = await buildRuntimeReplayDiagnostics(userId, 12).catch(() => null)
  }

  return snapshot
}

export function validateRuntimeResilienceFoundation() {
  const snapshot = buildRuntimeResilienceSnapshotFromCounts({
    callbackReplayAttempts: 0,
    paymentReplayAttempts: 0,
    webhookInvalid: 0,
    telegramCallbackEvents: 1,
    paymentSuccessEvents: 1,
    flowTriggeredEvents: 2,
    notificationJobs: 1,
    notificationSent: 1,
  })

  const degraded = buildRuntimeResilienceSnapshotFromCounts({
    callbackReplayAttempts: 8,
    paymentReplayAttempts: 0,
    webhookInvalid: 1,
    telegramCallbackEvents: 4,
    paymentSuccessEvents: 0,
    flowTriggeredEvents: 0,
    notificationJobs: 0,
    notificationSent: 0,
  })

  const errors: string[] = []
  if (snapshot.breaker_state !== 'closed') errors.push('resilience_closed_state_invalid')
  if (degraded.breaker_state === 'closed') errors.push('resilience_degraded_state_invalid')
  if (!degraded.breaker_name) errors.push('resilience_breaker_missing')
  return { ok: errors.length === 0, errors }
}
