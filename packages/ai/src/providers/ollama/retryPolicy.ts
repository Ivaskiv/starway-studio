import type { IOllamaRetryPolicy, OllamaRetryPolicyConfig } from './types.js'

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_DELAY_MS = 500
const DEFAULT_MAX_DELAY_MS = 10000
const DEFAULT_BACKOFF_MULTIPLIER = 2

export class RetryPolicy implements IOllamaRetryPolicy {
  private readonly maxAttempts: number
  private readonly initialDelayMs: number
  private readonly maxDelayMs: number
  private readonly backoffMultiplier: number

  constructor(
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    config: OllamaRetryPolicyConfig = {},
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
        const shouldRetry = attempt < this.maxAttempts && isRetryable(error)
        if (!shouldRetry) {
          throw error
        }
        await this.sleep(this.resolveDelayMs(attempt))
      }
    }

    throw lastError
  }

  private resolveDelayMs(attempt: number): number {
    const backoff = this.initialDelayMs * this.backoffMultiplier ** Math.max(0, attempt - 1)
    return Math.min(backoff, this.maxDelayMs)
  }
}

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const status = (error as { status?: unknown }).status
  const name = (error as { name?: unknown }).name
  const code = (error as { code?: unknown }).code

  return (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    name === 'TimeoutError' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED'
  )
}

