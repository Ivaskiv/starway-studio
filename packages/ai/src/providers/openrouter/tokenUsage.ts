import type {
  IOpenRouterTokenUsageCalculator,
  OpenRouterCompletionLike,
  OpenRouterTokenUsage,
} from './types.js'

export class TokenUsageCalculator implements IOpenRouterTokenUsageCalculator {
  calculate(usage?: OpenRouterCompletionLike['usage']): OpenRouterTokenUsage | undefined {
    if (!usage) {
      return undefined
    }

    return {
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
      cachedInputTokens: usage.prompt_tokens_details?.cached_tokens,
      reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
    }
  }
}

