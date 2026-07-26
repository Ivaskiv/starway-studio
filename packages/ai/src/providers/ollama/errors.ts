export class OllamaProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'OllamaProviderError'
  }
}

export class OllamaRateLimitError extends OllamaProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OllamaRateLimitError'
  }
}

export class OllamaTimeoutError extends OllamaProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OllamaTimeoutError'
  }
}

export class OllamaCancelledError extends OllamaProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OllamaCancelledError'
  }
}

export class OllamaStructuredOutputError extends OllamaProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OllamaStructuredOutputError'
  }
}

export class OllamaAuthenticationError extends OllamaProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'OllamaAuthenticationError'
  }
}

