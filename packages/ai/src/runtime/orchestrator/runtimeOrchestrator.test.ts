import { describe, expect, it, vi } from 'vitest'

import { ArtifactRejectedSignal, RuntimeOrchestrator } from './runtimeOrchestrator.js'
import type { StoredRuntimeArtifact } from '../artifact-engine/types.js'
import type {
  AgentRunInput,
  AgentRunResult,
  EngineeringArtifact,
  EngineeringTask,
  ExecutionStateSnapshot,
  IAgentRunner,
  IArtifactEngine,
  IExecutionState,
  IRuntimeLogger,
  IRoutingEngine,
  PersistedArtifact,
  RoutingDecision,
} from './types.js'

const task: EngineeringTask = {
  id: 'task-1',
  description: 'Implement orchestrator runtime',
  objective: 'Coordinate runtime execution safely',
}

class InMemoryExecutionState implements IExecutionState {
  private snapshot: ExecutionStateSnapshot = {
    task,
    status: 'initialized',
    currentAgentId: null,
    completedAgentIds: [],
    artifacts: [],
    notes: [],
    lastUpdatedAt: new Date(0).toISOString(),
  }

  async initialize(nextTask: EngineeringTask): Promise<void> {
    this.snapshot = {
      task: nextTask,
      status: 'initialized',
      currentAgentId: null,
      completedAgentIds: [],
      artifacts: [],
      notes: [],
      lastUpdatedAt: new Date(0).toISOString(),
    }
  }

  async getSnapshot(): Promise<ExecutionStateSnapshot> {
    return structuredClone(this.snapshot)
  }

  async setCurrentAgent(agentId: ExecutionStateSnapshot['currentAgentId']): Promise<void> {
    this.snapshot.currentAgentId = agentId
    this.snapshot.status = 'running'
  }

  async completeAgent(agentId: NonNullable<ExecutionStateSnapshot['currentAgentId']>): Promise<void> {
    this.snapshot.completedAgentIds.push(agentId)
  }

  async recordArtifact(artifact: PersistedArtifact): Promise<void> {
    this.snapshot.artifacts.push(artifact)
  }

  async addNote(note: string): Promise<void> {
    this.snapshot.notes.push(note)
  }

  async markAwaitingApproval(_checkpoint: string, reason: string): Promise<void> {
    this.snapshot.status = 'awaiting_approval'
    this.snapshot.notes.push(reason)
  }

  async markBlocked(reason: string): Promise<void> {
    this.snapshot.status = 'blocked'
    this.snapshot.notes.push(reason)
  }

  async markFailed(reason: string): Promise<void> {
    this.snapshot.status = 'failed'
    this.snapshot.notes.push(reason)
  }

  async markCompleted(outcome: 'ready' | 'not_ready' | 'cancelled', summary?: string): Promise<void> {
    this.snapshot.status = 'completed'
    this.snapshot.finalOutcome = outcome
    if (summary) {
      this.snapshot.notes.push(summary)
    }
  }
}

class StubRoutingEngine implements IRoutingEngine {
  constructor(
    private readonly firstDecision: RoutingDecision,
    private readonly nextDecisions: RoutingDecision[],
  ) {}

  async determineFirstAgent(): Promise<RoutingDecision> {
    return this.firstDecision
  }

  async determineNextAgent(): Promise<RoutingDecision> {
    const next = this.nextDecisions.shift()
    if (!next) {
      throw new Error('No next decision configured')
    }
    return next
  }
}

class StubAgentRunner implements IAgentRunner {
  constructor(private readonly results: Array<AgentRunResult | Error>) {}

  async run(_input: AgentRunInput): Promise<AgentRunResult> {
    const next = this.results.shift()
    if (!next) {
      throw new Error('No run result configured')
    }
    if (next instanceof Error) {
      throw next
    }
    return next
  }
}

class StubArtifactEngine implements IArtifactEngine {
  constructor(private readonly results: Array<StoredRuntimeArtifact | ArtifactRejectedSignal>) {}

  async validateAndStore() {
    const next = this.results.shift()
    if (!next) {
      throw new Error('No artifact result configured')
    }
    if (next instanceof ArtifactRejectedSignal) {
      return {
        kind: 'rejected' as const,
        reason: next.message,
        retryable: next.retryable,
      }
    }
    return {
      kind: 'accepted' as const,
      artifact: next,
    }
  }

  async getArtifactById(id: string): Promise<StoredRuntimeArtifact | null> {
    return this.getStoredArtifacts().find((artifact) => artifact.id === id) ?? null
  }

  async listArtifactsByTaskId(taskId: string): Promise<StoredRuntimeArtifact[]> {
    return this.getStoredArtifacts().filter((artifact) => artifact.metadata.taskId === taskId)
  }

  private getStoredArtifacts(): StoredRuntimeArtifact[] {
    return this.results.filter(
      (artifact): artifact is StoredRuntimeArtifact => !(artifact instanceof ArtifactRejectedSignal),
    )
  }
}

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function makeArtifact(id: string, owner: EngineeringArtifact['owner']): EngineeringArtifact {
  return {
    id,
    type: `${owner}_artifact`,
    owner,
    summary: `${owner} summary`,
    payload: {},
  }
}

function makePersistedArtifact(id: string, owner: EngineeringArtifact['owner']): StoredRuntimeArtifact {
  return {
    ...makeArtifact(id, owner),
    persistedAt: new Date(0).toISOString(),
    metadata: {
      kind: owner === 'task_planning' ? 'plan' : owner === 'implementation' ? 'implementation' : 'generic',
      ownerAgentId: owner,
      taskId: task.id,
      stateStatus: 'running',
      handoffReady: true,
      createdAt: new Date(0).toISOString(),
      version: {
        schemaVersion: '1.0.0',
        artifactVersion: 1,
      },
    },
  }
}

