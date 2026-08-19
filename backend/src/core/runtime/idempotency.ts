import crypto from 'node:crypto'

import type { NotificationType, Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'

export type RuntimeTelemetry = {
  correlation_id: string
  request_id: string
  flow_execution_id: string
  replay_trace_id: string
  runtime_stage: string
  orchestration_path: string[]
  retry_attempt: number
  replay_reason: string | null
  execution_latency_ms: number | null
  queue_latency_ms: number | null
  delivery_latency_ms: number | null
  handler_duration_ms: number | null
  failure_classification: string | null
  idempotency_key: string
  lock_key: string
  dedupe_hash: string
}

export type RuntimeIdempotencyInput = {
  scope: string
  type: string
  source?: string | null
  userId?: string | null
  state?: string | null
  tenantId?: string | null
  payload?: Prisma.JsonValue | null
  requestFingerprint?: string | null
  correlationId?: string | null
  requestId?: string | null
  flowExecutionId?: string | null
  replayTraceId?: string | null
  runtimeStage?: string | null
  orchestrationPath?: string[]
  retryAttempt?: number | null
  replayReason?: string | null
  executionLatencyMs?: number | null
  queueLatencyMs?: number | null
  deliveryLatencyMs?: number | null
  handlerDurationMs?: number | null
  failureClassification?: string | null
}

export type RuntimeReplayFence = {
  duplicate: boolean
  key: string
  existingAt: Date | null
}

export type RuntimeAdvisoryLockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false; value: null }

type SerializedInput = string | number | boolean | null | SerializedInput[] | { [key: string]: SerializedInput }

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(',')}]`
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`
  }

  return JSON.stringify(String(value))
}

function hash(value: unknown): string {
  return crypto.createHash('sha256').update(stableSerialize(value)).digest('hex')
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizePayload(payload?: Prisma.JsonValue | null): SerializedInput {
  if (!isJsonObject(payload)) {
    return payload === null || payload === undefined ? null : String(payload)
  }

  const result: Record<string, SerializedInput> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      result[key] = value.map(item => normalizePayload(item as Prisma.JsonValue))
      continue
    }

    if (isJsonObject(value)) {
      result[key] = normalizePayload(value)
      continue
    }

    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' || value === null) {
      result[key] = value
      continue
    }

    result[key] = String(value)
  }

  return result
}

export function buildRuntimeIdempotencyKey(input: RuntimeIdempotencyInput): string {
  return hash({
    scope: normalizeString(input.scope) ?? 'unknown',
    type: normalizeString(input.type) ?? 'unknown',
    source: normalizeString(input.source),
    userId: normalizeString(input.userId),
    state: normalizeString(input.state),
    tenantId: normalizeString(input.tenantId),
    requestFingerprint: normalizeString(input.requestFingerprint),
    payload: normalizePayload(input.payload),
  })
}

function toSignedInt64(hexValue: string): bigint {
  const unsigned = BigInt(`0x${hexValue.slice(0, 16)}`)
  const max = 1n << 63n
  const full = 1n << 64n
  return unsigned >= max ? unsigned - full : unsigned
}

function buildLockKey(input: RuntimeIdempotencyInput): bigint {
  return toSignedInt64(hash({
    scope: normalizeString(input.scope) ?? 'unknown',
    type: normalizeString(input.type) ?? 'unknown',
    source: normalizeString(input.source),
    userId: normalizeString(input.userId),
    state: normalizeString(input.state),
    tenantId: normalizeString(input.tenantId),
    requestFingerprint: normalizeString(input.requestFingerprint),
  }))
}

export function buildRuntimeTelemetry(input: RuntimeIdempotencyInput): RuntimeTelemetry {
  const idempotencyKey = buildRuntimeIdempotencyKey(input)
  const requestId = normalizeString(input.requestId) ?? normalizeString(input.requestFingerprint) ?? idempotencyKey.slice(0, 32)
  const correlationId = normalizeString(input.correlationId) ?? normalizeString(input.requestFingerprint) ?? requestId
  const flowExecutionId = normalizeString(input.flowExecutionId) ?? hash({
    scope: normalizeString(input.scope) ?? 'unknown',
    type: normalizeString(input.type) ?? 'unknown',
    userId: normalizeString(input.userId),
    state: normalizeString(input.state),
    correlationId,
  }).slice(0, 32)
  const replayTraceId = normalizeString(input.replayTraceId) ?? idempotencyKey
  const runtimeStage = normalizeString(input.runtimeStage) ?? normalizeString(input.state) ?? normalizeString(input.type) ?? 'unknown'
  const orchestrationPath = input.orchestrationPath?.length
    ? input.orchestrationPath.map(item => String(item)).filter(Boolean)
    : [normalizeString(input.scope) ?? 'runtime', normalizeString(input.type) ?? 'event'].filter(Boolean)

  return {
    correlation_id: correlationId,
    request_id: requestId,
    flow_execution_id: flowExecutionId,
    replay_trace_id: replayTraceId,
    runtime_stage: runtimeStage,
    orchestration_path: orchestrationPath,
    retry_attempt: Math.max(0, normalizeNumber(input.retryAttempt) ?? 0),
    replay_reason: normalizeString(input.replayReason),
    execution_latency_ms: normalizeNumber(input.executionLatencyMs),
    queue_latency_ms: normalizeNumber(input.queueLatencyMs),
    delivery_latency_ms: normalizeNumber(input.deliveryLatencyMs),
    handler_duration_ms: normalizeNumber(input.handlerDurationMs),
    failure_classification: normalizeString(input.failureClassification),
    idempotency_key: idempotencyKey,
    lock_key: buildLockKey(input).toString(),
    dedupe_hash: hash({
      scope: normalizeString(input.scope) ?? 'unknown',
      type: normalizeString(input.type) ?? 'unknown',
      userId: normalizeString(input.userId),
      state: normalizeString(input.state),
      payload: normalizePayload(input.payload),
      requestFingerprint: normalizeString(input.requestFingerprint),
    }),
  }
}

