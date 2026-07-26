export class ArtifactEngineError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ArtifactEngineError'
  }
}

export class ArtifactValidationError extends ArtifactEngineError {
  constructor(message: string) {
    super(message)
    this.name = 'ArtifactValidationError'
  }
}

export class ArtifactOwnershipError extends ArtifactEngineError {
  constructor(message: string) {
    super(message)
    this.name = 'ArtifactOwnershipError'
  }
}

export class ArtifactStoreError extends ArtifactEngineError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'ArtifactStoreError'
  }
}
