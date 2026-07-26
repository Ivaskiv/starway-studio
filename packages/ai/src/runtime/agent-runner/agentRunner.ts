import {
  AgentDefinitionNotFoundError,
  AgentDependencyResolutionError,
  AgentOutputValidationError,
  AgentPrerequisiteError,
} from './errors.js'
import type {
  AgentDefinition,
  AgentRunnerDependencies,
  AIProviderResponse,
  LoadedExecutionContext,
  ResolvedPrompt,
} from './types.js'
import type {
  AgentId,
  AgentRunInput,
  AgentRunResult,
  ExecutionStateSnapshot,
  IAgentRunner,
  IRuntimeLogger,
} from '../orchestrator/types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class AgentRunner implements IAgentRunner {
  private readonly definitions: Readonly<Partial<Record<AgentId, AgentDefinition>>>
  private readonly logger: IRuntimeLogger

  constructor(private readonly deps: AgentRunnerDependencies) {
    this.definitions = normalizeDefinitions(deps.agentDefinitions)
    this.logger = deps.logger ?? new NoopRuntimeLogger()
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const agentDefinition = this.definitions[input.agentId]
    if (!agentDefinition) {
      throw new AgentDefinitionNotFoundError(input.agentId)
    }

    this.validatePrerequisites(input, agentDefinition)
    this.logger.info('agent_runner.agent_started', {
      taskId: input.task.id,
      agentId: input.agentId,
      promptId: agentDefinition.promptId,
    })

    const prompt = await this.resolvePrompt(input, agentDefinition)
    const context = await this.loadContext(input, agentDefinition, prompt)
    const { providerResponse, latencyMs } = await this.executeProvider(input, agentDefinition, prompt, context)
    this.validateProviderResponse(input.agentId, providerResponse)

    const artifact = await this.deps.artifactFactory.createArtifact({
      agentDefinition,
      task: input.task,
      state: input.state,
      prompt,
      context,
      providerResponse,
    })

    if (artifact.owner !== input.agentId) {
      throw new AgentOutputValidationError(
        `Artifact owner '${artifact.owner}' does not match active agent '${input.agentId}'.`,
      )
    }

    if (artifact.type !== agentDefinition.artifactType) {
      throw new AgentOutputValidationError(
        `Artifact type '${artifact.type}' does not match expected type '${agentDefinition.artifactType}'.`,
      )
    }

    const artifactValidation = await this.deps.artifactValidator.validate({
      agentDefinition,
      task: input.task,
      state: input.state,
      artifact,
      providerResponse,
    })

    if (!artifactValidation.valid) {
      throw new AgentOutputValidationError(
        artifactValidation.reason ??
          `Artifact validation failed for agent '${input.agentId}'.`,
      )
    }

    if (this.deps.usageLedger) {
      await this.deps.usageLedger.recordExecution({
        agentDefinition,
        task: input.task,
        promptText: prompt.content,
        contextText: context.summary,
        providerResponse,
        latencyMs,
      })
    }

    this.logger.info('agent_runner.agent_completed', {
      taskId: input.task.id,
      agentId: input.agentId,
      artifactId: artifact.id,
      promptVersion: prompt.version,
    })

    return {
      artifact,
      notes: [...(providerResponse.notes ?? []), ...(artifactValidation.notes ?? [])],
    }
  }

  private validatePrerequisites(input: AgentRunInput, agentDefinition: AgentDefinition): void {
    const allowedStatuses = agentDefinition.allowedStatuses ?? ['running', 'initialized']
    if (!allowedStatuses.includes(input.state.status)) {
      throw new AgentPrerequisiteError(
        `Agent '${input.agentId}' cannot run while execution state is '${input.state.status}'.`,
      )
    }

    if (input.state.currentAgentId && input.state.currentAgentId !== input.agentId) {
      throw new AgentPrerequisiteError(
        `Execution state is currently assigned to '${input.state.currentAgentId}', not '${input.agentId}'.`,
      )
    }

    for (const requiredAgentId of agentDefinition.requiredCompletedAgentIds ?? []) {
      if (!input.state.completedAgentIds.includes(requiredAgentId)) {
        throw new AgentPrerequisiteError(
          `Agent '${input.agentId}' requires completed artifact ownership from '${requiredAgentId}' before execution.`,
        )
      }
    }
  }

  private async resolvePrompt(input: AgentRunInput, agentDefinition: AgentDefinition): Promise<ResolvedPrompt> {
    try {
      const prompt = await this.deps.promptRegistry.resolvePrompt({
        agentDefinition,
        task: input.task,
        state: input.state,
      })

      if (!prompt.content.trim()) {
        throw new AgentOutputValidationError(`Resolved prompt '${prompt.id}' is empty.`)
      }

      return prompt
    } catch (cause) {
      if (cause instanceof AgentOutputValidationError) {
        throw cause
      }

      this.logger.error('agent_runner.prompt_resolution_failed', {
        taskId: input.task.id,
        agentId: input.agentId,
        error: toErrorContext(cause),
      })
      throw new AgentDependencyResolutionError(
        `Agent Runner could not resolve prompt '${agentDefinition.promptId}' for agent '${input.agentId}'.`,
        cause,
      )
    }
  }

  private async loadContext(
    input: AgentRunInput,
    agentDefinition: AgentDefinition,
    prompt: ResolvedPrompt,
  ): Promise<LoadedExecutionContext> {
    try {
      const context = await this.deps.contextLoader.loadContext({
        agentDefinition,
        task: input.task,
        state: input.state,
        prompt,
      })

      if (!context.summary.trim()) {
        throw new AgentOutputValidationError(`Execution context for agent '${input.agentId}' is empty.`)
      }

      return context
    } catch (cause) {
      if (cause instanceof AgentOutputValidationError) {
        throw cause
      }

      this.logger.error('agent_runner.context_loading_failed', {
        taskId: input.task.id,
        agentId: input.agentId,
        error: toErrorContext(cause),
      })
      throw new AgentDependencyResolutionError(
        `Agent Runner could not load execution context for agent '${input.agentId}'.`,
        cause,
      )
    }
  }

  private async executeProvider(
    input: AgentRunInput,
    agentDefinition: AgentDefinition,
    prompt: ResolvedPrompt,
    context: LoadedExecutionContext,
  ): Promise<{ providerResponse: AIProviderResponse; latencyMs: number }> {
    const startedAt = Date.now()
    try {
      const providerResponse = await this.deps.aiProvider.execute({
        agentDefinition,
        task: input.task,
        state: input.state,
        prompt,
        context,
      })

      return {
        providerResponse,
        latencyMs: Date.now() - startedAt,
      }
    } catch (cause) {
      this.logger.error('agent_runner.provider_execution_failed', {
        taskId: input.task.id,
        agentId: input.agentId,
        error: toErrorContext(cause),
      })
      throw new AgentDependencyResolutionError(
        `Agent Runner provider execution failed for agent '${input.agentId}'.`,
        cause,
      )
    }
  }

  private validateProviderResponse(agentId: AgentId, providerResponse: AIProviderResponse): void {
    const hasContent = typeof providerResponse.content === 'string' && providerResponse.content.trim().length > 0
    const hasStructuredOutput =
      providerResponse.structuredOutput !== undefined &&
      Object.keys(providerResponse.structuredOutput).length > 0

    if (!hasContent && !hasStructuredOutput) {
      throw new AgentOutputValidationError(
        `AI provider returned no usable output for agent '${agentId}'.`,
      )
    }
  }
}

function normalizeDefinitions(
  definitions: AgentRunnerDependencies['agentDefinitions'],
): Readonly<Partial<Record<AgentId, AgentDefinition>>> {
  if (Array.isArray(definitions)) {
    return definitions.reduce<Partial<Record<AgentId, AgentDefinition>>>((accumulator, definition) => {
      accumulator[definition.id] = definition
      return accumulator
    }, {})
  }

  return definitions
}

function toErrorContext(cause: unknown): Record<string, unknown> {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
    }
  }

  return { cause }
}
