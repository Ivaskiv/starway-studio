import {
  OllamaAuthenticationError,
  OllamaCancelledError,
  OllamaProviderError,
  OllamaRateLimitError,
  OllamaStructuredOutputError,
  OllamaTimeoutError,
} from './errors.js'
import type { IOllamaErrorMapper } from './types.js'

export class OllamaErrorMapper implements IOllamaErrorMapper {
  map(error: unknown): Error {
    if (error instanceof OllamaProviderError || error instanceof OllamaStructuredOutputError) {
      return error
    }

    const status = getNumericField(error, 'status')
    const name = getStringField(error, 'name')
    const message = getStringField(error, 'message') ?? 'Ollama provider request failed.'

    if (status === 401 || status === 403) {
      return new OllamaAuthenticationError(message, error)
    }
    if (status === 429) {
      return new OllamaRateLimitError(message, error)
    }
    if (name === 'AbortError') {
      return new OllamaCancelledError(message, error)
    }
    if (name === 'TimeoutError' || status === 408 || getBooleanField(error, 'timedOut')) {
      return new OllamaTimeoutError(message, error)
    }

    return new OllamaProviderError(message, error)
  }
}

function getNumericField(error: unknown, field: string): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }
  const value = (error as Record<string, unknown>)[field]
  return typeof value === 'number' ? value : undefined
}

function getStringField(error: unknown, field: string): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }
  const value = (error as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : undefined
}

function getBooleanField(error: unknown, field: string): boolean | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }
  const value = (error as Record<string, unknown>)[field]
  return typeof value === 'boolean' ? value : undefined
}

