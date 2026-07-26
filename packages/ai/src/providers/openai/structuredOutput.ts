import { OpenAIStructuredOutputError } from './errors.js'
import type { IStructuredOutputParser, OpenAIStructuredOutputConfig } from './types.js'

export class StructuredOutputParser implements IStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: OpenAIStructuredOutputConfig
  }): Record<string, unknown> | undefined {
    if (!input.structuredOutput.enabled) {
      return undefined
    }

    const content = input.content?.trim()
    if (!content) {
      throw new OpenAIStructuredOutputError('Structured output was requested but the model returned empty content.')
    }

    try {
      const parsed = JSON.parse(content) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new OpenAIStructuredOutputError('Structured output must be a JSON object.')
      }
      return parsed as Record<string, unknown>
    } catch (cause) {
      if (cause instanceof OpenAIStructuredOutputError) {
        throw cause
      }
      throw new OpenAIStructuredOutputError('Failed to parse structured JSON output from OpenAI response.', cause)
    }
  }
}
