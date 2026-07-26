import type { AgentId, ExecutionStateSnapshot, IRuntimeLogger } from '../orchestrator/types.js'
import type { StoredRuntimeArtifact } from '../artifact-engine/types.js'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'timed_out'

export type ApprovalDecisionKind = 'approve' | 'reject' | 'cancel'

export interface ApprovalRequestMetadata {
  checkpoint: string
  requestedAt: string
  requestedByAgentId?: AgentId
  reason: string
  timeoutAt?: string
  pausedExecution: boolean
}

export interface ApprovalRequest {
  id: string
  taskId: string
  stateStatus: ExecutionStateSnapshot['status']
  artifactId?: string
  artifactType?: string
  artifactOwner?: AgentId
  status: ApprovalStatus
  metadata: ApprovalRequestMetadata & Record<string, unknown>
}

export interface ApprovalDecision {
  requestId: string
  taskId: string
  decision: ApprovalDecisionKind
  decidedAt: string
  decidedBy: string
  reason?: string
  resumeAuthorized: boolean
  metadata?: Record<string, unknown>
}

export interface ApprovalResolution {
  request: ApprovalRequest
  decision?: ApprovalDecision
  status: ApprovalStatus
  resumeAuthorized: boolean
  timedOut: boolean
}

export interface CreateApprovalRequestInput {
  taskId: string
  state: ExecutionStateSnapshot
  checkpoint: string
  reason: string
  artifact?: StoredRuntimeArtifact
  requestedByAgentId?: AgentId
  timeoutMs?: number
  requestId?: string
  metadata?: Record<string, unknown>
}

export interface RecordApprovalDecisionInput {
  requestId: string
  taskId: string
  decision: ApprovalDecisionKind
  decidedBy: string
  reason?: string
  metadata?: Record<string, unknown>
}

export interface WaitForDecisionInput {
  requestId: string
  taskId: string
  timeoutMs?: number
  pollIntervalMs?: number
}

export interface ApprovalValidationResult {
  valid: boolean
  reason?: string
}

export interface IApprovalStore {
  saveRequest(request: ApprovalRequest): Promise<void>
  getRequestById(requestId: string): Promise<ApprovalRequest | null>
  listRequestsByTaskId(taskId: string): Promise<ApprovalRequest[]>
  saveDecision(decision: ApprovalDecision): Promise<void>
  getDecisionByRequestId(requestId: string): Promise<ApprovalDecision | null>
  updateRequestStatus(requestId: string, status: ApprovalStatus): Promise<void>
}

export interface IApprovalValidator {
  validateRequest(input: {
    request: ApprovalRequest
    state: ExecutionStateSnapshot
    artifact?: StoredRuntimeArtifact
  }): Promise<ApprovalValidationResult>
  validateDecision(input: {
    request: ApprovalRequest
    decision: ApprovalDecision
  }): Promise<ApprovalValidationResult>
}

export interface IHumanApproval {
  pauseExecution(input: CreateApprovalRequestInput): Promise<ApprovalRequest>
  waitForDecision(input: WaitForDecisionInput): Promise<ApprovalResolution>
  approve(input: Omit<RecordApprovalDecisionInput, 'decision'>): Promise<ApprovalResolution>
  reject(input: Omit<RecordApprovalDecisionInput, 'decision'>): Promise<ApprovalResolution>
  cancelExecution(input: Omit<RecordApprovalDecisionInput, 'decision'>): Promise<ApprovalResolution>
  getApprovalRequest(requestId: string): Promise<ApprovalRequest | null>
}

export interface ApprovalManagerDependencies {
  store: IApprovalStore
  validator: IApprovalValidator
  logger?: IRuntimeLogger
  now?: () => Date
  sleep?: (ms: number) => Promise<void>
  defaultTimeoutMs?: number
  defaultPollIntervalMs?: number
}
