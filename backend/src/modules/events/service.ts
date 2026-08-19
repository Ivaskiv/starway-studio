import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { enrichCanonicalFlowOrchestrationEvent } from '../../core/state-machine/flowOrchestrationFoundation.js'
import { enrichCanonicalCtaMessageEvent } from '../../core/state-machine/ctaFoundation.js'
import { enrichCanonicalSecurityEvent } from '../../core/state-machine/securityFoundation.js'
import { enrichBehavioralEvent } from '../analytics/behavioral.js'
import {
  buildRuntimeTelemetry,
  claimRuntimeEventReplay,
  withRuntimeAdvisoryLock,
  type RuntimeTelemetry,
} from '../../core/runtime/idempotency.js'
import { buildRuntimeResilienceSnapshot } from '../../core/runtime/resilience.js'
import { enqueueRuntimeOutboxItem } from '../../core/runtime/outbox.js'
import { UserAutoCreationDisabledError, UserCreationSource } from '../user/userCreation.service.js'
import { resolveOrCreateUser } from '../user/resolveOrCreateUser.js'

export type EventSource = 'telegram' | 'web' | 'miniapp' | 'cloudinary'

export interface TrackEventInput {
  userId?: string | null
  type: string
  source: EventSource
  state?: string | null
  payload?: Prisma.InputJsonValue
  email?: string | null
  utmSource?: string | null
  utmCampaign?: string | null
  productId?: string | null
  upsertUser?: boolean
  runtime?: Partial<RuntimeTelemetry> & {
    replay_window_ms?: number
  }
}

export interface TrackQuestionEventInput {
  userId?: string | null
  source: EventSource
  state?: string | null
  text: string
  detectedIntent: string
  productContext: 'lead_magnet' | 'trial' | 'subscription' | 'general'
  category: 'general' | 'product' | 'lead_magnet' | 'objection' | 'off_topic' | 'unknown'
}

export interface RecentUserEvent {
  type: string
  source: string
  state: string | null
  createdAt: string
  payload: Prisma.JsonValue
}

let hasWarnedAboutMissingEventTable = false
const EVENT_IDEMPOTENCY_TTL_MS = 10 * 60_000
const RESILIENCE_EVENT_PREFIXES = ['payment_', 'billing_', 'callback_', 'FLOW_', 'CTA_']
const RESILIENCE_EVENT_TYPES = new Set([
  'payment_success',
  'payment_failed',
  'payment_callback_replay_attempt',
  'payment_callback_invalid_signature',
  'billing_webhook_invalid',
  'callback_replay_attempt',
  'CTA_CLICKED',
  'FLOW_TRIGGERED',
  'FLOW_SKIPPED',
])

function isPrismaKnownError(error: unknown): error is { code?: string; meta?: unknown } {
  return typeof error === 'object' && error !== null
}

function isMissingEventTableError(error: unknown): boolean {
  if (!isPrismaKnownError(error) || error.code !== 'P2021') {
    return false
  }

  const table = typeof error.meta === 'object' && error.meta !== null && 'table' in error.meta
    ? String(error.meta.table)
    : ''

  return table.includes('Event')
}

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = String(value ?? '').trim().toLowerCase()
  return email || null
}

