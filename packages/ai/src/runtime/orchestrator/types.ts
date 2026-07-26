export type AgentId =
  | 'project_manager'
  | 'task_planning'
  | 'implementation'
  | 'code_review'
  | 'bug_investigation'
  | 'refactoring'
  | 'release_readiness'
  | 'smoke_test'
  | 'echo_agent'
  | 'summarizer_agent'
  | 'classification_agent'
  | 'extraction_agent'
  | 'planning_agent'
  | 'mentor_agent'
  | 'assistant_agent'
  | 'content_agent'
  | 'sales_agent'
  | 'coach_agent'
  | 'funnel_agent'

export type RoutingDecision =
  | {
      kind: 'execute'
      agentId: AgentId
      reason?: string
    }
  | {
      kind: 'awaiting_approval'
      checkpoint: string
      reason: string
    }
  | {
      kind: 'blocked'
      reason: string
      retryable?: boolean
    }
  | {
      kind: 'complete'
      outcome: 'ready' | 'not_ready' | 'cancelled'
      summary?: string
    }

export interface EngineeringTask {
  id: string
  description: string
  objective: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, unknown>
}

export interface EngineeringArtifact {
  id: string
  type: string
  owner: AgentId
  summary: string
  payload: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface PersistedArtifact extends EngineeringArtifact {
  persistedAt: string
}

export interface ExecutionStateSnapshot {
  task: EngineeringTask
  status: 'initialized' | 'running' | 'awaiting_approval' | 'blocked' | 'failed' | 'completed'
  currentAgentId: AgentId | null
  completedAgentIds: AgentId[]
  artifacts: PersistedArtifact[]
  notes: string[]
  lastUpdatedAt: string
  finalOutcome?: 'ready' | 'not_ready' | 'cancelled'
}

export interface IExecutionState {
  initialize(task: EngineeringTask): Promise<void>
  getSnapshot(): Promise<ExecutionStateSnapshot>
  setCurrentAgent(agentId: AgentId): Promise<void>
  completeAgent(agentId: AgentId): Promise<void>
  recordArtifact(artifact: PersistedArtifact): Promise<void>
  addNote(note: string): Promise<void>
  markAwaitingApproval(checkpoint: string, reason: string): Promise<void>
  markBlocked(reason: string): Promise<void>
  markFailed(reason: string): Promise<void>
  markCompleted(outcome: 'ready' | 'not_ready' | 'cancelled', summary?: string): Promise<void>
}

export interface IRoutingEngine {
  determineFirstAgent(input: {
    task: EngineeringTask
    state: ExecutionStateSnapshot
  }): Promise<RoutingDecision>
  determineNextAgent(input: {
    task: EngineeringTask
    state: ExecutionStateSnapshot
    lastAgentId: AgentId
    artifact: PersistedArtifact
  }): Promise<RoutingDecision>
}

export interface AgentRunInput {
  task: EngineeringTask
  agentId: AgentId
  state: ExecutionStateSnapshot
}

export interface AgentRunResult {
  artifact: EngineeringArtifact
  notes?: string[]
}

export interface IAgentRunner {
  run(input: AgentRunInput): Promise<AgentRunResult>
}

export type {
  ArtifactHandlingResult,
  IArtifactEngine,
} from '../artifact-engine/types.js'

export interface IRuntimeLogger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}

export interface RuntimeOrchestratorOptions {
  maxTransitions?: number
}

export type ExecutionResult =
  | {
      status: 'completed'
      outcome: 'ready' | 'not_ready' | 'cancelled'
      state: ExecutionStateSnapshot
      summary?: string
    }
  | {
      status: 'awaiting_approval'
      checkpoint: string
      reason: string
      state: ExecutionStateSnapshot
    }
  | {
      status: 'blocked'
      reason: string
      retryable: boolean
      state: ExecutionStateSnapshot
      failedAgentId?: AgentId
    }
  | {
      status: 'failed'
      reason: string
      state: ExecutionStateSnapshot
      failedAgentId?: AgentId
      cause?: unknown
    }
