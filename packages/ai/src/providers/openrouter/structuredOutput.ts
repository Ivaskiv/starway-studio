import { OpenRouterStructuredOutputError } from './errors.js'
import type {
  IOpenRouterStructuredOutputParser,
  OpenRouterStructuredOutputConfig,
} from './types.js'

export class StructuredOutputParser implements IOpenRouterStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: OpenRouterStructuredOutputConfig
  }): Record<string, unknown> | undefined {
    if (!input.structuredOutput.enabled) {
      return undefined
    }

    const content = input.content?.trim()
    if (!content) {
      throw new OpenRouterStructuredOutputError('Structured output was requested but the model returned empty content.')
    }

    try {
      const parsed = JSON.parse(content) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new OpenRouterStructuredOutputError('Structured output must be a JSON object.')
      }
      return parsed as Record<string, unknown>
    } catch (cause) {
      if (cause instanceof OpenRouterStructuredOutputError) {
        throw cause
      }
      throw new OpenRouterStructuredOutputError('Failed to parse structured JSON output from OpenRouter response.', cause)
    }
  }
}

