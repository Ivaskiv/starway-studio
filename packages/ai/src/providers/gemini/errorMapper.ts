import {
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai'

import {
  GeminiAuthenticationError,
  GeminiCancelledError,
  GeminiProviderError,
  GeminiRateLimitError,
  GeminiStructuredOutputError,
  GeminiTimeoutError,
} from './errors.js'
import type { IGeminiErrorMapper } from './types.js'

export class GeminiErrorMapper implements IGeminiErrorMapper {
  map(error: unknown): Error {
    if (error instanceof GeminiProviderError || error instanceof GeminiStructuredOutputError) {
      return error
    }

    if (error instanceof GoogleGenerativeAIAbortError) {
      return new GeminiCancelledError(error.message, error)
    }

    if (error instanceof GoogleGenerativeAIFetchError) {
      if (error.status === 401 || error.status === 403) {
        return new GeminiAuthenticationError(error.message, error)
      }
      if (error.status === 429) {
        return new GeminiRateLimitError(error.message, error)
      }
      if (error.status === 408 || error.status === 504) {
        return new GeminiTimeoutError(error.message, error)
      }
      return new GeminiProviderError(error.message, error)
    }

    const status = getNumericField(error, 'status')
    const name = getStringField(error, 'name')
    const message = getStringField(error, 'message') ?? 'Gemini provider request failed.'

    if (status === 401 || status === 403) {
      return new GeminiAuthenticationError(message, error)
    }
    if (status === 429) {
      return new GeminiRateLimitError(message, error)
    }
    if (name === 'AbortError') {
      return new GeminiCancelledError(message, error)
    }
    if (status === 408 || name === 'TimeoutError') {
      return new GeminiTimeoutError(message, error)
    }

    return new GeminiProviderError(message, error)
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
