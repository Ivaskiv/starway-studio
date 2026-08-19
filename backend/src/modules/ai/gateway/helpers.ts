import { type IRuntimeLogger } from '@starway/ai'
import {
resolveAssistantDecision,
type AssistantDecision,
type AssistantDecisionInput,
} from '../../assistant/decision-engine.js'
import type { RuntimeTelemetry } from './types.js'

export class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export function getStringMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string
): string {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : 'unknown'
}

export function readStringField(
  value: Record<string, unknown> | undefined,
  field: 'followUp'
): string {
  const result = value?.[field]
  return typeof result === 'string' ? result : ''
}

export function readStringArrayField(
  value: Record<string, unknown> | undefined,
  field: 'suggestions'
): string[] {
  const result = value?.[field]
  return Array.isArray(result)
    ? result.filter((item): item is string => typeof item === 'string')
    : []
}

export function readAssistantResponse(providerResponse: {
  content?: string
  structuredOutput?: Record<string, unknown>
}): string {
  if (
    typeof providerResponse.structuredOutput?.response === 'string' &&
    providerResponse.structuredOutput.response.trim()
  ) {
    return providerResponse.structuredOutput.response
  }

  if (typeof providerResponse.content === 'string') {
    return providerResponse.content
  }

  return ''
}

export function getNumberMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string
): number {
  const value = metadata?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function getTokenUsage(
  metadata: Record<string, unknown> | undefined
): number {
  const usage = metadata?.tokenUsage
  if (!usage || typeof usage !== 'object') {
    return 0
  }

  const total = (usage as { totalTokens?: unknown }).totalTokens
  return typeof total === 'number' && Number.isFinite(total) ? total : 0
}

export function extractRuntimeTelemetry(
  metadata: Record<string, unknown> | undefined
): RuntimeTelemetry | null {
  const value = metadata?.runtimeTelemetry
  if (!value || typeof value !== 'object') {
    return null
  }

  const telemetry = value as Partial<RuntimeTelemetry>
  if (
    typeof telemetry.provider !== 'string' ||
    typeof telemetry.model !== 'string' ||
    typeof telemetry.latency !== 'number'
  ) {
    return null
  }

  return {
    provider: telemetry.provider,
    model: telemetry.model,
    latency: telemetry.latency ?? 0,
    promptTokens: telemetry.promptTokens ?? 0,
    completionTokens: telemetry.completionTokens ?? 0,
    cachedTokens: telemetry.cachedTokens ?? 0,
    estimatedCost: telemetry.estimatedCost ?? 0,
    actualCost: telemetry.actualCost ?? 0,
    timestamp: telemetry.timestamp ?? new Date(0).toISOString(),
    user: telemetry.user ?? null,
  }
}

export function resolveAssistantDecisionSafely(input: AssistantDecisionInput): {
  decision: AssistantDecision | null
  durationMs: number | null
} {
  try {
    const resolution = resolveAssistantDecision(input)
    return {
      decision: resolution.decision,
      durationMs: resolution.durationMs,
    }
  } catch {
    return {
      decision: null,
      durationMs: null,
    }
  }
}

export function readAssistantDecision(
  value: unknown
): AssistantDecision | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const decision = (value as { decision?: unknown }).decision
  if (!decision || typeof decision !== 'object') {
    return null
  }

  const candidate = decision as Partial<AssistantDecision>
  if (
    typeof candidate.primaryIntent !== 'string' ||
    typeof candidate.userState !== 'string' ||
    typeof candidate.recommendedAction !== 'string' ||
    typeof candidate.confidence !== 'number'
  ) {
    return null
  }

  return {
    primaryIntent: candidate.primaryIntent,
    secondaryIntent:
      typeof candidate.secondaryIntent === 'string'
        ? candidate.secondaryIntent
        : null,
    userState: candidate.userState,
    recommendedAction: candidate.recommendedAction,
    confidence: candidate.confidence,
  }
}

export function readDecisionDuration(
  metadata: Record<string, unknown> | undefined
): number | null {
  const value = metadata?.decisionDurationMs
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
