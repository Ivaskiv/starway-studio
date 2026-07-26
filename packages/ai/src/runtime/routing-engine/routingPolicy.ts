import type { AgentId, PersistedArtifact, RoutingDecision } from '../orchestrator/types.js'
import { RoutingPolicyError } from './errors.js'
import type {
  IRoutingPolicy,
  RoutingDecisionWithMetadata,
  RoutingDirective,
  RoutingPolicyContext,
  RoutingPolicyOptions,
} from './types.js'

const DEFAULT_FIRST_AGENT_ID: AgentId = 'project_manager'
const DEFAULT_IMPLEMENTATION_AGENT_ID: AgentId = 'implementation'
const DEFAULT_REFACTORING_AGENT_ID: AgentId = 'refactoring'
const DEFAULT_REVIEW_AGENT_ID: AgentId = 'code_review'
const DEFAULT_RELEASE_AGENT_ID: AgentId = 'release_readiness'

type ArtifactRoutingPayload = {
  routing?: RoutingDirective
  approvalRequired?: boolean
  approvalCheckpoint?: string
  approvalReason?: string
  reviewOutcome?: 'approved' | 'changes_requested'
  recommendedNextAgentId?: AgentId
  releaseOutcome?: 'ready' | 'not_ready' | 'cancelled'
  releaseSummary?: string
}

export class RoutingPolicy implements IRoutingPolicy {
  private readonly firstAgentId: AgentId
  private readonly fallbackImplementationAgentId: AgentId
  private readonly fallbackRefactoringAgentId: AgentId
  private readonly fallbackReviewAgentId: AgentId
  private readonly fallbackReleaseAgentId: AgentId

  constructor(options: RoutingPolicyOptions = {}) {
    this.firstAgentId = options.firstAgentId ?? DEFAULT_FIRST_AGENT_ID
    this.fallbackImplementationAgentId = options.fallbackImplementationAgentId ?? DEFAULT_IMPLEMENTATION_AGENT_ID
    this.fallbackRefactoringAgentId = options.fallbackRefactoringAgentId ?? DEFAULT_REFACTORING_AGENT_ID
    this.fallbackReviewAgentId = options.fallbackReviewAgentId ?? DEFAULT_REVIEW_AGENT_ID
    this.fallbackReleaseAgentId = options.fallbackReleaseAgentId ?? DEFAULT_RELEASE_AGENT_ID
  }

  async determineFirstDecision(_context: RoutingPolicyContext): Promise<RoutingDecisionWithMetadata> {
    return {
      kind: 'execute',
      agentId: this.firstAgentId,
      reason: 'Canonical routing starts with the Project Manager stage.',
      transition: {
        transitionKey: `human->${this.firstAgentId}`,
        stage: 'first',
        trigger: 'task_initialized',
        fromAgentId: 'human',
        toAgentId: this.firstAgentId,
        reason: 'Initial runtime routing',
      },
    }
  }

  async determineNextDecision(
    context: RoutingPolicyContext & { lastAgentId: AgentId; artifact: PersistedArtifact },
  ): Promise<RoutingDecisionWithMetadata> {
    const directive = this.readRoutingDirective(context.artifact)
    if (directive) {
      return this.buildDirectiveDecision(context.lastAgentId, directive)
    }

    return this.buildFallbackDecision(context.lastAgentId, context.artifact)
  }

  private buildDirectiveDecision(lastAgentId: AgentId, directive: RoutingDirective): RoutingDecisionWithMetadata {
    const baseTransition = {
      stage: 'next' as const,
      trigger: this.mapDirectiveTrigger(directive.kind),
      fromAgentId: lastAgentId,
      reason: directive.reason,
    }

    switch (directive.kind) {
      case 'execute':
        if (!directive.agentId) {
          throw new RoutingPolicyError(`Routing directive from '${lastAgentId}' is missing agentId.`)
        }
        return {
          kind: 'execute',
          agentId: directive.agentId,
          reason: directive.reason,
          transition: {
            ...baseTransition,
            transitionKey: `${lastAgentId}->${directive.agentId}`,
            toAgentId: directive.agentId,
          },
        }
      case 'awaiting_approval':
        if (!directive.checkpoint || !directive.reason) {
          throw new RoutingPolicyError(`Approval directive from '${lastAgentId}' is missing checkpoint or reason.`)
        }
        return {
          kind: 'awaiting_approval',
          checkpoint: directive.checkpoint,
          reason: directive.reason,
          transition: {
            ...baseTransition,
            transitionKey: `${lastAgentId}->awaiting_approval`,
            toAgentId: 'human',
            terminalState: 'awaiting_approval',
          },
        }
      case 'blocked':
        if (!directive.reason) {
          throw new RoutingPolicyError(`Blocked directive from '${lastAgentId}' is missing a reason.`)
        }
        return {
          kind: 'blocked',
          reason: directive.reason,
          retryable: directive.retryable ?? false,
          transition: {
            ...baseTransition,
            transitionKey: `${lastAgentId}->blocked`,
            terminalState: 'blocked',
          },
        }
      case 'complete':
        if (!directive.outcome) {
          throw new RoutingPolicyError(`Complete directive from '${lastAgentId}' is missing an outcome.`)
        }
        return {
          kind: 'complete',
          outcome: directive.outcome,
          summary: directive.summary ?? directive.reason,
          transition: {
            ...baseTransition,
            transitionKey: `${lastAgentId}->complete`,
            toAgentId: 'human',
            terminalState: 'completed',
          },
        }
      default:
        throw new RoutingPolicyError(`Unsupported routing directive kind '${String(directive.kind)}'.`)
    }
  }

