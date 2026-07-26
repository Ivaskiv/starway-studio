import type { IRuntimeLogger } from '../orchestrator/types.js'
import { ApprovalStateError, ApprovalTimeoutError, ApprovalValidationError } from './errors.js'
import type {
  ApprovalDecision,
  ApprovalManagerDependencies,
  ApprovalRequest,
  ApprovalResolution,
  ApprovalStatus,
  IHumanApproval,
} from './types.js'

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
const DEFAULT_POLL_INTERVAL_MS = 250

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class ApprovalManager implements IHumanApproval {
  private readonly logger: IRuntimeLogger
  private readonly now: () => Date
  private readonly sleep: (ms: number) => Promise<void>
  private readonly defaultTimeoutMs: number
  private readonly defaultPollIntervalMs: number

  constructor(private readonly deps: ApprovalManagerDependencies) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
    this.now = deps.now ?? (() => new Date())
    this.sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.defaultTimeoutMs = deps.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS
    this.defaultPollIntervalMs = deps.defaultPollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  }

  async pauseExecution(input: import('./types.js').CreateApprovalRequestInput): Promise<ApprovalRequest> {
    const requestedAt = this.now()
    const timeoutMs = input.timeoutMs ?? this.defaultTimeoutMs
    const timeoutAt = timeoutMs > 0 ? new Date(requestedAt.getTime() + timeoutMs).toISOString() : undefined
    const request: ApprovalRequest = {
      id: input.requestId ?? `${input.taskId}:${input.checkpoint}`,
      taskId: input.taskId,
      stateStatus: input.state.status,
      artifactId: input.artifact?.id,
      artifactType: input.artifact?.type,
      artifactOwner: input.artifact?.owner,
      status: 'pending',
      metadata: {
        checkpoint: input.checkpoint,
        requestedAt: requestedAt.toISOString(),
        requestedByAgentId: input.requestedByAgentId,
        reason: input.reason,
        timeoutAt,
        pausedExecution: true,
        ...input.metadata,
      },
    }

    const validation = await this.deps.validator.validateRequest({
      request,
      state: input.state,
      artifact: input.artifact,
    })

    if (!validation.valid) {
      throw new ApprovalValidationError(validation.reason ?? 'Approval request validation failed.')
    }

    await this.deps.store.saveRequest(request)
    this.logger.info('human_approval.request_paused', {
      taskId: input.taskId,
      requestId: request.id,
      checkpoint: input.checkpoint,
    })
    return request
  }

  async waitForDecision(input: import('./types.js').WaitForDecisionInput): Promise<ApprovalResolution> {
    const timeoutMs = input.timeoutMs ?? this.defaultTimeoutMs
    const pollIntervalMs = input.pollIntervalMs ?? this.defaultPollIntervalMs
    const deadline = this.now().getTime() + timeoutMs

    while (true) {
      const request = await this.getRequiredRequest(input.requestId)
      if (request.taskId !== input.taskId) {
        throw new ApprovalStateError(`Approval request '${request.id}' does not belong to task '${input.taskId}'.`)
      }

      const decision = await this.deps.store.getDecisionByRequestId(input.requestId)
      if (decision) {
        this.logger.info('human_approval.decision_received', {
          taskId: input.taskId,
          requestId: input.requestId,
          decision: decision.decision,
        })
        return this.buildResolution(request, decision)
      }

      if (request.status === 'timed_out') {
        return this.buildResolution(request)
      }

      const timedOutByNow =
        (request.metadata.timeoutAt ? this.now().getTime() >= new Date(request.metadata.timeoutAt).getTime() : false) ||
        this.now().getTime() >= deadline
      if (timedOutByNow) {
        await this.deps.store.updateRequestStatus(request.id, 'timed_out')
        const timedOutRequest = await this.getRequiredRequest(request.id)
        this.logger.warn('human_approval.request_timed_out', {
          taskId: input.taskId,
          requestId: input.requestId,
        })
        return this.buildResolution(timedOutRequest)
      }

      await this.sleep(pollIntervalMs)
    }
  }

  async approve(input: Omit<import('./types.js').RecordApprovalDecisionInput, 'decision'>): Promise<ApprovalResolution> {
    return this.recordDecision({
      ...input,
      decision: 'approve',
    })
  }

  async reject(input: Omit<import('./types.js').RecordApprovalDecisionInput, 'decision'>): Promise<ApprovalResolution> {
    return this.recordDecision({
      ...input,
      decision: 'reject',
    })
  }

  async cancelExecution(
    input: Omit<import('./types.js').RecordApprovalDecisionInput, 'decision'>,
  ): Promise<ApprovalResolution> {
    return this.recordDecision({
      ...input,
      decision: 'cancel',
    })
  }

  async getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
    return this.deps.store.getRequestById(requestId)
  }

  private async recordDecision(
    input: import('./types.js').RecordApprovalDecisionInput,
  ): Promise<ApprovalResolution> {
    const request = await this.getRequiredRequest(input.requestId)
    if (request.taskId !== input.taskId) {
      throw new ApprovalStateError(`Approval request '${request.id}' does not belong to task '${input.taskId}'.`)
    }

    const decision: ApprovalDecision = {
      requestId: input.requestId,
      taskId: input.taskId,
      decision: input.decision,
      decidedAt: this.now().toISOString(),
      decidedBy: input.decidedBy,
      reason: input.reason,
      resumeAuthorized: input.decision === 'approve',
      metadata: input.metadata,
    }

    const validation = await this.deps.validator.validateDecision({
      request,
      decision,
    })

    if (!validation.valid) {
      throw new ApprovalValidationError(validation.reason ?? 'Approval decision validation failed.')
    }

    await this.deps.store.saveDecision(decision)
    const nextStatus = mapDecisionToStatus(input.decision)
    await this.deps.store.updateRequestStatus(request.id, nextStatus)
    const updatedRequest = await this.getRequiredRequest(request.id)

    this.logger.info('human_approval.decision_recorded', {
      taskId: input.taskId,
      requestId: input.requestId,
      decision: input.decision,
      decidedBy: input.decidedBy,
    })

    return this.buildResolution(updatedRequest, decision)
  }

  private async getRequiredRequest(requestId: string): Promise<ApprovalRequest> {
    const request = await this.deps.store.getRequestById(requestId)
    if (!request) {
      throw new ApprovalStateError(`Approval request '${requestId}' was not found.`)
    }
    return request
  }

  private buildResolution(request: ApprovalRequest, decision?: ApprovalDecision): ApprovalResolution {
    return {
      request,
      decision,
      status: request.status,
      resumeAuthorized: decision?.resumeAuthorized ?? false,
      timedOut: request.status === 'timed_out',
    }
  }
}

function mapDecisionToStatus(decision: ApprovalDecision['decision']): ApprovalStatus {
  switch (decision) {
    case 'approve':
      return 'approved'
    case 'reject':
      return 'rejected'
    case 'cancel':
      return 'cancelled'
    default:
      throw new ApprovalTimeoutError(`Unsupported approval decision '${String(decision)}'.`)
  }
}
