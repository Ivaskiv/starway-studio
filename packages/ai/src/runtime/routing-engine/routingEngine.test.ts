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

  it('routes finance tasks through analytics, finance, funnel, ads creative, and guardian in order', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })
    const financeTask: EngineeringTask = {
      ...task,
      id: 'task-routing-finance',
      objective: 'Проаналізуй CAC FOCUS по каналах і запропонуй зниження.',
    }

    const first = await engine.determineFirstAgent({
      task: financeTask,
      state: makeState({ task: financeTask }),
    })
    expect(first).toMatchObject({ kind: 'execute', agentId: 'project_manager' })

    const analytics = await engine.determineNextAgent({
      task: financeTask,
      state: makeState({
        task: financeTask,
        status: 'running',
        completedAgentIds: ['project_manager'],
      }),
      lastAgentId: 'project_manager',
      artifact: makeArtifact('project_manager'),
    })
    expect(analytics).toMatchObject({ kind: 'execute', agentId: 'analytics_agent' })

    const finance = await engine.determineNextAgent({
      task: financeTask,
      state: makeState({
        task: financeTask,
        status: 'running',
        completedAgentIds: ['project_manager', 'analytics_agent'],
      }),
      lastAgentId: 'analytics_agent',
      artifact: makeArtifact('analytics_agent'),
    })
    expect(finance).toMatchObject({ kind: 'execute', agentId: 'finance_agent' })

    const funnel = await engine.determineNextAgent({
      task: financeTask,
      state: makeState({
        task: financeTask,
        status: 'running',
        completedAgentIds: ['project_manager', 'analytics_agent', 'finance_agent'],
      }),
      lastAgentId: 'finance_agent',
      artifact: makeArtifact('finance_agent'),
    })
    expect(funnel).toMatchObject({ kind: 'execute', agentId: 'funnel_agent' })

    const adsCreative = await engine.determineNextAgent({
      task: financeTask,
      state: makeState({
        task: financeTask,
        status: 'running',
        completedAgentIds: ['project_manager', 'analytics_agent', 'finance_agent', 'funnel_agent'],
      }),
      lastAgentId: 'funnel_agent',
      artifact: makeArtifact('funnel_agent'),
    })
    expect(adsCreative).toMatchObject({ kind: 'execute', agentId: 'ads_creative_agent' })

    const guardian = await engine.determineNextAgent({
      task: financeTask,
      state: makeState({
        task: financeTask,
        status: 'running',
        completedAgentIds: ['project_manager', 'analytics_agent', 'finance_agent', 'funnel_agent', 'ads_creative_agent'],
      }),
      lastAgentId: 'ads_creative_agent',
      artifact: makeArtifact('ads_creative_agent'),
    })
    expect(guardian).toMatchObject({ kind: 'awaiting_approval', checkpoint: 'guardian_validation' })
  })

  it('routes methodology changes to the methodology owner and then the guardian gate', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })
    const methodologyTask: EngineeringTask = {
      ...task,
      id: 'task-routing-methodology',
      objective: 'Заміни етап ЦІЛЬ на МРІЯ в методології AB System.',
    }

    const methodology = await engine.determineNextAgent({
      task: methodologyTask,
      state: makeState({
        task: methodologyTask,
        status: 'running',
        completedAgentIds: ['project_manager'],
      }),
      lastAgentId: 'project_manager',
      artifact: makeArtifact('project_manager'),
    })
    expect(methodology).toMatchObject({ kind: 'execute', agentId: 'methodology_agent' })

    const guardian = await engine.determineNextAgent({
      task: methodologyTask,
      state: makeState({
        task: methodologyTask,
        status: 'running',
        completedAgentIds: ['project_manager', 'methodology_agent'],
      }),
      lastAgentId: 'methodology_agent',
      artifact: makeArtifact('methodology_agent'),
    })
    expect(guardian).toMatchObject({ kind: 'awaiting_approval', checkpoint: 'guardian_validation' })
  })

  it('routes individual-user analysis to user intelligence instead of analytics', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })
    const userTask: EngineeringTask = {
      ...task,
      id: 'task-routing-user',
      objective: 'Проаналізуй стан конкретного користувача та визнач наступну дію.',
    }

    const decision = await engine.determineNextAgent({
      task: userTask,
      state: makeState({
        task: userTask,
        status: 'running',
        completedAgentIds: ['project_manager'],
      }),
      lastAgentId: 'project_manager',
      artifact: makeArtifact('project_manager'),
    })

    expect(decision).toMatchObject({ kind: 'execute', agentId: 'user_intelligence_agent' })
  })

  it('blocks historical FOCUS finance calculations with MISSING_CONTEXT instead of fabricating LTV', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })
    const historicalTask: EngineeringTask = {
      ...task,
      id: 'task-routing-historical',
      objective: 'Порахуй LTV FOCUS, використовуючи 80% повторної покупки.',
    }

    const decision = await engine.determineNextAgent({
      task: historicalTask,
      state: makeState({
        task: historicalTask,
        status: 'running',
        completedAgentIds: ['project_manager', 'analytics_agent', 'finance_agent'],
      }),
      lastAgentId: 'finance_agent',
      artifact: makeArtifact('finance_agent'),
    })

    expect(decision.kind).toBe('blocked')
    if (decision.kind !== 'blocked') {
      throw new Error('Expected blocked decision')
    }
    expect(decision.reason).toContain('MISSING_CONTEXT')
  })

  it('preserves agent conflicts instead of selecting a winner', async () => {
    const engine = new RoutingEngine({
      policy: new RoutingPolicy(),
      validator: new TransitionValidator(),
      logger,
    })

    const decision = await engine.determineNextAgent({
      task,
      state: makeState({
        status: 'running',
        completedAgentIds: ['project_manager', 'analytics_agent'],
      }),
      lastAgentId: 'analytics_agent',
      artifact: makeArtifact('analytics_agent', {
        conflicts: [
          { agentId: 'analytics_agent', summary: 'Current CAC is stable.' },
          { agentId: 'finance_agent', summary: 'Current CAC is deteriorating.' },
        ],
        conflictSummary: 'Analytics and Finance disagree on CAC direction.',
      }),
    })

    expect(decision.kind).toBe('blocked')
    if (decision.kind !== 'blocked') {
      throw new Error('Expected blocked decision')
    }
    expect(decision.reason).toContain('AGENT_CONFLICT')
  })
})
