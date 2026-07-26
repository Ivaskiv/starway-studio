import { InvalidRoutingDecisionError, RuntimeOrchestratorError, TransitionLimitExceededError } from './errors.js'
import type {
  AgentId,
  EngineeringTask,
  ExecutionResult,
  IAgentRunner,
  IArtifactEngine,
  IExecutionState,
  IRuntimeLogger,
  IRoutingEngine,
  RoutingDecision,
  RuntimeOrchestratorOptions,
} from './types.js'

const DEFAULT_MAX_TRANSITIONS = 25

export interface RuntimeOrchestratorDependencies {
  routingEngine: IRoutingEngine
  agentRunner: IAgentRunner
  artifactEngine: IArtifactEngine
  executionState: IExecutionState
  logger?: IRuntimeLogger
  options?: RuntimeOrchestratorOptions
}

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class RuntimeOrchestrator {
  private readonly logger: IRuntimeLogger
  private readonly maxTransitions: number

  constructor(private readonly deps: RuntimeOrchestratorDependencies) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
    this.maxTransitions = deps.options?.maxTransitions ?? DEFAULT_MAX_TRANSITIONS
  }

  async execute(task: EngineeringTask): Promise<ExecutionResult> {
    await this.deps.executionState.initialize(task)
    this.logger.info('runtime_orchestrator.task_initialized', { taskId: task.id })

    let transitions = 0
    let decision: RoutingDecision
    try {
      decision = await this.getFirstDecision(task)
    } catch (cause) {
      const reason =
        cause instanceof Error ? cause.message : 'Runtime Orchestrator failed to determine the first routing decision.'
      await this.deps.executionState.markFailed(reason)
      this.logger.error('runtime_orchestrator.initial_routing_failed', {
        taskId: task.id,
        error: this.errorToLogContext(cause),
      })
      return this.buildFailedResult(reason, undefined, cause)
    }

    while (true) {
      transitions += 1
      if (transitions > this.maxTransitions) {
        const error = new TransitionLimitExceededError(this.maxTransitions)
        await this.deps.executionState.markFailed(error.message)
        this.logger.error('runtime_orchestrator.transition_limit_exceeded', {
          taskId: task.id,
          maxTransitions: this.maxTransitions,
        })
        return this.buildFailedResult(error.message, undefined, error)
      }

      switch (decision.kind) {
        case 'execute':
          try {
            decision = await this.executeAgentAndResolveNext(task, decision.agentId)
          } catch (cause) {
            if (cause instanceof ArtifactRejectedSignal) {
              return {
                status: 'blocked',
                reason: cause.message,
                retryable: cause.retryable,
                failedAgentId: cause.failedAgentId,
                state: await this.deps.executionState.getSnapshot(),
              }
            }

            const failedAgentId = cause instanceof AgentExecutionFailedError ? cause.failedAgentId : undefined
            const reason = cause instanceof Error ? cause.message : 'Runtime Orchestrator execution failed.'
            await this.deps.executionState.markFailed(reason)
            this.logger.error('runtime_orchestrator.execution_failed', {
              taskId: task.id,
              agentId: failedAgentId,
              error: this.errorToLogContext(cause),
            })
            return this.buildFailedResult(reason, failedAgentId, cause)
          }
          break
        case 'awaiting_approval':
          await this.deps.executionState.markAwaitingApproval(decision.checkpoint, decision.reason)
          this.logger.warn('runtime_orchestrator.awaiting_approval', {
            taskId: task.id,
            checkpoint: decision.checkpoint,
          })
          return {
            status: 'awaiting_approval',
            checkpoint: decision.checkpoint,
            reason: decision.reason,
            state: await this.deps.executionState.getSnapshot(),
          }
        case 'blocked':
          await this.deps.executionState.markBlocked(decision.reason)
          this.logger.warn('runtime_orchestrator.blocked', {
            taskId: task.id,
            reason: decision.reason,
          })
          return {
            status: 'blocked',
            reason: decision.reason,
            retryable: decision.retryable ?? false,
            state: await this.deps.executionState.getSnapshot(),
          }
        case 'complete':
          await this.deps.executionState.markCompleted(decision.outcome, decision.summary)
          this.logger.info('runtime_orchestrator.completed', {
            taskId: task.id,
            outcome: decision.outcome,
          })
          return {
            status: 'completed',
            outcome: decision.outcome,
            summary: decision.summary,
            state: await this.deps.executionState.getSnapshot(),
          }
        default: {
          const exhaustiveCheck: never = decision
          throw new InvalidRoutingDecisionError(
            `Runtime Orchestrator received an unsupported routing decision: ${String(exhaustiveCheck)}`,
          )
        }
      }
    }
  }

  private async getFirstDecision(task: EngineeringTask): Promise<RoutingDecision> {
    const state = await this.deps.executionState.getSnapshot()
    const decision = await this.deps.routingEngine.determineFirstAgent({ task, state })
    this.ensureRoutingDecision(decision, 'first')
    return decision
  }

  private async executeAgentAndResolveNext(task: EngineeringTask, agentId: AgentId): Promise<RoutingDecision> {
    await this.deps.executionState.setCurrentAgent(agentId)
    const stateBeforeRun = await this.deps.executionState.getSnapshot()

    this.logger.info('runtime_orchestrator.agent_started', {
      taskId: task.id,
      agentId,
    })

    let runResult
    try {
      runResult = await this.deps.agentRunner.run({
        task,
        agentId,
        state: stateBeforeRun,
      })
    } catch (cause) {
      const reason = `Agent '${agentId}' execution failed.`
      await this.deps.executionState.markFailed(reason)
      this.logger.error('runtime_orchestrator.agent_failed', {
        taskId: task.id,
        agentId,
        error: this.errorToLogContext(cause),
      })
      throw new AgentExecutionFailedError(reason, agentId, cause)
    }

    for (const note of runResult.notes ?? []) {
      await this.deps.executionState.addNote(note)
    }

    const artifactHandling = await this.deps.artifactEngine.validateAndStore({
      task,
      agentId,
      artifact: runResult.artifact,
      state: await this.deps.executionState.getSnapshot(),
    })

    if (artifactHandling.kind === 'rejected') {
      await this.deps.executionState.markBlocked(artifactHandling.reason)
      this.logger.warn('runtime_orchestrator.artifact_rejected', {
        taskId: task.id,
        agentId,
        reason: artifactHandling.reason,
      })
      throw new ArtifactRejectedSignal(artifactHandling.reason, artifactHandling.retryable ?? true, agentId)
    }

    await this.deps.executionState.recordArtifact(artifactHandling.artifact)
    await this.deps.executionState.completeAgent(agentId)
    this.logger.info('runtime_orchestrator.agent_completed', {
      taskId: task.id,
      agentId,
      artifactId: artifactHandling.artifact.id,
    })

    const nextDecision = await this.deps.routingEngine.determineNextAgent({
      task,
      state: await this.deps.executionState.getSnapshot(),
      lastAgentId: agentId,
      artifact: artifactHandling.artifact,
    })
    this.ensureRoutingDecision(nextDecision, 'next')
    return nextDecision
  }

  private ensureRoutingDecision(decision: RoutingDecision | null | undefined, stage: 'first' | 'next'): void {
    if (!decision) {
      throw new InvalidRoutingDecisionError(`Routing engine returned no ${stage} routing decision.`)
    }

    if (decision.kind === 'execute' && !decision.agentId) {
      throw new InvalidRoutingDecisionError(`Routing engine returned an execute decision without an agent for ${stage} stage.`)
    }
  }

  private async buildFailedResult(reason: string, failedAgentId?: AgentId, cause?: unknown): Promise<ExecutionResult> {
    return {
      status: 'failed',
      reason,
      failedAgentId,
      cause,
      state: await this.deps.executionState.getSnapshot(),
    }
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

export class ArtifactRejectedSignal extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly failedAgentId: AgentId,
  ) {
    super(message)
    this.name = 'ArtifactRejectedSignal'
  }
}

class AgentExecutionFailedError extends RuntimeOrchestratorError {
  constructor(
    message: string,
    readonly failedAgentId: AgentId,
    cause?: unknown,
  ) {
    super(message, cause)
    this.name = 'AgentExecutionFailedError'
  }
}
