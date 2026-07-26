import {
  AnthropicAuthenticationError,
  AnthropicCancelledError,
  AnthropicProviderError,
  AnthropicRateLimitError,
  AnthropicStructuredOutputError,
  AnthropicTimeoutError,
} from './errors.js'
import type { IAnthropicErrorMapper } from './types.js'

export class AnthropicErrorMapper implements IAnthropicErrorMapper {
  map(error: unknown): Error {
    if (error instanceof AnthropicProviderError || error instanceof AnthropicStructuredOutputError) {
      return error
    }

    const status = getNumericField(error, 'status')
    const name = getStringField(error, 'name')
    const type = getStringField(error, 'type')
    const errorField = getStringField(error, 'error')
    const message = getStringField(error, 'message') ?? 'Anthropic provider request failed.'

    if (status === 401 || type === 'authentication_error' || name === 'AuthenticationError') {
      return new AnthropicAuthenticationError(message, error)
    }

    if (status === 429 || type === 'rate_limit_error' || errorField === 'rate_limit_error' || name === 'RateLimitError') {
      return new AnthropicRateLimitError(message, error)
    }

    if (name === 'AbortError' || getStringField(error, 'code') === 'ABORT_ERR') {
      return new AnthropicCancelledError(message, error)
    }

    if (status === 408 || getStringField(error, 'code') === 'ETIMEDOUT' || name === 'TimeoutError') {
      return new AnthropicTimeoutError(message, error)
    }

    return new AnthropicProviderError(message, error)
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