export async function claimRuntimeEventReplay(input: RuntimeIdempotencyInput & { ttlMs: number }): Promise<RuntimeReplayFence> {
  const key = buildRuntimeIdempotencyKey(input)
  const cutoff = new Date(Date.now() - Math.max(1_000, input.ttlMs))
  const existing = await prisma.event.findFirst({
    where: {
      ...(input.userId ? { userId: input.userId } : {}),
      type: input.type,
      createdAt: { gte: cutoff },
      payload: {
        path: ['runtime', 'idempotency_key'],
        equals: key,
      },
    },
    select: { id: true, createdAt: true },
  }).catch(() => null)

  return {
    duplicate: Boolean(existing),
    key,
    existingAt: existing?.createdAt ?? null,
  }
}

export async function claimRuntimeJobReplay(input: RuntimeIdempotencyInput & { ttlMs: number }): Promise<RuntimeReplayFence> {
  const key = buildRuntimeIdempotencyKey(input)
  const cutoff = new Date(Date.now() - Math.max(1_000, input.ttlMs))
  const existing = await prisma.notificationJob.findFirst({
    where: {
      type: input.type as NotificationType,
      createdAt: { gte: cutoff },
      payload: {
        path: ['runtime', 'idempotency_key'],
        equals: key,
      },
    },
    select: { id: true, createdAt: true },
  }).catch(() => null)

  return {
    duplicate: Boolean(existing),
    key,
    existingAt: existing?.createdAt ?? null,
  }
}

export async function withRuntimeAdvisoryLock<T>(
  input: RuntimeIdempotencyInput,
  task: () => Promise<T>,
): Promise<RuntimeAdvisoryLockResult<T>> {
  const lockKey = buildLockKey(input)
  const acquiredRows = await prisma.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_lock(${lockKey}) AS locked
  `.catch(() => null)

  const acquired = Boolean(acquiredRows?.[0]?.locked)
  if (!acquired) {
    return { acquired: false, value: null }
  }

  try {
    const value = await task()
    return { acquired: true, value }
  } finally {
    await prisma.$queryRaw`
      SELECT pg_advisory_unlock(${lockKey})
    `.catch(() => undefined)
  }
}

export async function buildRuntimeReplayDiagnostics(userId: string, limit = 20) {
  const [events, notifications, jobs] = await Promise.all([
    prisma.event.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        type: true,
        source: true,
        state: true,
        createdAt: true,
        payload: true,
      },
    }).catch(() => []),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(10, limit),
      select: {
        type: true,
        templateKey: true,
        status: true,
        createdAt: true,
      },
    }).catch(() => []),
    prisma.notificationJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(10, limit),
      select: {
        type: true,
        status: true,
        runAt: true,
        createdAt: true,
        payload: true,
      },
    }).catch(() => []),
  ])

  return {
    userId,
    event_chain: events.map(event => ({
      type: event.type,
      source: event.source,
      state: event.state,
      createdAt: event.createdAt.toISOString(),
      runtime: isJsonObject(event.payload) ? event.payload.runtime ?? null : null,
    })),
    notification_chain: notifications.map(notification => ({
      type: notification.type,
      templateKey: notification.templateKey,
      status: notification.status,
      createdAt: notification.createdAt.toISOString(),
    })),
    timer_chain: jobs.map(job => ({
      type: job.type,
      status: job.status,
      runAt: job.runAt.toISOString(),
      createdAt: job.createdAt.toISOString(),
    })),
  }
}

export function validateRuntimeIdempotencyFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const first = buildRuntimeTelemetry({
    scope: 'validation',
    type: 'runtime_check',
    source: 'internal',
    userId: 'validation-user',
    state: 'validation',
    payload: { test: true },
  })
  const second = buildRuntimeTelemetry({
    scope: 'validation',
    type: 'runtime_check',
    source: 'internal',
    userId: 'validation-user',
    state: 'validation',
    payload: { test: true },
  })

  if (!first.correlation_id || !first.request_id || !first.flow_execution_id || !first.replay_trace_id) {
    errors.push('missing_runtime_trace_fields')
  }

  if (first.idempotency_key !== second.idempotency_key) {
    errors.push('runtime_idempotency_not_stable')
  }

  if (!first.lock_key || !first.dedupe_hash) {
    errors.push('missing_runtime_fence_fields')
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
