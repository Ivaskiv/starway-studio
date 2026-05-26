import type { GenerationResult, ModelProvider } from '@ai/types/salesAssistant.types'

export type TokenMetrics = {
  provider: ModelProvider
  modelName: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  contextWindow: number
  remainingContext: number
  usagePercent: number
  isEstimated: boolean
  sessionTotalTokens: number
}

const PROVIDER_CONTEXT_WINDOWS: Record<ModelProvider, number> = {
  gpt: 258_000,
  claude: 200_000,
  gemini: 1_000_000,
}

const MODEL_CONTEXT_HINTS: Array<{ match: RegExp; size: number }> = [
  { match: /gpt-4\.1-mini/i, size: 1_000_000 },
  { match: /gpt-4\.1/i, size: 1_000_000 },
  { match: /claude/i, size: 200_000 },
  { match: /gemini/i, size: 1_000_000 },
]

function resolveContextWindow(provider: ModelProvider, modelName: string): number {
  const hit = MODEL_CONTEXT_HINTS.find((item) => item.match.test(modelName))
  return hit?.size ?? PROVIDER_CONTEXT_WINDOWS[provider]
}

export function buildTokenMetrics(params: {
  latestResult: GenerationResult | null
  provider: ModelProvider
  fallbackModel: string
  estimatedInputTokens: number
  estimatedOutputTokens: number
  sessionResults: Partial<Record<ModelProvider, GenerationResult>>
}): TokenMetrics {
  const usage = params.latestResult?.usage
  const modelName = usage?.model ?? params.latestResult?.modelUsed ?? params.fallbackModel
  const contextWindow = resolveContextWindow(params.provider, modelName)
  const inputTokens = usage?.inputTokens ?? params.estimatedInputTokens
  const outputTokens = usage?.outputTokens ?? params.estimatedOutputTokens
  const totalTokens = usage?.totalTokens ?? (inputTokens + outputTokens)
  const remainingContext = Math.max(0, contextWindow - totalTokens)
  const usagePercent = Math.max(0, Math.min(100, Math.round((totalTokens / contextWindow) * 100)))
  const sessionTotalTokens = Object.values(params.sessionResults).reduce((acc, item) => {
    const value = item?.usage?.totalTokens ?? item?.tokensUsed ?? 0
    return acc + value
  }, 0)

  return {
    provider: params.provider,
    modelName,
    inputTokens,
    outputTokens,
    totalTokens,
    contextWindow,
    remainingContext,
    usagePercent,
    isEstimated: !usage,
    sessionTotalTokens,
  }
}

