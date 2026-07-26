export class ProviderConfigurationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ProviderConfigurationError'
  }
}

export class ProviderResolutionError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ProviderResolutionError'
  }
}

export class ProviderFactoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ProviderFactoryError'
  }
}

