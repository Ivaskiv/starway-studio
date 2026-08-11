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
const GUARDIAN_CHECKPOINT = 'guardian_validation'
const AGENT_CONFLICT_REASON = 'AGENT_CONFLICT'
const MISSING_CONTEXT_REASON = 'MISSING_CONTEXT'
const CONTEXT_CONFLICT_REASON = 'CONTEXT_CONFLICT'

type ArtifactRoutingPayload = {
  routing?: RoutingDirective
  approvalRequired?: boolean
  approvalCheckpoint?: string
  approvalReason?: string
  reviewOutcome?: 'approved' | 'changes_requested'
  recommendedNextAgentId?: AgentId
  releaseOutcome?: 'ready' | 'not_ready' | 'cancelled'
  releaseSummary?: string
  missingContext?: boolean
  missingContextReason?: string
  missingContextOwnerAgentId?: AgentId
  contextConflict?: boolean
  contextConflictReason?: string
  agentConflict?: boolean
  conflictSummary?: string
  conflicts?: unknown[]
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

    return this.buildFallbackDecision(context.lastAgentId, context.artifact, context.task)
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

  private buildFallbackDecision(
    lastAgentId: AgentId,
    artifact: PersistedArtifact,
    task: RoutingPolicyContext['task'],
  ): RoutingDecisionWithMetadata {
    const payload = artifact.payload as ArtifactRoutingPayload
    const signalDecision = this.buildSignalDecision(lastAgentId, payload)
    if (signalDecision) {
      return signalDecision
    }

    switch (lastAgentId) {
      case 'project_manager':
        return this.buildExecuteDecision(
          lastAgentId,
          this.selectProjectManagerOwner(task),
          'Project Manager normalized the task and routed it to the canonical owner.',
        )
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
      case 'analytics_agent':
        if (this.isFinanceTask(task)) {
          return this.buildExecuteDecision(
            lastAgentId,
            'finance_agent',
            'Analytics must provide aggregate inputs before Finance computes CAC/LTV/ROI or margin.',
          )
        }
        if (this.requiresGuardian(task)) {
          return this.buildGuardianDecision(lastAgentId, 'Analytics output changes a recommendation and requires Guardian validation.')
        }
        return this.buildCompleteDecision(lastAgentId, 'ready', 'Analytics owner completed the requested analysis.')
      case 'finance_agent':
        if (this.referencesHistoricalFocusMetric(task)) {
          return this.buildBlockedDecision(
            lastAgentId,
            `${MISSING_CONTEXT_REASON}: historical manual-practice validation is not a current FOCUS metric.`,
            true,
          )
        }
        if (this.shouldRouteToFunnel(task)) {
          return this.buildExecuteDecision(
            lastAgentId,
            'funnel_agent',
            'Finance completed the calculation stage and routed the task to Funnel for downstream conversion changes.',
          )
        }
        if (this.shouldRouteToAdsCreative(task)) {
          return this.buildExecuteDecision(
            lastAgentId,
            'ads_creative_agent',
            'Finance completed the calculation stage and routed the task to Ads / Creative.',
          )
        }
        if (this.requiresGuardian(task)) {
          return this.buildGuardianDecision(lastAgentId, 'Finance output changes a recommendation and requires Guardian validation.')
        }
        return this.buildCompleteDecision(lastAgentId, 'ready', 'Finance owner completed the requested calculation.')
      case 'funnel_agent':
        if (this.shouldRouteToAdsCreative(task)) {
          return this.buildExecuteDecision(
            lastAgentId,
            'ads_creative_agent',
            'Funnel routed the task to Ads / Creative for channel-level execution changes.',
          )
        }
        if (this.requiresGuardian(task)) {
          return this.buildGuardianDecision(lastAgentId, 'Funnel output changes a recommendation and requires Guardian validation.')
        }
        return this.buildCompleteDecision(lastAgentId, 'ready', 'Funnel owner completed the requested optimization.')
      case 'ads_creative_agent':
      case 'strategy_agent':
      case 'product_agent':
      case 'methodology_agent':
      case 'user_intelligence_agent':
      case 'retention_agent':
      case 'tech_ai_agent':
      case 'assistant_agent':
      case 'content_agent':
      case 'sales_agent':
      case 'coach_agent':
      case 'mentor_agent':
        if (this.requiresGuardian(task)) {
          return this.buildGuardianDecision(lastAgentId, 'User-facing or invariant-changing output requires Guardian validation.')
        }
        return this.buildCompleteDecision(lastAgentId, 'ready', `Domain owner '${lastAgentId}' completed the requested task.`)
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

  private buildSignalDecision(
    fromAgentId: AgentId,
    payload: ArtifactRoutingPayload,
  ): RoutingDecisionWithMetadata | null {
    if (payload.contextConflict) {
      return this.buildBlockedDecision(
        fromAgentId,
        `${CONTEXT_CONFLICT_REASON}${payload.contextConflictReason ? `: ${payload.contextConflictReason}` : ''}`,
        false,
      )
    }

    if (payload.agentConflict || (Array.isArray(payload.conflicts) && payload.conflicts.length > 0)) {
      return this.buildBlockedDecision(
        fromAgentId,
        `${AGENT_CONFLICT_REASON}${payload.conflictSummary ? `: ${payload.conflictSummary}` : ''}`,
        false,
      )
    }

    if (payload.missingContextOwnerAgentId) {
      return this.buildExecuteDecision(
        fromAgentId,
        payload.missingContextOwnerAgentId,
        payload.missingContextReason
          ? `${MISSING_CONTEXT_REASON}: ${payload.missingContextReason}`
          : `${MISSING_CONTEXT_REASON}: route to canonical context owner '${payload.missingContextOwnerAgentId}'.`,
      )
    }

    if (payload.missingContext) {
      return this.buildBlockedDecision(
        fromAgentId,
        payload.missingContextReason
          ? `${MISSING_CONTEXT_REASON}: ${payload.missingContextReason}`
          : MISSING_CONTEXT_REASON,
        true,
      )
    }

    return null
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

  private buildGuardianDecision(fromAgentId: AgentId, reason: string): RoutingDecisionWithMetadata {
    return this.buildApprovalDecision(fromAgentId, GUARDIAN_CHECKPOINT, reason)
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

  private selectProjectManagerOwner(task: RoutingPolicyContext['task']): AgentId {
    if (this.isMethodologyTask(task)) {
      return 'methodology_agent'
    }

    if (this.isIndividualUserTask(task)) {
      return 'user_intelligence_agent'
    }

    if (this.isFinanceTask(task)) {
      return 'analytics_agent'
    }

    if (this.isFunnelTask(task)) {
      return 'funnel_agent'
    }

    if (this.isAdsCreativeTask(task)) {
      return 'ads_creative_agent'
    }

    if (this.isSalesTask(task)) {
      return 'sales_agent'
    }

    if (this.isCoachTask(task)) {
      return 'coach_agent'
    }

    if (this.isMentorTask(task)) {
      return 'mentor_agent'
    }

    if (this.isContentTask(task)) {
      return 'content_agent'
    }

    if (this.isTechTask(task)) {
      return 'tech_ai_agent'
    }

    return 'task_planning'
  }

  private requiresGuardian(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, [
      'запропонуй',
      'recommend',
      'recommendation',
      'рекоменд',
      'заміни',
      'зміни',
      'онови текст',
      'rewrite',
      'user-facing',
      'mentor behavior',
      'ai mentor',
      'next action',
      'наступну дію',
      'копірайт',
      'pricing',
      'cta',
      'тариф',
      'текст',
      'повідомлен',
    ])
  }

  private shouldRouteToFunnel(task: RoutingPolicyContext['task']): boolean {
    return this.isFinanceTask(task) || this.isFunnelTask(task) || this.matchesTask(task, ['канал', 'channel', 'conversion'])
  }

  private shouldRouteToAdsCreative(task: RoutingPolicyContext['task']): boolean {
    return this.isFinanceTask(task) || this.isAdsCreativeTask(task) || this.matchesTask(task, ['ad', 'ads', 'creative', 'креатив', 'оголошен'])
  }

  private isMethodologyTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['methodology', 'методолог', 'ab system', 'ai mentor', 'етап', 'ціль', 'вибір', 'рішення', 'дія'])
  }

  private isFinanceTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['cac', 'ltv', 'roi', 'margin', 'unit economics', 'юніт', 'маржин', 'економік'])
  }

  private isIndividualUserTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['конкретного користувача', 'specific user', 'individual user', 'користувача', 'user profile'])
  }

  private isFunnelTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['funnel', 'воронк', 'onboarding', 'lead magnet', 'конверс'])
  }

  private isAdsCreativeTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['ads', 'ad', 'creative', 'креатив', 'реклама', 'оголошен'])
  }

  private isSalesTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['sales', 'продаж', 'оффер', 'офер', 'запереч'])
  }

  private isCoachTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['coaching', 'coach', 'опір', 'страх', 'вигоран'])
  }

  private isMentorTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['mentor', 'фокус', 'focus', 'subscription', 'доступ', 'zoom'])
  }

  private isContentTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['content', 'контент', 'post', 'reels', 'stories', 'хук'])
  }

  private isTechTask(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['tech', 'ai', 'integration', 'platform', 'runtime'])
  }

  private referencesHistoricalFocusMetric(task: RoutingPolicyContext['task']): boolean {
    return this.matchesTask(task, ['80%', 'повторної покупки', 'historical', 'історич', '2021', '2022', '2023'])
  }

  private matchesTask(task: RoutingPolicyContext['task'], needles: string[]): boolean {
    const haystack = `${task.objective}\n${task.description}`.toLowerCase()
    return needles.some((needle) => haystack.includes(needle.toLowerCase()))
  }
}
