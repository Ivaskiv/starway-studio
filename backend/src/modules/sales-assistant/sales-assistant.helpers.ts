import { createHash } from 'node:crypto'
import { estimateTokensFromText, type AiCostTelemetry } from '@starway/ai/providers/pricing'
import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import { RESULT_CACHE_LIMIT } from '@/modules/sales-assistant/sales-assistant.constants.js'

// ─── provider alias ───────────────────────────────────────────────────────────
export function normalizeProviderAlias(provider: string | undefined): ModelProvider | null {
  if (provider === 'openai' || provider === 'gpt') return 'gpt'
  if (provider === 'anthropic' || provider === 'claude') return 'claude'
  if (provider === 'gemini') return 'gemini'
  return null
}

// ─── result cache ─────────────────────────────────────────────────────────────
export const resultCache = new Map<string, { content: string; usage: AiCostTelemetry }>()

export function hashCacheParts(parts: unknown[]) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex')
}

export function rememberResultCache(key: string, value: { content: string; usage: AiCostTelemetry }) {
  if (resultCache.size >= RESULT_CACHE_LIMIT) {
    const oldest = resultCache.keys().next().value
    if (oldest) resultCache.delete(oldest)
  }
  resultCache.set(key, value)
}

// ─── tokens ───────────────────────────────────────────────────────────────────
export function estimateTokensFromGeneratedText(text: string) {
  return estimateTokensFromText(text)
}