import { describe, expect, it, vi } from 'vitest'

import { ArtifactEngine } from './artifactEngine.js'
import { DefaultArtifactFactory } from './artifactFactory.js'
import { InMemoryArtifactStore } from './artifactStore.js'
import { DefaultArtifactValidator } from './artifactValidator.js'
import { ArtifactStoreError } from './errors.js'
import type { EngineeringArtifact, EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../orchestrator/types.js'
import type { IArtifactStore } from './types.js'

const task: EngineeringTask = {
  id: 'task-1',
  description: 'Persist artifact',
  objective: 'Create handoff-ready artifact',
}

const state: ExecutionStateSnapshot = {
  task,
  status: 'running',
  currentAgentId: 'task_planning',
  completedAgentIds: ['project_manager'],
  artifacts: [],
  notes: [],
  lastUpdatedAt: new Date(0).toISOString(),
}

const artifact: EngineeringArtifact = {
  id: 'artifact-1',
  type: 'planning_artifact',
  owner: 'task_planning',
  summary: 'Implementation plan',
  payload: { steps: ['a', 'b'] },
}

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('ArtifactEngine', () => {
  it('creates, validates and stores a runtime artifact', async () => {
    const engine = new ArtifactEngine({
      factory: new DefaultArtifactFactory(),
      validator: new DefaultArtifactValidator(),
      store: new InMemoryArtifactStore(),
      logger,
    })

    const result = await engine.validateAndStore({
      task,
      agentId: 'task_planning',
      artifact,
      state,
    })

    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') {
      throw new Error('Expected accepted result')
    }
    expect(result.artifact.metadata.kind).toBe('plan')
    expect(result.artifact.metadata.version.schemaVersion).toBe('1.0.0')
    expect(result.artifact.metadata.ownerAgentId).toBe('task_planning')
  })

  it('rejects invalid artifacts before persistence', async () => {
    const engine = new ArtifactEngine({
      factory: new DefaultArtifactFactory(),
      validator: new DefaultArtifactValidator(),
      store: new InMemoryArtifactStore(),
      logger,
    })

    const result = await engine.validateAndStore({
      task,
      agentId: 'task_planning',
      artifact: {
        ...artifact,
        summary: '',
      },
      state,
    })

    expect(result).toEqual({
      kind: 'rejected',
      reason: 'Artifact summary is required.',
      retryable: false,
    })
  })

  it('retrieves persisted artifacts by id and task id', async () => {
    const engine = new ArtifactEngine({
      factory: new DefaultArtifactFactory(),
      validator: new DefaultArtifactValidator(),
      store: new InMemoryArtifactStore(),
      logger,
    })

    const persisted = await engine.validateAndStore({
      task,
      agentId: 'task_planning',
      artifact,
      state,
    })

    if (persisted.kind !== 'accepted') {
      throw new Error('Expected accepted result')
    }

    const byId = await engine.getArtifactById('artifact-1')
    const byTaskId = await engine.listArtifactsByTaskId(task.id)

    expect(byId?.id).toBe('artifact-1')
    expect(byTaskId).toHaveLength(1)
  })

  it('wraps store failures as ArtifactStoreError', async () => {
    const store: IArtifactStore = {
      save: vi.fn(async () => {
        throw new Error('disk unavailable')
      }),
      getById: vi.fn(),
      listByTaskId: vi.fn(),
    }

    const engine = new ArtifactEngine({
      factory: new DefaultArtifactFactory(),
      validator: new DefaultArtifactValidator(),
      store,
      logger,
    })

    await expect(
      engine.validateAndStore({
        task,
        agentId: 'task_planning',
        artifact,
        state,
      }),
    ).rejects.toBeInstanceOf(ArtifactStoreError)
  })
})