function buildTrackingPayload(input: TrackEventInput): Prisma.InputJsonValue | undefined {
  const tracking: Prisma.JsonObject = {
    ...(input.email ? { email: normalizeEmail(input.email) } : {}),
    ...(input.utmSource ? { utmSource: input.utmSource } : {}),
    ...(input.utmCampaign ? { utmCampaign: input.utmCampaign } : {}),
    ...(input.productId ? { productId: input.productId } : {}),
  }

  const rawPayload = typeof input.payload === 'object' && input.payload !== null && !Array.isArray(input.payload)
    ? { ...(input.payload as Prisma.JsonObject) }
    : {}

  const behavioral = enrichBehavioralEvent({
    type: input.type,
    state: input.state,
    payload: rawPayload,
  })
  const canonicalFoundation = enrichCanonicalCtaMessageEvent({
    type: input.type,
    state: input.state,
    payload: behavioral.payload,
  })
  const flowOrchestration = enrichCanonicalFlowOrchestrationEvent({
    type: input.type,
    state: input.state,
    payload: canonicalFoundation.payload,
  })
  const securityFoundation = enrichCanonicalSecurityEvent({
    type: input.type,
    state: input.state,
    payload: flowOrchestration.payload,
    tenantId: input.productId ?? null,
    userId: input.userId ?? null,
    productId: input.productId ?? null,
  })

  const payload = {
    ...securityFoundation.payload,
  }

  if (Object.keys(tracking).length > 0) {
    payload.tracking = tracking
  }

  payload.behavioral = behavioral.behavioral

  if (canonicalFoundation.canonical) {
    payload.cta_message = canonicalFoundation.canonical
  }

  if (flowOrchestration.canonical) {
    payload.flow_orchestration = flowOrchestration.canonical
  }

  if (securityFoundation.canonical) {
    payload.security = securityFoundation.canonical
  }

  return payload as Prisma.InputJsonValue
}

function buildRuntimePayload(input: TrackEventInput, basePayload: Prisma.JsonValue | null | undefined): RuntimeTelemetry {
  const security = isJsonObject(basePayload) && isJsonObject(basePayload.security)
    ? basePayload.security
    : null
  const requestFingerprint = security && typeof security.request_fingerprint === 'string'
    ? security.request_fingerprint
    : null

  return buildRuntimeTelemetry({
    scope: 'event',
    type: input.type,
    source: input.source,
    userId: input.userId ?? null,
    state: input.state ?? null,
    tenantId: input.productId ?? null,
    payload: basePayload ?? null,
    requestFingerprint,
    correlationId: input.runtime?.correlation_id ?? null,
    requestId: input.runtime?.request_id ?? null,
    flowExecutionId: input.runtime?.flow_execution_id ?? null,
    replayTraceId: input.runtime?.replay_trace_id ?? null,
    runtimeStage: input.runtime?.runtime_stage ?? input.state ?? input.type,
    orchestrationPath: input.runtime?.orchestration_path,
    retryAttempt: input.runtime?.retry_attempt ?? 0,
    replayReason: input.runtime?.replay_reason ?? null,
    executionLatencyMs: input.runtime?.execution_latency_ms ?? null,
    queueLatencyMs: input.runtime?.queue_latency_ms ?? null,
    deliveryLatencyMs: input.runtime?.delivery_latency_ms ?? null,
    handlerDurationMs: input.runtime?.handler_duration_ms ?? null,
    failureClassification: input.runtime?.failure_classification ?? null,
  })
}

function shouldAssessRuntimeResilience(input: TrackEventInput): boolean {
  return RESILIENCE_EVENT_TYPES.has(input.type) || RESILIENCE_EVENT_PREFIXES.some(prefix => input.type.startsWith(prefix))
}

async function resolveTrackingUserId(input: TrackEventInput): Promise<string | null> {
  if (input.userId) return input.userId

  const normalizedEmail = normalizeEmail(input.email)
  if (!normalizedEmail || !input.upsertUser) return null

  const resolved = await resolveOrCreateUser(
    { email: normalizedEmail },
    {
      source: UserCreationSource.TRACKING_EVENT,
      requestId: input.runtime?.request_id ?? null,
      name: normalizedEmail.split('@')[0] || 'Lead user',
      passwordHash: `lead-${Date.now().toString(36)}`,
      createData: {
        currentStep: 'START_FLOW',
        settings: {
          tracking: {
            utmSource: input.utmSource ?? null,
            utmCampaign: input.utmCampaign ?? null,
            productId: input.productId ?? null,
          },
        },
      },
    },
  ).catch((error) => {
    if (error instanceof UserAutoCreationDisabledError) return null
    throw error
  })

  return resolved?.user.id ?? null
}

export async function trackLeadEnteredApp(input: TrackEventInput): Promise<void> {
  const userId = await resolveTrackingUserId({ ...input, upsertUser: true })
  await trackEvent({
    ...input,
    userId,
    type: 'lead_entered_app',
  })
}

