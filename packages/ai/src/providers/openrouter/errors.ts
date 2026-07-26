export class OpenRouterProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'OpenRouterProviderError'
  }
}

export class OpenRouterRateLimitError extends OpenRouterProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenRouterRateLimitError'
  }
}

export class OpenRouterTimeoutError extends OpenRouterProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenRouterTimeoutError'
  }
}

export class OpenRouterCancelledError extends OpenRouterProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenRouterCancelledError'
  }
}

export class OpenRouterStructuredOutputError extends OpenRouterProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenRouterStructuredOutputError'
  }
}

export class OpenRouterAuthenticationError extends OpenRouterProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenRouterAuthenticationError'
  }
}

