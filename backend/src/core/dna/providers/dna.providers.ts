import { resolveModelStrategyTier } from '@starway/ai/providers/routing'
import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import { callProviderSafe } from '@/modules/sales-assistant/sales-assistant.providers.js'
import type { DnaPipelineInput } from '@/core/dna/contracts/dna.contracts.js'

export type DnaProviderExecutionResult = {
  provider: ModelProvider
  content: string
  usage?: {
    provider: string
    model?: string
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    estimatedCostUsd?: number | null
    actualCostUsd?: number | null
  } | null
  durationMs: number
}

export async function executeWithProviderFallback(params: {
  providers: ModelProvider[]
  promptSystem: string
  promptUser: string
  input: DnaPipelineInput
}): Promise<DnaProviderExecutionResult> {
  const strategyTier = resolveModelStrategyTier(params.input.selectedProtocol)

  let lastError: Error | null = null
  for (const provider of params.providers) {
    const result = await callProviderSafe(provider, params.promptSystem, params.promptUser, {
      contentType: params.input.contentType,
      strategyTier,
    })

    if (result.content) {
      return {
        provider,
        content: result.content,
        usage: result.usage,
        durationMs: result.durationMs,
      }
    }

    lastError = new Error(result.error?.message ?? `DNA_PROVIDER_FAILED:${provider}`)
  }

  throw lastError ?? new Error('DNA_PROVIDER_FALLBACK_EXHAUSTED')
}