  private buildFallbackDecision(lastAgentId: AgentId, artifact: PersistedArtifact): RoutingDecisionWithMetadata {
    const payload = artifact.payload as ArtifactRoutingPayload

    switch (lastAgentId) {
      case 'project_manager':
        return this.buildExecuteDecision(lastAgentId, 'task_planning', 'Canonical handoff from Project Manager to Task Planning.')
      case 'task_planning':
        if (payload.approvalRequired) {
          return this.buildApprovalDecision(
            lastAgentId,
            payload.approvalCheckpoint ?? 'implementation_approval',
            payload.approvalReason ?? 'Implementation requires explicit approval before execution.',
          )
        }
        if (payload.recommendedNextAgentId === 'refactoring') {
          return this.buildExecuteDecision(
            lastAgentId,
            this.fallbackRefactoringAgentId,
            'Planning artifact requests refactoring-only path.',
          )
        }
        return this.buildExecuteDecision(
          lastAgentId,
          this.fallbackImplementationAgentId,
          'Canonical handoff from Task Planning to Implementation.',
        )
      case 'implementation':
        return this.buildExecuteDecision(
          lastAgentId,
          this.fallbackReviewAgentId,
          'Canonical handoff from Implementation to Code Review.',
        )
      case 'code_review':
        if (payload.reviewOutcome === 'changes_requested') {
          return this.buildExecuteDecision(
            lastAgentId,
            'bug_investigation',
            'Code Review found issues that require investigation.',
          )
        }
        return this.buildExecuteDecision(
          lastAgentId,
          this.fallbackReleaseAgentId,
          'Code Review approved the change set for release readiness.',
        )
      case 'bug_investigation':
        if (payload.recommendedNextAgentId === 'refactoring') {
          return this.buildExecuteDecision(
            lastAgentId,
            this.fallbackRefactoringAgentId,
            'Bug Investigation recommends a refactoring path.',
          )
        }
        return this.buildExecuteDecision(
          lastAgentId,
          this.fallbackImplementationAgentId,
          'Bug Investigation routes back to Implementation for corrective action.',
        )
      case 'refactoring':
        return this.buildExecuteDecision(
          lastAgentId,
          this.fallbackReviewAgentId,
          'Canonical handoff from Refactoring back to Code Review.',
        )
      case 'release_readiness':
        if (payload.releaseOutcome === 'ready') {
          return this.buildCompleteDecision(lastAgentId, 'ready', payload.releaseSummary ?? 'Release readiness approved.')
        }
        if (payload.releaseOutcome === 'cancelled') {
          return this.buildCompleteDecision(lastAgentId, 'cancelled', payload.releaseSummary ?? 'Execution cancelled.')
        }
        if (payload.releaseOutcome === 'not_ready') {
          const correctiveAgentId = payload.recommendedNextAgentId ?? 'implementation'
          return this.buildExecuteDecision(
            lastAgentId,
            correctiveAgentId,
            payload.releaseSummary ?? 'Release readiness requires corrective action before completion.',
          )
        }
        return this.buildBlockedDecision(
          lastAgentId,
          'Release readiness artifact is missing an explicit releaseOutcome.',
          true,
        )
      default:
        throw new RoutingPolicyError(`No fallback routing policy is defined for '${lastAgentId}'.`)
    }
  }

  private buildExecuteDecision(
    fromAgentId: AgentId,
    toAgentId: AgentId,
    reason: string,
  ): RoutingDecisionWithMetadata {
    return {
      kind: 'execute',
      agentId: toAgentId,
      reason,
      transition: {
        transitionKey: `${fromAgentId}->${toAgentId}`,
        stage: 'next',
        trigger: 'fallback_policy',
        fromAgentId,
        toAgentId,
        reason,
      },
    }
  }

  private buildApprovalDecision(
    fromAgentId: AgentId,
    checkpoint: string,
    reason: string,
  ): RoutingDecisionWithMetadata {
    return {
      kind: 'awaiting_approval',
      checkpoint,
      reason,
      transition: {
        transitionKey: `${fromAgentId}->awaiting_approval`,
        stage: 'next',
        trigger: 'approval_required',
        fromAgentId,
        toAgentId: 'human',
        terminalState: 'awaiting_approval',
        reason,
      },
    }
  }

  private buildBlockedDecision(fromAgentId: AgentId, reason: string, retryable: boolean): RoutingDecisionWithMetadata {
    return {
      kind: 'blocked',
      reason,
      retryable,
      transition: {
        transitionKey: `${fromAgentId}->blocked`,
        stage: 'next',
        trigger: 'terminal_verdict',
        fromAgentId,
        terminalState: 'blocked',
        reason,
      },
    }
  }

  private buildCompleteDecision(
    fromAgentId: AgentId,
    outcome: NonNullable<Extract<RoutingDecision, { kind: 'complete' }>['outcome']>,
    summary: string,
  ): RoutingDecisionWithMetadata {
    return {
      kind: 'complete',
      outcome,
      summary,
      transition: {
        transitionKey: `${fromAgentId}->complete`,
        stage: 'next',
        trigger: 'terminal_verdict',
        fromAgentId,
        toAgentId: 'human',
        terminalState: 'completed',
        reason: summary,
      },
    }
  }

  private readRoutingDirective(artifact: PersistedArtifact): RoutingDirective | null {
    const payload = artifact.payload as ArtifactRoutingPayload
    const directive = payload.routing
    if (!directive || typeof directive !== 'object') {
      return null
    }
    return directive
  }

  private mapDirectiveTrigger(kind: RoutingDirective['kind']) {
    switch (kind) {
      case 'awaiting_approval':
        return 'approval_required' as const
      case 'complete':
      case 'blocked':
        return 'terminal_verdict' as const
      case 'execute':
      default:
        return 'artifact_routing_directive' as const
    }
  }
}
