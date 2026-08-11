import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger, PersistedArtifact, RoutingDecision } from '../orchestrator/types.js'
import { RoutingPolicyError, TransitionValidationError } from './errors.js'
import type { IRoutingEngine, RoutingEngineDependencies } from './types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class RoutingEngine implements IRoutingEngine {
  private readonly logger: IRuntimeLogger

  constructor(private readonly deps: RoutingEngineDependencies) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
  }

  async determineFirstAgent(input: {
    task: EngineeringTask
    state: ExecutionStateSnapshot
  }): Promise<RoutingDecision> {
    let decision: RoutingDecision
    try {
      decision = await this.deps.policy.determineFirstDecision({
        task: input.task,
        state: input.state,
      })
    } catch (cause) {
      this.logger.error('routing_engine.first.policy_failed', {
        taskId: input.task.id,
        error: this.errorToLogContext(cause),
      })
      throw new RoutingPolicyError('Routing policy failed to determine the first agent.', cause)
    }

    const validation = await this.deps.validator.validate({
      state: input.state,
      decision,
      stage: 'first',
    })

    if (!validation.valid) {
      this.logger.warn('routing_engine.first.invalid_transition', {
        taskId: input.task.id,
        reason: validation.reason,
      })
      throw new TransitionValidationError(validation.reason ?? 'Initial routing decision is invalid.')
    }

    this.logger.info('routing_engine.first.decision', {
      taskId: input.task.id,
      decisionKind: decision.kind,
      agentId: decision.kind === 'execute' ? decision.agentId : undefined,
    })
    return decision
  }

  async determineNextAgent(input: {
    task: EngineeringTask
    state: ExecutionStateSnapshot
    lastAgentId: PersistedArtifact['owner']
    artifact: PersistedArtifact
  }): Promise<RoutingDecision> {
    let decision: RoutingDecision
    try {
      decision = await this.deps.policy.determineNextDecision({
        task: input.task,
        state: input.state,
        lastAgentId: input.lastAgentId,
        artifact: input.artifact,
      })
    } catch (cause) {
      this.logger.error('routing_engine.next.policy_failed', {
        taskId: input.task.id,
        lastAgentId: input.lastAgentId,
        artifactId: input.artifact.id,
        error: this.errorToLogContext(cause),
      })
      throw new RoutingPolicyError(`Routing policy failed after '${input.lastAgentId}'.`, cause)
    }

    const validation = await this.deps.validator.validate({
      state: input.state,
      decision,
      stage: 'next',
      lastAgentId: input.lastAgentId,
    })

    if (!validation.valid) {
      this.logger.warn('routing_engine.next.invalid_transition', {
        taskId: input.task.id,
        lastAgentId: input.lastAgentId,
        artifactId: input.artifact.id,
        reason: validation.reason,
      })
      throw new TransitionValidationError(validation.reason ?? `Transition from '${input.lastAgentId}' is invalid.`)
    }

    this.logger.info('routing_engine.next.decision', {
      taskId: input.task.id,
      lastAgentId: input.lastAgentId,
      artifactId: input.artifact.id,
      decisionKind: decision.kind,
      agentId: decision.kind === 'execute' ? decision.agentId : undefined,
    })

    return decision
  }

  private errorToLogContext(cause: unknown): Record<string, unknown> {
    if (cause instanceof Error) {
      return {
        name: cause.name,
        message: cause.message,
      }
    }
    return { cause }
  }
}
