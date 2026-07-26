export class ContextLoaderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ContextLoaderError'
  }
}

export class ContextProviderError extends ContextLoaderError {
  constructor(source: string, cause?: unknown) {
    super(`Context provider '${source}' failed during context assembly.`, cause)
    this.name = 'ContextProviderError'
  }
}

export class ContextValidationError extends ContextLoaderError {
  constructor(message: string) {
    super(message)
    this.name = 'ContextValidationError'
  }
}

export class ContextMergeError extends ContextLoaderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'ContextMergeError'
  }
}
