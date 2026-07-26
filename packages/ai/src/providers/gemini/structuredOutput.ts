import { GeminiStructuredOutputError } from './errors.js'
import type { GeminiStructuredOutputConfig, IGeminiStructuredOutputParser } from './types.js'

export class StructuredOutputParser implements IGeminiStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: GeminiStructuredOutputConfig
  }): Record<string, unknown> | undefined {
    if (!input.structuredOutput.enabled) {
      return undefined
    }

    const content = input.content?.trim()
    if (!content) {
      throw new GeminiStructuredOutputError('Structured output was requested but Gemini returned empty content.')
    }

    try {
      const parsed = JSON.parse(content) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new GeminiStructuredOutputError('Structured output must be a JSON object.')
      }
      return parsed as Record<string, unknown>
    } catch (cause) {
      if (cause instanceof GeminiStructuredOutputError) {
        throw cause
      }
      throw new GeminiStructuredOutputError('Failed to parse structured JSON output from Gemini response.', cause)
    }
  }
}
