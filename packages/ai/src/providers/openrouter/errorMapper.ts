import {
  OpenRouterAuthenticationError,
  OpenRouterCancelledError,
  OpenRouterProviderError,
  OpenRouterRateLimitError,
  OpenRouterStructuredOutputError,
  OpenRouterTimeoutError,
} from './errors.js'
import type { IOpenRouterErrorMapper } from './types.js'

export class OpenRouterErrorMapper implements IOpenRouterErrorMapper {
  map(error: unknown): Error {
    if (error instanceof OpenRouterProviderError || error instanceof OpenRouterStructuredOutputError) {
      return error
    }

    const status = getNumericField(error, 'status')
    const code = getStringField(error, 'code')
    const name = getStringField(error, 'name')
    const message = getStringField(error, 'message') ?? 'OpenRouter provider request failed.'

    if (status === 401 || code === 'invalid_api_key' || name === 'AuthenticationError') {
      return new OpenRouterAuthenticationError(message, error)
    }

    if (status === 429 || code === 'rate_limit_exceeded' || name === 'RateLimitError') {
      return new OpenRouterRateLimitError(message, error)
    }

    if (name === 'AbortError' || code === 'ABORT_ERR') {
      return new OpenRouterCancelledError(message, error)
    }

    if (status === 408 || code === 'ETIMEDOUT' || name === 'TimeoutError') {
      return new OpenRouterTimeoutError(message, error)
    }

    return new OpenRouterProviderError(message, error)
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

