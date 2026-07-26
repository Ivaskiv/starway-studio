import { describe, expect, it, vi } from 'vitest'

import type { AgentId, EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger, PersistedArtifact } from '../orchestrator/types.js'
import { RoutingEngine } from './routingEngine.js'
import { RoutingPolicy } from './routingPolicy.js'
import { TransitionValidationError } from './errors.js'
import { TransitionValidator } from './transitionValidator.js'

const task: EngineeringTask = {
  id: 'task-routing-1',
  description: 'Route runtime execution',
  objective: 'Validate deterministic runtime routing',
}

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function makeState(overrides: Partial<ExecutionStateSnapshot> = {}): ExecutionStateSnapshot {
  return {
    task,
    status: 'initialized',
    currentAgentId: null,
    completedAgentIds: [],
    artifacts: [],
    notes: [],
    lastUpdatedAt: new Date(0).toISOString(),
    ...overrides,
  }
}

function makeArtifact(
  owner: AgentId,
  payload: Record<string, unknown> = {},
  metadata: Record<string, unknown> = {},
): PersistedArtifact {
  return {
    id: `artifact-${owner}`,
    type: `${owner}_artifact`,
    owner,
    summary: `${owner} artifact`,
    payload,
    metadata,
    persistedAt: new Date(0).toISOString(),
  }
}

describe('RoutingEngine', () => {
  it('starts from project_manager by default', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })

    const decision = await engine.determineFirstAgent({
      task,
      state: makeState(),
    })

    expect(decision.kind).toBe('execute')
    if (decision.kind !== 'execute') {
      throw new Error('Expected execute decision')
    }
    expect(decision.agentId).toBe('project_manager')
  })

  it('routes planning to awaiting approval when the artifact requires approval', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })

    const decision = await engine.determineNextAgent({
      task,
      state: makeState({
        status: 'running',
        completedAgentIds: ['project_manager', 'task_planning'],
      }),
      lastAgentId: 'task_planning',
      artifact: makeArtifact('task_planning', {
        approvalRequired: true,
        approvalCheckpoint: 'implementation_approval',
        approvalReason: 'High-risk implementation requires explicit approval.',
      }),
    })

    expect(decision.kind).toBe('awaiting_approval')
    if (decision.kind !== 'awaiting_approval') {
      throw new Error('Expected awaiting approval decision')
    }
    expect(decision.checkpoint).toBe('implementation_approval')
  })

  it('routes code review findings to bug investigation', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })

    const decision = await engine.determineNextAgent({
      task,
      state: makeState({
        status: 'running',
        completedAgentIds: ['project_manager', 'task_planning', 'implementation', 'code_review'],
      }),
      lastAgentId: 'code_review',
      artifact: makeArtifact('code_review', {
        reviewOutcome: 'changes_requested',
      }),
    })

    expect(decision.kind).toBe('execute')
    if (decision.kind !== 'execute') {
      throw new Error('Expected execute decision')
    }
    expect(decision.agentId).toBe('bug_investigation')
  })

  it('completes when release readiness returns ready', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })

    const decision = await engine.determineNextAgent({
      task,
      state: makeState({
        status: 'running',
        completedAgentIds: ['project_manager', 'task_planning', 'implementation', 'code_review', 'release_readiness'],
      }),
      lastAgentId: 'release_readiness',
      artifact: makeArtifact('release_readiness', {
        releaseOutcome: 'ready',
        releaseSummary: 'Ready for production.',
      }),
    })

    expect(decision.kind).toBe('complete')
    if (decision.kind !== 'complete') {
      throw new Error('Expected complete decision')
    }
    expect(decision.outcome).toBe('ready')
  })

  it('routes release readiness back to implementation when corrective action is required', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })

    const decision = await engine.determineNextAgent({
      task,
      state: makeState({
        status: 'running',
        completedAgentIds: ['project_manager', 'task_planning', 'implementation', 'code_review', 'release_readiness'],
      }),
      lastAgentId: 'release_readiness',
      artifact: makeArtifact('release_readiness', {
        releaseOutcome: 'not_ready',
        recommendedNextAgentId: 'implementation',
        releaseSummary: 'Fix failing release gate.',
      }),
    })

    expect(decision.kind).toBe('execute')
    if (decision.kind !== 'execute') {
      throw new Error('Expected execute decision')
    }
    expect(decision.agentId).toBe('implementation')
  })

  it('rejects forbidden transitions deterministically', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })

    await expect(
      engine.determineNextAgent({
        task,
        state: makeState({
          status: 'running',
          completedAgentIds: ['project_manager', 'task_planning', 'implementation'],
        }),
        lastAgentId: 'implementation',
        artifact: makeArtifact('implementation', {
          routing: {
            kind: 'execute',
            agentId: 'release_readiness',
            reason: 'Skip review',
          },
        }),
      }),
    ).rejects.toBeInstanceOf(TransitionValidationError)
  })
})
