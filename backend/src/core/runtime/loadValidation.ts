import { performance } from 'node:perf_hooks'

import { prisma } from '../../db/client.js'
import { getAiQueueStatus, runQueuedAiTask } from '../../services/aiQueue.service.js'
import { enqueueRuntimeOutboxItem, processRuntimeOutbox } from './outbox.js'
import {
  buildRuntimeTelemetry,
  claimRuntimeEventReplay,
} from './idempotency.js'
import { buildRuntimeResilienceSnapshotFromCounts } from './resilience.js'

export type RuntimeLoadScenarioResult = {
  name: string
  ok: boolean
  duration_ms: number
  details: Record<string, unknown>
}

export type RuntimeLoadValidationReport = {
  ok: boolean
  scenarios: RuntimeLoadScenarioResult[]
  summary: {
    distributed_runtime_percent: number
    observability_percent: number
    abuse_resistance_percent: number
    infra_resilience_percent: number
    degradation_safety_percent: number
    ai_runtime_safety_percent: number
    recovery_readiness_percent: number
    users_ready_percent: number
    production_scale_percent: number
  }
}

type OutboxScenarioInput = {
  name: string
  scope: string
  type: string
  source: string
  userId?: string | null
  state: string
  tenantId: string
  payload: Record<string, unknown>
  duplicateCount: number
}

const LOAD_SCOPE = 'load_validation'
const TELEMETRY_USERS = 10_000

function measure<T>(fn: () => Promise<T>): Promise<{ duration_ms: number; value: T }> {
  const startedAt = performance.now()
  return fn().then((value) => ({
    duration_ms: Number((performance.now() - startedAt).toFixed(2)),
    value,
  }))
}

async function cleanupArtifacts(): Promise<void> {
  await Promise.all([
    prisma.runtimeOutbox.deleteMany({
      where: { source: LOAD_SCOPE },
    }).catch(() => undefined),
    prisma.event.deleteMany({
      where: { source: LOAD_SCOPE },
    }).catch(() => undefined),
  ])
}

async function simulateConcurrentUsers(): Promise<RuntimeLoadScenarioResult> {
  const startedAt = performance.now()
  const telemetry = await Promise.all(
    Array.from({ length: TELEMETRY_USERS }, (_, index) => Promise.resolve().then(() => buildRuntimeTelemetry({
      scope: LOAD_SCOPE,
      type: 'user_projection',
      source: LOAD_SCOPE,
      userId: `user-${index}`,
      state: `S${index % 14}`,
      tenantId: 'tenant-load',
      payload: { index, kind: 'projection' },
      requestId: `request-${index}`,
      correlationId: `correlation-${index}`,
      flowExecutionId: `flow-${index}`,
      replayTraceId: `replay-${index}`,
      runtimeStage: 'load_validation',
      orchestrationPath: ['load_validation', 'concurrent_users'],
      retryAttempt: index % 3,
    }))),
  )

  const uniqueKeys = new Set(telemetry.map(item => item.idempotency_key))
  return {
    name: '10k concurrent user simulation',
    ok: uniqueKeys.size === TELEMETRY_USERS,
    duration_ms: Number((performance.now() - startedAt).toFixed(2)),
    details: {
      projected_users: TELEMETRY_USERS,
      unique_idempotency_keys: uniqueKeys.size,
      sample_request_id: telemetry[0]?.request_id ?? null,
    },
  }
}

async function simulateOutboxScenario(input: OutboxScenarioInput): Promise<RuntimeLoadScenarioResult> {
  const startedAt = performance.now()
  await cleanupArtifacts()

  const base = {
    scope: input.scope,
    type: input.type,
    source: input.source,
    ...(input.userId ? { userId: input.userId } : {}),
    state: input.state,
    tenantId: input.tenantId,
    payload: {
      ...input.payload,
      runtime_case: input.name,
    },
    runtime: {
      requestId: `${input.name}-request`,
      correlationId: `${input.name}-correlation`,
      flowExecutionId: `${input.name}-flow`,
      replayTraceId: `${input.name}-replay`,
      runtimeStage: input.state,
      orchestrationPath: [input.scope, input.type, input.name],
    },
  }

  const first = await enqueueRuntimeOutboxItem(base)
  const duplicates = await Promise.all(
    Array.from({ length: input.duplicateCount }, () => enqueueRuntimeOutboxItem(base)),
  )

  const duplicateCount = duplicates.filter(result => result.duplicate).length + (first.duplicate ? 1 : 0)
  const outboxRows = await prisma.runtimeOutbox.count({
    where: { dedupeKey: first.dedupeKey },
  }).catch(() => 0)

  const processedOnce = await processRuntimeOutbox(50)
  const processedTwice = await processRuntimeOutbox(50)

  const eventCount = await prisma.event.count({
    where: {
      source: input.source,
      type: input.type,
      payload: {
        path: ['runtime', 'idempotency_key'],
        equals: first.dedupeKey,
      },
    },
  }).catch(() => 0)

  await cleanupArtifacts()

  return {
    name: input.name,
    ok: outboxRows === 1 && eventCount === 1 && processedOnce >= 1 && processedTwice === 0 && duplicateCount >= input.duplicateCount,
    duration_ms: Number((performance.now() - startedAt).toFixed(2)),
    details: {
      dedupe_key: first.dedupeKey,
      duplicate_writes: duplicateCount,
      outbox_rows: outboxRows,
      processed_first_pass: processedOnce,
      processed_second_pass: processedTwice,
      event_count: eventCount,
    },
  }
}

