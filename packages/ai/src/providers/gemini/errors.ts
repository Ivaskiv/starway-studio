export class GeminiProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'GeminiProviderError'
  }
}

export class GeminiRateLimitError extends GeminiProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'GeminiRateLimitError'
  }
}

export class GeminiTimeoutError extends GeminiProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'GeminiTimeoutError'
  }
}

export class GeminiCancelledError extends GeminiProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'GeminiCancelledError'
  }
}

export class GeminiStructuredOutputError extends GeminiProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'GeminiStructuredOutputError'
  }
}

export class GeminiAuthenticationError extends GeminiProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'GeminiAuthenticationError'
  }
}
