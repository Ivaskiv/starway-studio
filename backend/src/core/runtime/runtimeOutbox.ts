import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { buildRuntimeTelemetry, claimRuntimeEventReplay, withRuntimeAdvisoryLock, type RuntimeIdempotencyInput } from './runtimeIdempotency.js'

export type RuntimeOutboxItem = {
  scope: string
  type: string
  source: string
  userId?: string | null
  state?: string | null
  tenantId?: string | null
  payload?: Prisma.InputJsonValue
  runAt?: Date
  runtime?: Partial<RuntimeIdempotencyInput>
}

const OUTBOX_TTL_MS = 15 * 60_000
const OUTBOX_LOCK_SCOPE = 'runtime_outbox'
const RUNTIME_OUTBOX_POLL_INTERVAL_MS = 5_000
let runtimeOutboxPollTimer: NodeJS.Timeout | null = null

function buildOutboxDedupeKey(input: RuntimeOutboxItem) {
  const runtime = buildRuntimeTelemetry({
    scope: input.scope,
    type: input.type,
    source: input.source,
    userId: input.userId ?? null,
    state: input.state ?? null,
    tenantId: input.tenantId ?? null,
    payload: (input.payload ?? null) as Prisma.JsonValue,
    requestFingerprint: input.runtime?.requestFingerprint ?? null,
    correlationId: input.runtime?.correlationId ?? null,
    requestId: input.runtime?.requestId ?? null,
    flowExecutionId: input.runtime?.flowExecutionId ?? null,
    replayTraceId: input.runtime?.replayTraceId ?? null,
    runtimeStage: input.runtime?.runtimeStage ?? input.state ?? input.type,
    orchestrationPath: input.runtime?.orchestrationPath,
    retryAttempt: input.runtime?.retryAttempt ?? 0,
    replayReason: input.runtime?.replayReason ?? null,
    executionLatencyMs: input.runtime?.executionLatencyMs ?? null,
    queueLatencyMs: input.runtime?.queueLatencyMs ?? null,
    deliveryLatencyMs: input.runtime?.deliveryLatencyMs ?? null,
    handlerDurationMs: input.runtime?.handlerDurationMs ?? null,
    failureClassification: input.runtime?.failureClassification ?? null,
  })

  return runtime.idempotency_key
}

export async function enqueueRuntimeOutboxItem(input: RuntimeOutboxItem): Promise<{ duplicate: boolean; dedupeKey: string }> {
  const dedupeKey = buildOutboxDedupeKey(input)
  const runAt = input.runAt ?? new Date()
  const payload = {
    ...(typeof input.payload === 'object' && input.payload !== null && !Array.isArray(input.payload)
      ? input.payload as Prisma.JsonObject
      : {}),
    runtime: {
      scope: input.scope,
      type: input.type,
      source: input.source,
      userId: input.userId ?? null,
      state: input.state ?? null,
      tenantId: input.tenantId ?? null,
      idempotency_key: dedupeKey,
      request_id: input.runtime?.requestId ?? null,
      correlation_id: input.runtime?.correlationId ?? null,
      flow_execution_id: input.runtime?.flowExecutionId ?? null,
      replay_trace_id: input.runtime?.replayTraceId ?? null,
      runtime_stage: input.runtime?.runtimeStage ?? input.state ?? input.type,
      orchestration_path: input.runtime?.orchestrationPath ?? [input.scope, input.type],
      retry_attempt: input.runtime?.retryAttempt ?? 0,
      replay_reason: input.runtime?.replayReason ?? null,
    },
  } satisfies Prisma.JsonObject

  const existing = await prisma.runtimeOutbox.findUnique({
    where: { dedupeKey },
    select: { id: true, createdAt: true, status: true },
  }).catch(() => null)

  if (existing) {
    return { duplicate: true, dedupeKey }
  }

  await prisma.runtimeOutbox.create({
    data: {
      scope: input.scope,
      type: input.type,
      source: input.source,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.state ? { state: input.state } : {}),
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      payload: payload as Prisma.InputJsonValue,
      runAt,
      dedupeKey,
    },
  })

  return { duplicate: false, dedupeKey }
}

export async function processRuntimeOutbox(limit = 100): Promise<number> {
  return withRuntimeAdvisoryLock({
    scope: OUTBOX_LOCK_SCOPE,
    type: 'process',
    source: 'internal',
    requestFingerprint: 'runtime-outbox',
    runtimeStage: 'outbox',
  }, async () => {
    const due = await prisma.runtimeOutbox.findMany({
      where: {
        status: 'PENDING',
        runAt: { lte: new Date() },
      },
      orderBy: [{ runAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    })

    let processed = 0
    for (const item of due) {
      const payload = item.payload as Prisma.JsonObject | null
      const runtime = payload?.runtime && typeof payload.runtime === 'object' && !Array.isArray(payload.runtime)
        ? payload.runtime as Record<string, unknown>
        : {}

      const replay = await claimRuntimeEventReplay({
        scope: item.scope,
        type: item.type,
        source: item.source,
        userId: item.userId ?? null,
        state: item.state ?? null,
        tenantId: item.tenantId ?? null,
        requestFingerprint: typeof runtime.request_id === 'string' ? runtime.request_id : item.dedupeKey,
        payload,
        ttlMs: OUTBOX_TTL_MS,
      })

      if (replay.duplicate) {
        await prisma.runtimeOutbox.update({
          where: { id: item.id },
          data: {
            status: 'DONE',
            processedAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
          },
        }).catch(() => undefined)
        continue
      }

      await prisma.event.create({
        data: {
          ...(item.userId ? { userId: item.userId } : {}),
          type: item.type,
          source: item.source,
          ...(item.state ? { state: item.state } : {}),
          payload: payload as Prisma.InputJsonValue,
        },
      })

      await prisma.runtimeOutbox.update({
        where: { id: item.id },
        data: {
          status: 'DONE',
          processedAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      }).catch(() => undefined)

      processed += 1
    }

    return processed
  }).then(result => result.acquired ? result.value : 0)
}

export function startRuntimeOutboxAutoProcessor(limit = 100): void {
  if (process.env.SCHEDULER_AUTO_START !== 'true') return
  if (runtimeOutboxPollTimer) return

  runtimeOutboxPollTimer = setInterval(() => {
    void processRuntimeOutbox(limit).catch((error) => {
      console.error('[RuntimeOutbox] auto process failed', error)
    })
  }, RUNTIME_OUTBOX_POLL_INTERVAL_MS)
  runtimeOutboxPollTimer.unref()
}

export function stopRuntimeOutboxAutoProcessor(): void {
  if (!runtimeOutboxPollTimer) return
  clearInterval(runtimeOutboxPollTimer)
  runtimeOutboxPollTimer = null
}

startRuntimeOutboxAutoProcessor()

export function validateRuntimeOutboxFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const dedupeKey = buildOutboxDedupeKey({
    scope: 'validation',
    type: 'runtime_outbox',
    source: 'internal',
    userId: 'validation-user',
    state: 'validation',
    tenantId: 'validation-tenant',
    payload: { ok: true },
  })

  if (!dedupeKey) {
    errors.push('missing_outbox_dedupe_key')
  }

  return { ok: errors.length === 0, errors }
}