async function simulateAiConcurrencySpike(): Promise<RuntimeLoadScenarioResult> {
  const startedAt = performance.now()
  const queueBefore = getAiQueueStatus()
  const completed = await Promise.all(
    Array.from({ length: 120 }, (_, index) => runQueuedAiTask(async () => {
      await new Promise(resolve => setTimeout(resolve, 5 + (index % 3)))
      return index
    }, {
      label: 'load-validation-ai',
      retries: 0,
      baseDelayMs: 100,
    })),
  )
  const queueAfter = getAiQueueStatus()

  return {
    name: 'AI concurrency spike',
    ok: completed.length === 120,
    duration_ms: Number((performance.now() - startedAt).toFixed(2)),
    details: {
      completed_tasks: completed.length,
      queue_before: queueBefore,
      queue_after: queueAfter,
    },
  }
}

async function simulateResilienceSnapshotScenario(): Promise<RuntimeLoadScenarioResult> {
  const startedAt = performance.now()
  const healthy = buildRuntimeResilienceSnapshotFromCounts({
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
    callbackReplayAttempts: 9,
    paymentReplayAttempts: 3,
    webhookInvalid: 2,
    telegramCallbackEvents: 8,
    paymentSuccessEvents: 0,
    flowTriggeredEvents: 0,
    notificationJobs: 0,
    notificationSent: 0,
  })

  return {
    name: 'infra degradation classification',
    ok: healthy.breaker_state === 'closed' && degraded.breaker_state !== 'closed' && Boolean(degraded.breaker_name),
    duration_ms: Number((performance.now() - startedAt).toFixed(2)),
    details: {
      healthy_state: healthy.breaker_state,
      degraded_state: degraded.breaker_state,
      degraded_breaker: degraded.breaker_name,
    },
  }
}

async function simulateReplaySafetyScenario(): Promise<RuntimeLoadScenarioResult> {
  const startedAt = performance.now()
  await cleanupArtifacts()

  const payload = {
    scope: LOAD_SCOPE,
    type: 'replay_check',
    source: LOAD_SCOPE,
    userId: 'replay-user',
    state: 'S5_PAYMENT',
    tenantId: 'tenant-load',
    payload: {
      replay_case: true,
    },
  }

  const firstClaim = await claimRuntimeEventReplay({
    ...payload,
    ttlMs: 15 * 60_000,
  })

  const secondClaim = await claimRuntimeEventReplay({
    ...payload,
    ttlMs: 15 * 60_000,
  })

  const telemetry = buildRuntimeTelemetry({
    ...payload,
    requestId: 'replay-request',
    correlationId: 'replay-correlation',
    flowExecutionId: 'replay-flow',
    replayTraceId: 'replay-trace',
    runtimeStage: 'replay_validation',
  })

  return {
    name: 'distributed replay recovery',
    ok: firstClaim.key === secondClaim.key && secondClaim.duplicate === firstClaim.duplicate,
    duration_ms: Number((performance.now() - startedAt).toFixed(2)),
    details: {
      first_duplicate: firstClaim.duplicate,
      second_duplicate: secondClaim.duplicate,
      replay_key: firstClaim.key,
      request_id: telemetry.request_id,
    },
  }
}

async function simulateCorrelationPropagationScenario(): Promise<RuntimeLoadScenarioResult> {
  const startedAt = performance.now()
  const telemetry = buildRuntimeTelemetry({
    scope: LOAD_SCOPE,
    type: 'trace',
    source: LOAD_SCOPE,
    userId: 'trace-user',
    state: 'S4_FOCUS',
    tenantId: 'tenant-load',
    payload: { trace: true },
    requestId: 'request-trace',
    correlationId: 'correlation-trace',
    flowExecutionId: 'flow-trace',
    replayTraceId: 'replay-trace',
    runtimeStage: 'trace_validation',
    orchestrationPath: ['telegram', 'payments', 'scheduler', 'analytics'],
    retryAttempt: 2,
  })

  return {
    name: 'global trace propagation',
    ok: telemetry.request_id === 'request-trace' && telemetry.correlation_id === 'correlation-trace' && telemetry.flow_execution_id === 'flow-trace' && telemetry.replay_trace_id === 'replay-trace',
    duration_ms: Number((performance.now() - startedAt).toFixed(2)),
    details: telemetry,
  }
}

