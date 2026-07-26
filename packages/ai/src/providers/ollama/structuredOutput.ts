import { OllamaStructuredOutputError } from './errors.js'
import type { IOllamaStructuredOutputParser, OllamaStructuredOutputConfig } from './types.js'

export class StructuredOutputParser implements IOllamaStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: OllamaStructuredOutputConfig
  }): Record<string, unknown> | undefined {
    if (!input.structuredOutput.enabled) {
      return undefined
    }

    const raw = input.content?.trim()
    if (!raw) {
      return undefined
    }

    try {
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new OllamaStructuredOutputError('Ollama structured output must be a JSON object.')
      }
      return parsed as Record<string, unknown>
    } catch (error) {
      if (error instanceof OllamaStructuredOutputError) {
        throw error
      }
      throw new OllamaStructuredOutputError('Failed to parse Ollama structured output.', error)
    }
  }
}

