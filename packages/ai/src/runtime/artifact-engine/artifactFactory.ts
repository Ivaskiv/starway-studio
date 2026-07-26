import type { ArtifactFactoryInput, ArtifactKind, IArtifactFactory, RuntimeArtifact } from './types.js'

export class DefaultArtifactFactory implements IArtifactFactory {
  async create(input: ArtifactFactoryInput): Promise<RuntimeArtifact> {
    return {
      ...input.artifact,
      metadata: {
        ...(input.artifact.metadata ?? {}),
        kind: inferArtifactKind(input.agentId),
        ownerAgentId: input.agentId,
        taskId: input.task.id,
        stateStatus: input.state.status,
        handoffReady: true,
        createdAt: new Date().toISOString(),
      },
    }
  }
}

function inferArtifactKind(agentId: ArtifactFactoryInput['agentId']): ArtifactKind {
  switch (agentId) {
    case 'task_planning':
      return 'plan'
    case 'implementation':
      return 'implementation'
    case 'code_review':
      return 'review'
    case 'bug_investigation':
      return 'investigation'
    case 'refactoring':
      return 'refactoring'
    case 'release_readiness':
      return 'release'
    default:
      return 'generic'
  }
}
