import type {
  AnthropicMessageLike,
  AnthropicTokenUsage,
  IAnthropicTokenUsageCalculator,
} from './types.js'

export class TokenUsageCalculator implements IAnthropicTokenUsageCalculator {
  calculate(
    usage?:
      | AnthropicMessageLike['usage']
      | {
          input_tokens?: number | null
          output_tokens?: number | null
          cache_creation_input_tokens?: number | null
          cache_read_input_tokens?: number | null
        }
      | null,
  ): AnthropicTokenUsage | undefined {
    if (!usage) {
      return undefined
    }

    const inputTokens = usage.input_tokens ?? 0
    const outputTokens = usage.output_tokens ?? 0
    const cacheCreationInputTokens = usage.cache_creation_input_tokens ?? undefined
    const cacheReadInputTokens = usage.cache_read_input_tokens ?? undefined

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
    }
  }
}
