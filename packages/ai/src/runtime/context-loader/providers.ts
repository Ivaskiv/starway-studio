import type { IContextProvider } from './types.js'

export class TaskContextProvider implements IContextProvider {
  readonly source = 'task' as const

  async provide(input: import('./types.js').ContextProviderInput) {
    return {
      source: this.source,
      summaryFragment: `Task: ${input.task.objective}`,
      task: {
        id: input.task.id,
        description: input.task.description,
        objective: input.task.objective,
        priority: input.task.priority,
        metadata: input.task.metadata,
      },
    }
  }
}

export class RuntimeStateContextProvider implements IContextProvider {
  readonly source = 'runtime_state' as const

  async provide(input: import('./types.js').ContextProviderInput) {
    return {
      source: this.source,
      summaryFragment: `Runtime state: ${input.state.status}`,
      runtimeState: {
        status: input.state.status,
        currentAgentId: input.state.currentAgentId,
        completedAgentIds: input.state.completedAgentIds,
        finalOutcome: input.state.finalOutcome,
      },
    }
  }
}

export class PromptContextProvider implements IContextProvider {
  readonly source = 'prompt' as const

  async provide(input: import('./types.js').ContextProviderInput) {
    return {
      source: this.source,
      summaryFragment: `Prompt: ${input.prompt.id}@${input.prompt.version}`,
      prompt: {
        id: input.prompt.id,
        version: input.prompt.version,
      },
      metadata: {
        promptMetadata: input.prompt.metadata,
      },
    }
  }
}

export class ArtifactContextProvider implements IContextProvider {
  readonly source = 'artifacts' as const

  async provide(input: import('./types.js').ContextProviderInput) {
    if (!input.state.artifacts.length) {
      return null
    }

    return {
      source: this.source,
      summaryFragment: `Prior artifacts: ${input.state.artifacts.length}`,
      priorArtifacts: input.state.artifacts,
    }
  }
}
