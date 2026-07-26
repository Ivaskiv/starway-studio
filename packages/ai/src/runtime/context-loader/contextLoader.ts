import { ContextMergeError, ContextProviderError, ContextValidationError } from './errors.js'
import {
  DEFAULT_CONTEXT_SOURCE_PRIORITY,
  DEFAULT_REQUIRED_CONTEXT_SOURCES,
} from './types.js'
import type {
  ContextLoaderDependencies,
  ContextSourceKind,
  IContextLoader,
} from './types.js'
import type { AgentDefinition } from '../agent-runner/types.js'
import type { IRuntimeLogger } from '../orchestrator/types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class ContextLoader implements IContextLoader {
  private readonly logger: IRuntimeLogger

  constructor(private readonly deps: ContextLoaderDependencies) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
  }

  async loadContext(input: import('./types.js').ContextProviderInput): Promise<import('./types.js').RuntimeContext> {
    const requiredSources = this.getRequiredSources(input.agentDefinition)
    const orderedProviders = this.deps.providers
      .filter((provider) => requiredSources.includes(provider.source))
      .sort((left, right) => DEFAULT_CONTEXT_SOURCE_PRIORITY.indexOf(left.source) - DEFAULT_CONTEXT_SOURCE_PRIORITY.indexOf(right.source))

    this.logger.info('context_loader.context_started', {
      taskId: input.task.id,
      agentId: input.agentDefinition.id,
      requiredSources,
    })

    const contributions: import('./types.js').ContextContribution[] = []

    for (const provider of orderedProviders) {
      try {
        const contribution = await provider.provide(input)
        if (contribution) {
          contributions.push(contribution)
        }
      } catch (cause) {
        this.logger.error('context_loader.provider_failed', {
          taskId: input.task.id,
          agentId: input.agentDefinition.id,
          source: provider.source,
          error: toErrorContext(cause),
        })
        throw new ContextProviderError(provider.source, cause)
      }
    }

    let context: import('./types.js').RuntimeContext
    try {
      context = await this.deps.merger.merge({
        contributions,
        priorityOrder: DEFAULT_CONTEXT_SOURCE_PRIORITY,
      })
    } catch (cause) {
      this.logger.error('context_loader.merge_failed', {
        taskId: input.task.id,
        agentId: input.agentDefinition.id,
        error: toErrorContext(cause),
      })
      throw cause instanceof ContextMergeError
        ? cause
        : new ContextMergeError('Context merge failed during runtime context assembly.', cause)
    }

    const validation = await this.deps.validator.validate({
      context,
      requiredSources,
      agentDefinition: input.agentDefinition,
      task: input.task,
      state: input.state,
    })

    if (!validation.valid) {
      this.logger.warn('context_loader.context_invalid', {
        taskId: input.task.id,
        agentId: input.agentDefinition.id,
        reason: validation.reason,
        missingSources: validation.missingSources,
      })
      throw new ContextValidationError(validation.reason ?? 'Runtime context validation failed.')
    }

    this.logger.info('context_loader.context_completed', {
      taskId: input.task.id,
      agentId: input.agentDefinition.id,
      sourceOrder: context.sourceOrder,
    })

    return context
  }

  private getRequiredSources(agentDefinition: AgentDefinition): ContextSourceKind[] {
    return agentDefinition.requiredContextSources?.length
      ? agentDefinition.requiredContextSources
      : DEFAULT_REQUIRED_CONTEXT_SOURCES
  }
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
