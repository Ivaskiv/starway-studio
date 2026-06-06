export type AiCostTier = 'low' | 'medium' | 'high'

export type AiUsageEstimate = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  costTier: AiCostTier
}

export type AiCostTelemetry = AiUsageEstimate & {
  provider: string
  model: string
  actualCostUsd: number | null
  cacheHit?: boolean
}

type ModelPricing = {
  inputUsdPerMillion: number
  outputUsdPerMillion: number
  label: string
}

const MODEL_PRICE_ALIASES: Record<string, string> = {
  'claude-sonnet-4-20250514': 'claude-sonnet-4-5',
}

function resolvePricingModelKey(model: string): string {
  return MODEL_PRICE_ALIASES[model] ?? model
}

export const AI_MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4.1-mini': {
    inputUsdPerMillion: 0.4,
    outputUsdPerMillion: 1.6,
    label: 'GPT-4.1 mini',
  },
  'gpt-4.1': {
    inputUsdPerMillion: 2,
    outputUsdPerMillion: 8,
    label: 'GPT-4.1',
  },
  'claude-haiku-3-5': {
    inputUsdPerMillion: 0.8,
    outputUsdPerMillion: 4,
    label: 'Claude Haiku 3.5',
  },
  'claude-sonnet-4-5': {
    inputUsdPerMillion: 3,
    outputUsdPerMillion: 15,
    label: 'Claude Sonnet 4.5',
  },
  'gemini-2.5-flash': {
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 2.5,
    label: 'Gemini 2.5 Flash',
  },
  'gemini-2.5-pro': {
    inputUsdPerMillion: 1.25,
    outputUsdPerMillion: 10,
    label: 'Gemini 2.5 Pro',
  },
}

export const AI_MAX_TOKENS_BY_CONTENT_TYPE: Record<string, number> = {
  REELS_SCENARIO: 600,
  STORIES: 350,
  STORIES_CHECK: 350,
  WARMUP_POST: 900,
  WARMUP_3DAYS: 900,
  EMAIL_SEQUENCE: 1200,
  WEBINAR_SALES: 1200,
  AD_COPY: 400,
  BLOG_IDEAS: 800,
  CUSTOM: 600,
  CUSTOM_SCRIPT: 600,
  DEFAULT: 800,
}

export function resolveAiMaxOutputTokens(contentType: string): number {
  return (
    AI_MAX_TOKENS_BY_CONTENT_TYPE[contentType] ??
    AI_MAX_TOKENS_BY_CONTENT_TYPE.DEFAULT
  )
}

export function estimateTokensFromText(text: string): number {
  const normalizedLength = text.trim().length
  if (normalizedLength === 0) return 0
  return Math.max(1, Math.ceil(normalizedLength / 4))
}

export function getCostTier(costUsd: number): AiCostTier {
  if (costUsd < 0.002) return 'low'
  if (costUsd < 0.02) return 'medium'
  return 'high'
}

export function calculateAiCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = AI_MODEL_PRICING[resolvePricingModelKey(model)]
  if (!pricing) return 0

  return Number(
    (
      (inputTokens / 1_000_000) * pricing.inputUsdPerMillion +
      (outputTokens / 1_000_000) * pricing.outputUsdPerMillion
    ).toFixed(6),
  )
}

export function buildAiUsageEstimate(params: {
  model: string
  promptText: string
  userText: string
  maxOutputTokens: number
}): AiUsageEstimate {
  const inputTokens =
    estimateTokensFromText(params.promptText) +
    estimateTokensFromText(params.userText)
  const outputTokens = params.maxOutputTokens
  const estimatedCostUsd = calculateAiCostUsd(
    params.model,
    inputTokens,
    outputTokens,
  )

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd,
    costTier: getCostTier(estimatedCostUsd),
  }
}
