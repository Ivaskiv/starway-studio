export class AnthropicProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'AnthropicProviderError'
  }
}

export class AnthropicRateLimitError extends AnthropicProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'AnthropicRateLimitError'
  }
}

export class AnthropicTimeoutError extends AnthropicProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'AnthropicTimeoutError'
  }
}

export class AnthropicCancelledError extends AnthropicProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'AnthropicCancelledError'
  }
}

export class AnthropicStructuredOutputError extends AnthropicProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'AnthropicStructuredOutputError'
  }
}

export class AnthropicAuthenticationError extends AnthropicProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'AnthropicAuthenticationError'
  }
}
