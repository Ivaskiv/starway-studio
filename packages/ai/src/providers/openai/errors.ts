export class OpenAIProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'OpenAIProviderError'
  }
}

export class OpenAIRateLimitError extends OpenAIProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenAIRateLimitError'
  }
}

export class OpenAITimeoutError extends OpenAIProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenAITimeoutError'
  }
}

export class OpenAICancelledError extends OpenAIProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenAICancelledError'
  }
}

export class OpenAIStructuredOutputError extends OpenAIProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenAIStructuredOutputError'
  }
}

export class OpenAIAuthenticationError extends OpenAIProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OpenAIAuthenticationError'
  }
}
