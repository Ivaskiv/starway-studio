import type {
  IOpenRouterRateLimitHandler,
  IOpenRouterRetryPolicy,
  OpenRouterRetryPolicyConfig,
} from './types.js'

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_DELAY_MS = 500
const DEFAULT_MAX_DELAY_MS = 10_000
const DEFAULT_BACKOFF_MULTIPLIER = 2

export class RetryPolicy implements IOpenRouterRetryPolicy {
  private readonly maxAttempts: number
  private readonly initialDelayMs: number
  private readonly maxDelayMs: number
  private readonly backoffMultiplier: number

  constructor(
    private readonly rateLimitHandler: IOpenRouterRateLimitHandler,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    config: OpenRouterRetryPolicyConfig = {},
  ) {
    this.maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
    this.initialDelayMs = config.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS
    this.maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
    this.backoffMultiplier = config.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER
  }

  async execute<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
    let lastError: unknown

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await operation(attempt)
      } catch (error) {
        lastError = error
        const shouldRetry = attempt < this.maxAttempts && isRetryable(error, this.rateLimitHandler)
        if (!shouldRetry) {
          throw error
        }

        const delayMs = this.resolveDelayMs(error, attempt)
        await this.sleep(delayMs)
      }
    }

    throw lastError
  }

  private resolveDelayMs(error: unknown, attempt: number): number {
    if (this.rateLimitHandler.shouldRetry(error)) {
      return this.rateLimitHandler.getDelayMs(error, attempt)
    }

    const backoff = this.initialDelayMs * this.backoffMultiplier ** Math.max(0, attempt - 1)
    return Math.min(backoff, this.maxDelayMs)
  }
}

function isRetryable(error: unknown, rateLimitHandler: IOpenRouterRateLimitHandler): boolean {
  if (rateLimitHandler.shouldRetry(error)) {
    return true
  }

  if (!error || typeof error !== 'object') {
    return false
  }

  const status = (error as { status?: unknown }).status
  const code = (error as { code?: unknown }).code
  const name = (error as { name?: unknown }).name

  return (
    status === 408 ||
    status === 409 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    name === 'TimeoutError'
  )
}

