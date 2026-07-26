import { AnthropicStructuredOutputError } from './errors.js'
import type { AnthropicStructuredOutputConfig, IAnthropicStructuredOutputParser } from './types.js'

export class StructuredOutputParser implements IAnthropicStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: AnthropicStructuredOutputConfig
  }): Record<string, unknown> | undefined {
    if (!input.structuredOutput.enabled) {
      return undefined
    }

    const content = input.content?.trim()
    if (!content) {
      throw new AnthropicStructuredOutputError('Structured output was requested but Claude returned empty content.')
    }

    try {
      const parsed = JSON.parse(content) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new AnthropicStructuredOutputError('Structured output must be a JSON object.')
      }
      return parsed as Record<string, unknown>
    } catch (cause) {
      if (cause instanceof AnthropicStructuredOutputError) {
        throw cause
      }
      throw new AnthropicStructuredOutputError('Failed to parse structured JSON output from Claude response.', cause)
    }
  }
}