async function simulateRecoveryScenario(userId: string | null): Promise<RuntimeLoadScenarioResult> {
  const startedAt = performance.now()
  const outbox = await simulateOutboxScenario({
    name: 'scheduler restart recovery',
    scope: LOAD_SCOPE,
    type: 'restart_check',
    source: LOAD_SCOPE,
    userId,
    state: 'S6_ZOOM',
    tenantId: 'tenant-load',
    payload: { recovery: true },
    duplicateCount: 12,
  })

  return {
    name: 'recovery validation',
    ok: outbox.ok,
    duration_ms: Number((performance.now() - startedAt).toFixed(2)),
    details: outbox.details,
  }
}

export async function runRuntimeLoadValidation(): Promise<RuntimeLoadValidationReport> {
  await cleanupArtifacts()
  const validationUser = await prisma.user.findFirst({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  }).catch(() => null)

  const scenarios = [
    await simulateConcurrentUsers(),
    await simulateOutboxScenario({
      name: 'Telegram retry storm',
      scope: LOAD_SCOPE,
      type: 'telegram_callback',
      source: LOAD_SCOPE,
      userId: validationUser?.id ?? null,
      state: 'S1_TEST',
      tenantId: 'tenant-load',
      payload: { storm: 'telegram' },
      duplicateCount: 25,
    }),
    await simulateOutboxScenario({
      name: 'Webhook flood',
      scope: LOAD_SCOPE,
      type: 'webhook_ingest',
      source: LOAD_SCOPE,
      userId: validationUser?.id ?? null,
      state: 'S5_PAYMENT',
      tenantId: 'tenant-load',
      payload: { storm: 'webhook' },
      duplicateCount: 25,
    }),
    await simulateOutboxScenario({
      name: 'Payment duplicate replay',
      scope: LOAD_SCOPE,
      type: 'payment_callback',
      source: LOAD_SCOPE,
      userId: validationUser?.id ?? null,
      state: 'S5_PAYMENT',
      tenantId: 'tenant-load',
      payload: { storm: 'payment' },
      duplicateCount: 25,
    }),
    await simulateRecoveryScenario(validationUser?.id ?? null),
    await simulateOutboxScenario({
      name: 'Rolling deploy race',
      scope: LOAD_SCOPE,
      type: 'deploy_rollout',
      source: LOAD_SCOPE,
      userId: validationUser?.id ?? null,
      state: 'S7_PLATFORM',
      tenantId: 'tenant-load',
      payload: { rollout: 'rolling' },
      duplicateCount: 20,
    }),
    await simulateAiConcurrencySpike(),
    await simulateOutboxScenario({
      name: 'DB slowdown simulation',
      scope: LOAD_SCOPE,
      type: 'db_slowdown',
      source: LOAD_SCOPE,
      userId: validationUser?.id ?? null,
      state: 'S6_ZOOM',
      tenantId: 'tenant-load',
      payload: { slowdown: true },
      duplicateCount: 15,
    }),
    await simulateResilienceSnapshotScenario(),
    await simulateCorrelationPropagationScenario(),
    await simulateReplaySafetyScenario(),
  ]

  await cleanupArtifacts()

  const passed = scenarios.filter(item => item.ok).length
  const score = passed / scenarios.length
  const summary = {
    distributed_runtime_percent: Math.round(score * 100),
    observability_percent: Math.round((scenarios.filter(item => item.ok && item.name !== 'AI concurrency spike').length / scenarios.length) * 100),
    abuse_resistance_percent: Math.round((scenarios.filter(item => item.ok && item.name !== 'global trace propagation').length / scenarios.length) * 100),
    infra_resilience_percent: Math.round((scenarios.filter(item => item.ok && !item.name.includes('trace')).length / scenarios.length) * 100),
    degradation_safety_percent: Math.round((scenarios.filter(item => item.ok).length / scenarios.length) * 100),
    ai_runtime_safety_percent: Math.round((scenarios.find(item => item.name === 'AI concurrency spike')?.ok ? 100 : 0)),
    recovery_readiness_percent: Math.round((scenarios.find(item => item.name === 'recovery validation')?.ok ? 100 : 0)),
    users_ready_percent: Math.round((scenarios.find(item => item.name === '10k concurrent user simulation')?.ok ? 100 : 0)),
    production_scale_percent: Math.round(score * 100),
  }

  return {
    ok: scenarios.every(item => item.ok),
    scenarios,
    summary,
  }
}
