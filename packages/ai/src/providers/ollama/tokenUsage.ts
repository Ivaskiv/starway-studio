import type { IOllamaTokenUsageCalculator, OllamaChunkLike, OllamaTokenUsage } from './types.js'

export class TokenUsageCalculator implements IOllamaTokenUsageCalculator {
  calculate(response?: Pick<OllamaChunkLike, 'prompt_eval_count' | 'eval_count'>): OllamaTokenUsage | undefined {
    if (!response) {
      return undefined
    }

    const inputTokens = normalize(response.prompt_eval_count)
    const outputTokens = normalize(response.eval_count)

    if (typeof inputTokens !== 'number' && typeof outputTokens !== 'number') {
      return undefined
    }

    return {
      inputTokens: inputTokens ?? 0,
      outputTokens: outputTokens ?? 0,
      totalTokens: (inputTokens ?? 0) + (outputTokens ?? 0),
    }
  }
}

function normalize(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

