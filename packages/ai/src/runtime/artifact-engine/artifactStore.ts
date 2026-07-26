import type { ArtifactVersion, IArtifactStore, RuntimeArtifact, StoredRuntimeArtifact } from './types.js'

export class InMemoryArtifactStore implements IArtifactStore {
  private readonly records = new Map<string, StoredRuntimeArtifact>()

  async save(input: {
    artifact: RuntimeArtifact
    version: ArtifactVersion
  }): Promise<StoredRuntimeArtifact> {
    const storedArtifact: StoredRuntimeArtifact = {
      ...input.artifact,
      persistedAt: new Date().toISOString(),
      metadata: {
        ...input.artifact.metadata,
        version: input.version,
      },
    }

    this.records.set(storedArtifact.id, storedArtifact)
    return storedArtifact
  }

  async getById(id: string): Promise<StoredRuntimeArtifact | null> {
    return this.records.get(id) ?? null
  }

  async listByTaskId(taskId: string): Promise<StoredRuntimeArtifact[]> {
    return [...this.records.values()].filter((artifact) => artifact.metadata.taskId === taskId)
  }
}
