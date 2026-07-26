import type { IArtifactValidator } from './types.js'

export class DefaultArtifactValidator implements IArtifactValidator {
  async validate(input: {
    task: import('../orchestrator/types.js').EngineeringTask
    agentId: import('../orchestrator/types.js').AgentId
    artifact: import('./types.js').RuntimeArtifact
    state: import('../orchestrator/types.js').ExecutionStateSnapshot
  }) {
    if (input.artifact.owner !== input.agentId) {
      return {
        valid: false,
        reason: `Artifact owner '${input.artifact.owner}' does not match active agent '${input.agentId}'.`,
      }
    }

    if (!input.artifact.summary.trim()) {
      return {
        valid: false,
        reason: 'Artifact summary is required.',
      }
    }

    if (input.artifact.metadata.ownerAgentId !== input.agentId) {
      return {
        valid: false,
        reason: `Artifact metadata owner '${input.artifact.metadata.ownerAgentId}' does not match active agent '${input.agentId}'.`,
      }
    }

    if (input.artifact.metadata.taskId !== input.task.id) {
      return {
        valid: false,
        reason: `Artifact metadata taskId '${input.artifact.metadata.taskId}' does not match active task '${input.task.id}'.`,
      }
    }

    if (!input.artifact.metadata.handoffReady) {
      return {
        valid: false,
        reason: 'Artifact is not marked handoff-ready.',
        retryable: true,
      }
    }

    return { valid: true }
  }
}
