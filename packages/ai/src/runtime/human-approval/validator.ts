import type { IApprovalValidator } from './types.js'

export class ApprovalValidator implements IApprovalValidator {
  async validateRequest(input: {
    request: import('./types.js').ApprovalRequest
    state: import('../orchestrator/types.js').ExecutionStateSnapshot
    artifact?: import('../artifact-engine/types.js').StoredRuntimeArtifact
  }) {
    if (!input.request.id.trim()) {
      return { valid: false, reason: 'Approval request id is required.' }
    }

    if (!input.request.taskId.trim()) {
      return { valid: false, reason: 'Approval request taskId is required.' }
    }

    if (input.request.taskId !== input.state.task.id) {
      return { valid: false, reason: 'Approval request taskId does not match execution state.' }
    }

    if (input.request.status !== 'pending') {
      return { valid: false, reason: 'New approval request must start in pending state.' }
    }

    if (!input.request.metadata.checkpoint.trim()) {
      return { valid: false, reason: 'Approval request checkpoint is required.' }
    }

    if (!input.request.metadata.reason.trim()) {
      return { valid: false, reason: 'Approval request reason is required.' }
    }

    if (input.artifact && input.request.artifactId !== input.artifact.id) {
      return { valid: false, reason: 'Approval request artifactId does not match provided artifact.' }
    }

    return { valid: true }
  }

  async validateDecision(input: {
    request: import('./types.js').ApprovalRequest
    decision: import('./types.js').ApprovalDecision
  }) {
    if (input.request.status !== 'pending') {
      return { valid: false, reason: 'Approval decisions may only be recorded for pending requests.' }
    }

    if (input.request.taskId !== input.decision.taskId) {
      return { valid: false, reason: 'Approval decision taskId does not match the request.' }
    }

    if (input.request.id !== input.decision.requestId) {
      return { valid: false, reason: 'Approval decision requestId does not match the request.' }
    }

    if (!input.decision.decidedBy.trim()) {
      return { valid: false, reason: 'Approval decision decidedBy is required.' }
    }

    if (input.decision.decision === 'approve' && !input.decision.resumeAuthorized) {
      return { valid: false, reason: 'Approved decisions must authorize resumption.' }
    }

    if (input.decision.decision !== 'approve' && input.decision.resumeAuthorized) {
      return { valid: false, reason: 'Rejected or cancelled decisions must not authorize resumption.' }
    }

    return { valid: true }
  }
}
