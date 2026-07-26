export class RepositoryAnalyzerError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'RepositoryAnalyzerError'
  }
}

export class RepositoryProviderError extends RepositoryAnalyzerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'RepositoryProviderError'
  }
}

export class RepositoryValidationError extends RepositoryAnalyzerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'RepositoryValidationError'
  }
}
