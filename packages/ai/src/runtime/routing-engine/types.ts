import type {
  AgentId,
  ExecutionStateSnapshot,
  IRoutingEngine,
  IRuntimeLogger,
  PersistedArtifact,
  RoutingDecision,
} from '../orchestrator/types.js'

export type { IRoutingEngine }

export type RoutingTerminalState = 'completed' | 'blocked' | 'failed' | 'awaiting_approval'

export type RoutingTrigger =
  | 'task_initialized'
  | 'artifact_validated'
  | 'artifact_routing_directive'
  | 'approval_required'
  | 'terminal_verdict'
  | 'fallback_policy'

export interface RoutingTransitionMetadata {
  transitionKey: string
  stage: 'first' | 'next'
  trigger: RoutingTrigger
  fromAgentId?: AgentId | 'human'
  toAgentId?: AgentId | 'human'
  terminalState?: RoutingTerminalState
  reason?: string
}

export type RoutingDecisionWithMetadata = RoutingDecision & {
  transition: RoutingTransitionMetadata
}

export interface RoutingPolicyContext {
  task: import('../orchestrator/types.js').EngineeringTask
  state: ExecutionStateSnapshot
  lastAgentId?: AgentId
  artifact?: PersistedArtifact
}

export interface TransitionValidationContext {
  state: ExecutionStateSnapshot
  decision: RoutingDecision
  stage: 'first' | 'next'
  lastAgentId?: AgentId
}

export interface TransitionValidationResult {
  valid: boolean
  reason?: string
}

export interface RoutingDirective {
  kind: RoutingDecision['kind']
  agentId?: AgentId
  reason?: string
  checkpoint?: string
  retryable?: boolean
  outcome?: 'ready' | 'not_ready' | 'cancelled'
  summary?: string
}

export interface RoutingPolicyOptions {
  firstAgentId?: AgentId
  fallbackReviewAgentId?: AgentId
  fallbackImplementationAgentId?: AgentId
  fallbackRefactoringAgentId?: AgentId
  fallbackReleaseAgentId?: AgentId
}

export interface TransitionValidatorOptions {
  allowedInitialAgentIds?: AgentId[]
  correctiveAgentIdsFromRelease?: AgentId[]
}

export interface IRoutingPolicy {
  determineFirstDecision(context: RoutingPolicyContext): Promise<RoutingDecisionWithMetadata>
  determineNextDecision(context: RoutingPolicyContext & { lastAgentId: AgentId; artifact: PersistedArtifact }): Promise<RoutingDecisionWithMetadata>
}

export interface ITransitionValidator {
  validate(context: TransitionValidationContext): Promise<TransitionValidationResult>
}

export interface RoutingEngineDependencies {
  policy: IRoutingPolicy
  validator: ITransitionValidator
  logger?: IRuntimeLogger
}
