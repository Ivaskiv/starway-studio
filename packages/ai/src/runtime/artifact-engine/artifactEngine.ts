import { ArtifactStoreError } from './errors.js'
import type {
  ArtifactEngineDependencies,
  ArtifactHandlingResult,
  IArtifactEngine,
} from './types.js'
import type { IRuntimeLogger } from '../orchestrator/types.js'

const DEFAULT_SCHEMA_VERSION = '1.0.0'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class ArtifactEngine implements IArtifactEngine {
  private readonly logger: IRuntimeLogger
  private readonly schemaVersion: string

  constructor(private readonly deps: ArtifactEngineDependencies) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
    this.schemaVersion = deps.schemaVersion ?? DEFAULT_SCHEMA_VERSION
  }

  async validateAndStore(input: {
    task: import('../orchestrator/types.js').EngineeringTask
    agentId: import('../orchestrator/types.js').AgentId
    artifact: import('../orchestrator/types.js').EngineeringArtifact
    state: import('../orchestrator/types.js').ExecutionStateSnapshot
  }): Promise<ArtifactHandlingResult> {
    const runtimeArtifact = await this.deps.factory.create(input)

    const validation = await this.deps.validator.validate({
      task: input.task,
      agentId: input.agentId,
      artifact: runtimeArtifact,
      state: input.state,
    })

    if (!validation.valid) {
      this.logger.warn('artifact_engine.artifact_rejected', {
        taskId: input.task.id,
        agentId: input.agentId,
        artifactId: runtimeArtifact.id,
        reason: validation.reason,
      })
      return {
        kind: 'rejected',
        reason: validation.reason ?? 'Artifact validation failed.',
        retryable: validation.retryable ?? false,
      }
    }

    try {
      const persistedArtifact = await this.deps.store.save({
        artifact: runtimeArtifact,
        version: {
          schemaVersion: this.schemaVersion,
          artifactVersion: 1,
        },
      })

      this.logger.info('artifact_engine.artifact_persisted', {
        taskId: input.task.id,
        agentId: input.agentId,
        artifactId: persistedArtifact.id,
        kind: persistedArtifact.metadata.kind,
      })

      return {
        kind: 'accepted',
        artifact: persistedArtifact,
      }
    } catch (cause) {
      this.logger.error('artifact_engine.store_failed', {
        taskId: input.task.id,
        agentId: input.agentId,
        artifactId: runtimeArtifact.id,
        error: toErrorContext(cause),
      })
      throw new ArtifactStoreError('Artifact Engine failed to persist the runtime artifact.', cause)
    }
  }

  async getArtifactById(id: string) {
    return this.deps.store.getById(id)
  }

  async listArtifactsByTaskId(taskId: string) {
    return this.deps.store.listByTaskId(taskId)
  }
}

function toErrorContext(cause: unknown): Record<string, unknown> {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
    }
  }

  return { cause }
}
