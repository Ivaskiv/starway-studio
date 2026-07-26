import type { GeminiRateLimitConfig, IGeminiRateLimitHandler } from './types.js'

const DEFAULT_DELAY_MS = 1000
const DEFAULT_MAX_DELAY_MS = 30000

export class RateLimitHandler implements IGeminiRateLimitHandler {
  private readonly defaultDelayMs: number
  private readonly maxDelayMs: number

  constructor(config: GeminiRateLimitConfig = {}) {
    this.defaultDelayMs = config.defaultDelayMs ?? DEFAULT_DELAY_MS
    this.maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
  }

  shouldRetry(error: unknown): boolean {
    const status = getNumericField(error, 'status')
    const name = getStringField(error, 'name')
    return status === 429 || name === 'GoogleGenerativeAIFetchError'
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

  const details = (error as { errorDetails?: unknown[] }).errorDetails
  if (Array.isArray(details)) {
    for (const detail of details) {
      if (detail && typeof detail === 'object' && 'metadata' in detail) {
        const metadata = (detail as { metadata?: Record<string, unknown> }).metadata
        const retryAfter = metadata?.retryAfterMs
        if (typeof retryAfter === 'number') {
          return retryAfter
        }
      }
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
