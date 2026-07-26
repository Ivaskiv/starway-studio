export class AgentRunnerError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'AgentRunnerError'
  }
}

export class AgentDefinitionNotFoundError extends AgentRunnerError {
  constructor(agentId: string) {
    super(`Agent Runner could not find a definition for agent '${agentId}'.`)
    this.name = 'AgentDefinitionNotFoundError'
  }
}

export class AgentPrerequisiteError extends AgentRunnerError {
  constructor(message: string) {
    super(message)
    this.name = 'AgentPrerequisiteError'
  }
}

export class AgentDependencyResolutionError extends AgentRunnerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'AgentDependencyResolutionError'
  }
}

export class AgentOutputValidationError extends AgentRunnerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'AgentOutputValidationError'
  }
}
