export class RuntimeOrchestratorError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'RuntimeOrchestratorError'
  }
}

export class InvalidRoutingDecisionError extends RuntimeOrchestratorError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'InvalidRoutingDecisionError'
  }
}

export class TransitionLimitExceededError extends RuntimeOrchestratorError {
  constructor(readonly limit: number) {
    super(`Runtime Orchestrator exceeded the maximum transition limit (${limit}).`)
    this.name = 'TransitionLimitExceededError'
  }
}
