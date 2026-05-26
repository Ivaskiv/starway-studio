import {
  COST_ESTIMATE,
  FREE_TOKEN_LIMITS,
  GENERATION_MODES,
  PROTOCOLS,
} from '@/features/sales-assistant/config/contentStudio.config'
import type { DnaGenerationMode } from '@/features/sales-assistant/hooks/useDnaGenerationHistory'
import { MODEL_STRATEGY } from '@ai/providers/models'
import type { GenerationResult, ModelProvider } from '@ai/types/salesAssistant.types'

export type ContentKey =
  | 'blog'
  | 'landing'
  | 'storytelling'
  | 'telegram_msg'
  | 'reels'
  | 'stories'
  | 'warmup'
  | 'webinar'
  | 'audit'
  | 'post'
  | 'email'
  | 'sales'

export type ModelState = Record<ModelProvider, boolean>
export type ProtocolKey = (typeof PROTOCOLS)[number]['key']

const VALID_KEYS = [
  'reels', 'warmup', 'blog', 'landing', 'storytelling',
  'telegram_msg', 'stories', 'webinar', 'audit', 'post', 'email', 'sales',
] as const

type ValidContentTypeKey = (typeof VALID_KEYS)[number]

const CONTENT_TYPE_MAP: Record<string, ValidContentTypeKey> = {
  REELS_SCENARIO: 'reels',
  WARMUP_3DAYS: 'warmup',
  BLOG_POST: 'blog',
  LANDING_PAGE: 'landing',
  STORYTELLING: 'storytelling',
  TELEGRAM_MESSAGE: 'telegram_msg',
  STORIES_CHECK: 'stories',
  WEBINAR_CONTENT: 'webinar',
  WEBINAR_SALES: 'webinar',
  WARMUP_1DAY: 'warmup',
  WARMUP_WEEK: 'warmup',
  WARMUP_LAUNCH: 'warmup',
  BLOG_IDEAS: 'blog',
  LIVE_STRUCTURE: 'webinar',
  CONTENT_AUDIT: 'audit',
  SOCIAL_POST: 'post',
  EMAIL_SEQUENCE: 'email',
  SALES_SCRIPT: 'sales',
  CUSTOM: 'post',
}

export function resolveContentType(contentKey: ContentKey | string): ValidContentTypeKey {
  const normalized = String(contentKey).trim()
  const directMatch = VALID_KEYS.find((key) => key === normalized)
  const resolved = directMatch ?? CONTENT_TYPE_MAP[normalized]
  if (!resolved) {
    console.warn(`[resolveContentType] unknown key: ${normalized}, falling back to post`)
    return 'post'
  }
  if (!VALID_KEYS.includes(resolved)) {
    console.warn(`[resolveContentType] unknown key: ${resolved}, falling back to post`)
    return 'post'
  }
  return resolved
}

export function resolveProviderByMode(mode: DnaGenerationMode): ModelProvider {
  return GENERATION_MODES.find((item) => item.key === mode)?.provider ?? 'gpt'
}

export function resolveFreeFirstProvider(params: {
  mode: DnaGenerationMode
  models: ModelState
  outputCount: number
  freeUsage: Record<ModelProvider, number>
}): ModelProvider {
  const { mode, models, outputCount, freeUsage } = params

  // Gemini завжди безкоштовний — пріоритет якщо увімкнено
  if (models.gemini) {
    const geminiLeft = FREE_TOKEN_LIMITS.gemini - freeUsage.gemini
    const geminiNeeds = COST_ESTIMATE.gemini.tokensPerOutput * Math.max(1, outputCount)
    if (geminiLeft >= geminiNeeds) return 'gemini'
  }

  // Далі за режимом
  const modeProvider: Record<DnaGenerationMode, ModelProvider> = {
    FAST: 'gemini',
    BALANCED: 'gpt',
    PREMIUM: 'claude',
  }
  const preferred = modeProvider[mode]
  if (models[preferred]) {
    const left = FREE_TOKEN_LIMITS[preferred] - freeUsage[preferred]
    const needs = COST_ESTIMATE[preferred].tokensPerOutput * Math.max(1, outputCount)
    if (left >= needs) return preferred
  }

  // Fallback — перша увімкнена модель
  return (Object.keys(models) as ModelProvider[]).find((k) => models[k]) ?? 'gpt'
}

export function resolveUiModelName(
  provider: ModelProvider,
  protocol: ProtocolKey
): string {
  const strategy = MODEL_STRATEGY[protocol === 'PSYCH' ? 'complex' : 'standard']
  if (provider === 'claude') return strategy.anthropic
  if (provider === 'gemini') return strategy.gemini
  return strategy.openai
}

export function resolveUiModelNameByKey(
  key: ModelProvider,
  protocol: ProtocolKey
): string {
  if (key === 'claude') return resolveUiModelName('claude', protocol)
  if (key === 'gemini') return resolveUiModelName('gemini', protocol)
  return resolveUiModelName('gpt', protocol)
}

export function formatUsd(value: number | null | undefined): string {
  if (!value) return '$0.000000'
  return `$${value.toFixed(6)}`
}

export function formatResultMeta(result: GenerationResult): string {
  if (result.usage) {
    const cost = result.usage.actualCostUsd ?? result.usage.estimatedCostUsd
    return `${result.usage.model} · ${result.usage.totalTokens} tok · ${formatUsd(cost)}${
      result.usage.cacheHit ? ' · cache' : ''
    }`
  }
  return `${result.tokensUsed} tokens`
}

export function computeTruthScore(result: GenerationResult): number {
  const lengthScore = Math.min(result.content.trim().length / 12, 40)
  const warningPenalty = result.validationWarning ? 24 : 0
  const usagePenalty = result.usage?.costTier === 'high' ? 8 : 0
  return Math.max(
    35,
    Math.min(98, Math.round(58 + lengthScore - warningPenalty - usagePenalty))
  )
}

export function buildRoutingPath(
  mode: DnaGenerationMode,
  usedProvider?: string
): string {
  const primary = resolveProviderByMode(mode)
  const chain =
    primary === 'gpt'
      ? ['openai', 'anthropic', 'gemini']
      : primary === 'claude'
        ? ['anthropic', 'openai', 'gemini']
        : ['gemini', 'openai', 'anthropic']
  return `${chain.join(' -> ')}${usedProvider ? ` | used: ${usedProvider}` : ''}`
}

export function resolvePanelFormula(args: {
  modelKey: ModelProvider
  outputCount: number
  outputLimit: number
  result?: GenerationResult
}) {
  const estimate = COST_ESTIMATE[args.modelKey]
  const estimatedTokens =
    estimate.tokensPerOutput * Math.max(1, args.outputCount)
  const estimatedCost = (estimatedTokens / 1000) * estimate.costPer1k
  const used = Math.max(0, args.result?.usage?.outputTokens ?? 0)
  const limit = Math.max(1, args.outputLimit)
  const left = Math.max(0, limit - used)
  const actualCost =
    args.result?.usage?.actualCostUsd ??
    args.result?.usage?.estimatedCostUsd ??
    null

  return {
    used,
    limit,
    left,
    estimatedTokens,
    estimatedCost,
    actualCost,
  }
}
