export class RoutingEngineError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'RoutingEngineError'
  }
}

export class TransitionValidationError extends RoutingEngineError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'TransitionValidationError'
  }
}

export class RoutingPolicyError extends RoutingEngineError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'RoutingPolicyError'
  }
}