describe('RuntimeOrchestrator', () => {
  it('executes sequential agents until the routing engine completes the task', async () => {
    const orchestrator = new RuntimeOrchestrator({
      executionState: new InMemoryExecutionState(),
      routingEngine: new StubRoutingEngine(
        { kind: 'execute', agentId: 'task_planning' },
        [
          { kind: 'execute', agentId: 'implementation' },
          { kind: 'complete', outcome: 'ready', summary: 'release approved' },
        ],
      ),
      agentRunner: new StubAgentRunner([
        { artifact: makeArtifact('artifact-1', 'task_planning'), notes: ['plan complete'] },
        { artifact: makeArtifact('artifact-2', 'implementation') },
      ]),
      artifactEngine: new StubArtifactEngine([
        makePersistedArtifact('artifact-1', 'task_planning'),
        makePersistedArtifact('artifact-2', 'implementation'),
      ]),
      logger,
    })

    const result = await orchestrator.execute(task)

    expect(result.status).toBe('completed')
    if (result.status !== 'completed') {
      throw new Error('Expected completed result')
    }
    expect(result.outcome).toBe('ready')
    expect(result.state.completedAgentIds).toEqual(['task_planning', 'implementation'])
    expect(result.state.artifacts).toHaveLength(2)
  })

  it('pauses when routing requires human approval', async () => {
    const orchestrator = new RuntimeOrchestrator({
      executionState: new InMemoryExecutionState(),
      routingEngine: new StubRoutingEngine(
        { kind: 'execute', agentId: 'task_planning' },
        [{ kind: 'awaiting_approval', checkpoint: 'implementation_approval', reason: 'High risk change' }],
      ),
      agentRunner: new StubAgentRunner([{ artifact: makeArtifact('artifact-1', 'task_planning') }]),
      artifactEngine: new StubArtifactEngine([makePersistedArtifact('artifact-1', 'task_planning')]),
      logger,
    })

    const result = await orchestrator.execute(task)

    expect(result.status).toBe('awaiting_approval')
    if (result.status !== 'awaiting_approval') {
      throw new Error('Expected awaiting approval result')
    }
    expect(result.checkpoint).toBe('implementation_approval')
  })

  it('blocks the task when the artifact engine rejects an artifact', async () => {
    const orchestrator = new RuntimeOrchestrator({
      executionState: new InMemoryExecutionState(),
      routingEngine: new StubRoutingEngine({ kind: 'execute', agentId: 'task_planning' }, []),
      agentRunner: new StubAgentRunner([{ artifact: makeArtifact('artifact-1', 'task_planning') }]),
      artifactEngine: new StubArtifactEngine([
        new ArtifactRejectedSignal('Artifact is incomplete', true, 'task_planning'),
      ]),
      logger,
    })

    const result = await orchestrator.execute(task)

    expect(result.status).toBe('blocked')
    if (result.status !== 'blocked') {
      throw new Error('Expected blocked result')
    }
    expect(result.reason).toBe('Artifact is incomplete')
    expect(result.retryable).toBe(true)
    expect(result.failedAgentId).toBe('task_planning')
  })

  it('fails when the agent runner throws an execution error', async () => {
    const orchestrator = new RuntimeOrchestrator({
      executionState: new InMemoryExecutionState(),
      routingEngine: new StubRoutingEngine({ kind: 'execute', agentId: 'task_planning' }, []),
      agentRunner: new StubAgentRunner([new Error('Runner exploded')]),
      artifactEngine: new StubArtifactEngine([]),
      logger,
    })

    const result = await orchestrator.execute(task)

    expect(result.status).toBe('failed')
    if (result.status !== 'failed') {
      throw new Error('Expected failed result')
    }
    expect(result.reason).toBe("Agent 'task_planning' execution failed.")
    expect(result.failedAgentId).toBe('task_planning')
  })

  it('fails safely when the routing engine does not return an initial decision', async () => {
    const routingEngine: IRoutingEngine = {
      determineFirstAgent: vi.fn(async () => undefined as unknown as RoutingDecision),
      determineNextAgent: vi.fn(),
    }

    const orchestrator = new RuntimeOrchestrator({
      executionState: new InMemoryExecutionState(),
      routingEngine,
      agentRunner: new StubAgentRunner([]),
      artifactEngine: new StubArtifactEngine([]),
      logger,
    })

    const result = await orchestrator.execute(task)

    expect(result.status).toBe('failed')
    if (result.status !== 'failed') {
      throw new Error('Expected failed result')
    }
    expect(result.reason).toBe('Routing engine returned no first routing decision.')
  })

  it('fails safely when the routing engine returns no next decision', async () => {
    const routingEngine: IRoutingEngine = {
      determineFirstAgent: vi.fn(async () => ({ kind: 'execute' as const, agentId: 'task_planning' as const })),
      determineNextAgent: vi.fn(async () => undefined as unknown as RoutingDecision),
    }

    const orchestrator = new RuntimeOrchestrator({
      executionState: new InMemoryExecutionState(),
      routingEngine,
      agentRunner: new StubAgentRunner([{ artifact: makeArtifact('artifact-1', 'task_planning') }]),
      artifactEngine: new StubArtifactEngine([makePersistedArtifact('artifact-1', 'task_planning')]),
      logger,
    })

    const result = await orchestrator.execute(task)

    expect(result.status).toBe('failed')
    if (result.status !== 'failed') {
      throw new Error('Expected failed result')
    }
    expect(result.reason).toBe('Routing engine returned no next routing decision.')
  })
})
