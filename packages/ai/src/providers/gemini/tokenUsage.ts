import type { GeminiResponseLike, GeminiTokenUsage, IGeminiTokenUsageCalculator } from './types.js'

export class TokenUsageCalculator implements IGeminiTokenUsageCalculator {
  calculate(usage?: GeminiResponseLike['usageMetadata']): GeminiTokenUsage | undefined {
    if (!usage) {
      return undefined
    }

    return {
      inputTokens: usage.promptTokenCount ?? 0,
      outputTokens: usage.candidatesTokenCount ?? 0,
      totalTokens: usage.totalTokenCount ?? (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0),
      cachedContentTokens: usage.cachedContentTokenCount,
    }
  }
}
