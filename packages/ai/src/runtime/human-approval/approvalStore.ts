import { ApprovalStateError } from './errors.js'
import type { ApprovalDecision, ApprovalRequest, ApprovalStatus, IApprovalStore } from './types.js'

export class InMemoryApprovalStore implements IApprovalStore {
  private readonly requests = new Map<string, ApprovalRequest>()
  private readonly decisions = new Map<string, ApprovalDecision>()

  async saveRequest(request: ApprovalRequest): Promise<void> {
    this.requests.set(request.id, structuredClone(request))
  }

  async getRequestById(requestId: string): Promise<ApprovalRequest | null> {
    const request = this.requests.get(requestId)
    return request ? structuredClone(request) : null
  }

  async listRequestsByTaskId(taskId: string): Promise<ApprovalRequest[]> {
    return Array.from(this.requests.values())
      .filter((request) => request.taskId === taskId)
      .map((request) => structuredClone(request))
  }

  async saveDecision(decision: ApprovalDecision): Promise<void> {
    this.decisions.set(decision.requestId, structuredClone(decision))
  }

  async getDecisionByRequestId(requestId: string): Promise<ApprovalDecision | null> {
    const decision = this.decisions.get(requestId)
    return decision ? structuredClone(decision) : null
  }

  async updateRequestStatus(requestId: string, status: ApprovalStatus): Promise<void> {
    const request = this.requests.get(requestId)
    if (!request) {
      throw new ApprovalStateError(`Approval request '${requestId}' was not found.`)
    }
    this.requests.set(requestId, {
      ...request,
      status,
    })
  }
}