export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    const payload = buildTrackingPayload(input)
    const runtime = buildRuntimePayload(input, payload as Prisma.JsonValue | null | undefined)
    const resilience = shouldAssessRuntimeResilience(input)
      ? await buildRuntimeResilienceSnapshot({
          scope: 'event',
          type: input.type,
          source: input.source,
          userId: input.userId ?? null,
          state: input.state ?? null,
          tenantId: input.productId ?? null,
          requestFingerprint: runtime.request_id,
          runtimeStage: runtime.runtime_stage,
          includeDiagnostics: false,
        }).catch(() => null)
      : null
    await withRuntimeAdvisoryLock({
      scope: 'event',
      type: input.type,
      source: input.source,
      userId: input.userId ?? null,
      state: input.state ?? null,
      tenantId: input.productId ?? null,
      requestFingerprint: runtime.request_id,
      runtimeStage: runtime.runtime_stage,
    }, async () => {
      const fence = await claimRuntimeEventReplay({
        scope: 'event',
        type: input.type,
        source: input.source,
        userId: input.userId ?? null,
        state: input.state ?? null,
        tenantId: input.productId ?? null,
        payload: {
          ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Prisma.JsonObject : {}),
          runtime: {
            ...runtime,
            ...(resilience ? { resilience } : {}),
          },
        } as Prisma.JsonValue,
        requestFingerprint: runtime.request_id,
        ttlMs: input.runtime?.replay_window_ms ?? EVENT_IDEMPOTENCY_TTL_MS,
      })

      if (fence.duplicate) {
        return
      }

      const outbox = await enqueueRuntimeOutboxItem({
        scope: 'event',
        type: input.type,
        source: input.source,
        userId: input.userId ?? null,
        state: input.state ?? null,
        tenantId: input.productId ?? null,
        payload: {
          ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Prisma.JsonObject : {}),
          runtime: {
            ...runtime,
            ...(resilience ? { resilience } : {}),
          },
        } as Prisma.InputJsonValue,
        runtime: {
          correlationId: runtime.correlation_id,
          requestId: runtime.request_id,
          flowExecutionId: runtime.flow_execution_id,
          replayTraceId: runtime.replay_trace_id,
          runtimeStage: runtime.runtime_stage,
          orchestrationPath: runtime.orchestration_path,
          retryAttempt: runtime.retry_attempt,
          replayReason: runtime.replay_reason,
          executionLatencyMs: runtime.execution_latency_ms,
          queueLatencyMs: runtime.queue_latency_ms,
          deliveryLatencyMs: runtime.delivery_latency_ms,
          handlerDurationMs: runtime.handler_duration_ms,
          failureClassification: runtime.failure_classification,
          requestFingerprint: runtime.request_id,
        },
      })

      if (outbox.duplicate) {
        return
      }
    })
  } catch (error) {
    if (isMissingEventTableError(error)) {
      if (!hasWarnedAboutMissingEventTable) {
        hasWarnedAboutMissingEventTable = true
        console.warn('[trackEvent] Event table is missing; skipping event writes until migration is applied')
      }
      return
    }

    console.error('[trackEvent]', error)
  }
}

export async function trackQuestionEvent(input: TrackQuestionEventInput): Promise<void> {
  await trackEvent({
    userId: input.userId,
    type: 'user_question',
    source: input.source,
    state: input.state,
    payload: {
      text: input.text,
      detectedIntent: input.detectedIntent,
      productContext: input.productContext,
      category: input.category,
    } satisfies Prisma.JsonObject,
  })
}

export async function getRecentUserEvents(userId: string, limit = 8): Promise<RecentUserEvent[]> {
  try {
    const events = await prisma.event.findMany({
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
    })

    return events.map(event => ({
      type: event.type,
      source: event.source,
      state: event.state,
      createdAt: event.createdAt.toISOString(),
      payload: event.payload,
    }))
  } catch (error) {
    if (isMissingEventTableError(error)) {
      return []
    }

    throw error
  }
}
