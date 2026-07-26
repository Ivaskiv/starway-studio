export class PromptRegistryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'PromptRegistryError'
  }
}

export class PromptNotFoundError extends PromptRegistryError {
  constructor(promptId: string, version?: string) {
    super(
      version
        ? `Prompt Registry could not find prompt '${promptId}' version '${version}'.`
        : `Prompt Registry could not find prompt '${promptId}'.`,
    )
    this.name = 'PromptNotFoundError'
  }
}

export class PromptOwnershipConflictError extends PromptRegistryError {
  constructor(agentId: string, promptIds: string[]) {
    super(`Prompt Registry found multiple canonical prompts for agent '${agentId}': ${promptIds.join(', ')}.`)
    this.name = 'PromptOwnershipConflictError'
  }
}

export class PromptCompatibilityError extends PromptRegistryError {
  constructor(message: string) {
    super(message)
    this.name = 'PromptCompatibilityError'
  }
}

export class PromptMetadataValidationError extends PromptRegistryError {
  constructor(message: string) {
    super(message)
    this.name = 'PromptMetadataValidationError'
  }
}

export class PromptDeprecatedError extends PromptRegistryError {
  constructor(promptId: string, version: string) {
    super(`Prompt '${promptId}' version '${version}' is deprecated and cannot be selected silently.`)
    this.name = 'PromptDeprecatedError'
  }
}
