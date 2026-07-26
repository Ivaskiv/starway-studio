import {
  OpenAIAuthenticationError,
  OpenAICancelledError,
  OpenAIProviderError,
  OpenAIRateLimitError,
  OpenAIStructuredOutputError,
  OpenAITimeoutError,
} from './errors.js'
import type { IOpenAIErrorMapper } from './types.js'

export class OpenAIErrorMapper implements IOpenAIErrorMapper {
  map(error: unknown): Error {
    if (error instanceof OpenAIProviderError || error instanceof OpenAIStructuredOutputError) {
      return error
    }

    const status = getNumericField(error, 'status')
    const code = getStringField(error, 'code')
    const name = getStringField(error, 'name')
    const message = getStringField(error, 'message') ?? 'OpenAI provider request failed.'

    if (status === 401 || code === 'invalid_api_key' || name === 'AuthenticationError') {
      return new OpenAIAuthenticationError(message, error)
    }

    if (status === 429 || code === 'rate_limit_exceeded' || name === 'RateLimitError') {
      return new OpenAIRateLimitError(message, error)
    }

    if (name === 'AbortError' || code === 'ABORT_ERR') {
      return new OpenAICancelledError(message, error)
    }

    if (status === 408 || code === 'ETIMEDOUT' || name === 'TimeoutError') {
      return new OpenAITimeoutError(message, error)
    }

    return new OpenAIProviderError(message, error)
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
