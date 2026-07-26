export class AgentRegistryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'AgentRegistryError'
  }
}

export class AgentRegistrationValidationError extends AgentRegistryError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'AgentRegistrationValidationError'
  }
}

export class AgentRegistryLookupError extends AgentRegistryError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'AgentRegistryLookupError'
  }
}

