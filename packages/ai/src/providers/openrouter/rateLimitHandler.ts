import type { IOpenRouterRateLimitHandler, OpenRouterRateLimitConfig } from './types.js'

const DEFAULT_DELAY_MS = 1_000
const DEFAULT_MAX_DELAY_MS = 30_000

export class RateLimitHandler implements IOpenRouterRateLimitHandler {
  private readonly defaultDelayMs: number
  private readonly maxDelayMs: number

  constructor(config: OpenRouterRateLimitConfig = {}) {
    this.defaultDelayMs = config.defaultDelayMs ?? DEFAULT_DELAY_MS
    this.maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
  }

  shouldRetry(error: unknown): boolean {
    const status = getNumericField(error, 'status')
    const code = getStringField(error, 'code')
    const name = getStringField(error, 'name')

    return status === 429 || code === 'rate_limit_exceeded' || name === 'RateLimitError'
  }

  getDelayMs(error: unknown, attempt: number): number {
    const retryAfterMs = getRetryAfterMs(error)
    if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
      return Math.min(retryAfterMs, this.maxDelayMs)
    }

    const exponential = this.defaultDelayMs * 2 ** Math.max(0, attempt - 1)
    return Math.min(exponential, this.maxDelayMs)
  }
}

function getRetryAfterMs(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const headers = (error as { headers?: Record<string, unknown> }).headers
  const retryAfter = headers?.['retry-after-ms'] ?? headers?.['retry-after']
  if (typeof retryAfter === 'number') {
    return retryAfter
  }
  if (typeof retryAfter === 'string') {
    const parsed = Number(retryAfter)
    if (Number.isFinite(parsed)) {
      return headers?.['retry-after-ms'] ? parsed : parsed * 1_000
    }
  }
  return undefined
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

