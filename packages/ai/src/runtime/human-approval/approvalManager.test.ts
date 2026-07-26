import { describe, expect, it, vi } from 'vitest'

import type { ExecutionStateSnapshot, IRuntimeLogger } from '../orchestrator/types.js'
import type { StoredRuntimeArtifact } from '../artifact-engine/types.js'
import { ApprovalManager } from './approvalManager.js'
import { InMemoryApprovalStore } from './approvalStore.js'
import { ApprovalStateError, ApprovalValidationError } from './errors.js'
import { ApprovalValidator } from './validator.js'

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

const baseState: ExecutionStateSnapshot = {
  task: {
    id: 'task-approval-1',
    description: 'Approve runtime execution',
    objective: 'Validate human approval flow',
  },
  status: 'awaiting_approval',
  currentAgentId: 'task_planning',
  completedAgentIds: ['project_manager'],
  artifacts: [],
  notes: [],
  lastUpdatedAt: new Date(0).toISOString(),
}

const artifact: StoredRuntimeArtifact = {
  id: 'artifact-1',
  type: 'plan_artifact',
  owner: 'task_planning',
  summary: 'Plan requires approval',
  payload: {},
  persistedAt: new Date(0).toISOString(),
  metadata: {
    kind: 'plan',
    ownerAgentId: 'task_planning',
    taskId: baseState.task.id,
    stateStatus: 'awaiting_approval',
    handoffReady: true,
    createdAt: new Date(0).toISOString(),
    version: {
      schemaVersion: '1.0.0',
      artifactVersion: 1,
    },
  },
}

describe('ApprovalManager', () => {
  it('pauses execution and creates a pending approval request', async () => {
    const manager = new ApprovalManager({
      store: new InMemoryApprovalStore(),
      validator: new ApprovalValidator(),
      logger,
      now: () => new Date(0),
    })

    const request = await manager.pauseExecution({
      taskId: baseState.task.id,
      state: baseState,
      checkpoint: 'implementation_approval',
      reason: 'High-risk implementation requires approval.',
      artifact,
      requestedByAgentId: 'task_planning',
    })

    expect(request.status).toBe('pending')
    expect(request.artifactId).toBe(artifact.id)
    expect(request.metadata.checkpoint).toBe('implementation_approval')
  })

  it('records an approve decision and authorizes resume', async () => {
    const manager = new ApprovalManager({
      store: new InMemoryApprovalStore(),
      validator: new ApprovalValidator(),
      logger,
      now: () => new Date(0),
    })

    const request = await manager.pauseExecution({
      taskId: baseState.task.id,
      state: baseState,
      checkpoint: 'implementation_approval',
      reason: 'High-risk implementation requires approval.',
      artifact,
    })

    const resolution = await manager.approve({
      requestId: request.id,
      taskId: baseState.task.id,
      decidedBy: 'human-reviewer',
      reason: 'Approved to continue.',
    })

    expect(resolution.status).toBe('approved')
    expect(resolution.resumeAuthorized).toBe(true)
    expect(resolution.decision?.decision).toBe('approve')
  })

  it('records a reject decision and keeps resume unauthorized', async () => {
    const manager = new ApprovalManager({
      store: new InMemoryApprovalStore(),
      validator: new ApprovalValidator(),
      logger,
      now: () => new Date(0),
    })

    const request = await manager.pauseExecution({
      taskId: baseState.task.id,
      state: baseState,
      checkpoint: 'release_approval',
      reason: 'Release requires human approval.',
    })

    const resolution = await manager.reject({
      requestId: request.id,
      taskId: baseState.task.id,
      decidedBy: 'release-owner',
      reason: 'Not ready for release.',
    })

    expect(resolution.status).toBe('rejected')
    expect(resolution.resumeAuthorized).toBe(false)
  })

  it('times out when no decision arrives', async () => {
    const manager = new ApprovalManager({
      store: new InMemoryApprovalStore(),
      validator: new ApprovalValidator(),
      logger,
      now: (() => {
        let current = 0
        return () => {
          current += 100
          return new Date(current)
        }
      })(),
      sleep: async () => undefined,
      defaultTimeoutMs: 150,
      defaultPollIntervalMs: 1,
    })

    const request = await manager.pauseExecution({
      taskId: baseState.task.id,
      state: baseState,
      checkpoint: 'implementation_approval',
      reason: 'Waiting for human approval.',
    })

    const resolution = await manager.waitForDecision({
      requestId: request.id,
      taskId: baseState.task.id,
    })

    expect(resolution.status).toBe('timed_out')
    expect(resolution.timedOut).toBe(true)
    expect(resolution.resumeAuthorized).toBe(false)
  })

  it('waitForDecision resolves when an approval already exists', async () => {
    const manager = new ApprovalManager({
      store: new InMemoryApprovalStore(),
      validator: new ApprovalValidator(),
      logger,
      now: () => new Date(0),
      sleep: async () => undefined,
    })

    const request = await manager.pauseExecution({
      taskId: baseState.task.id,
      state: baseState,
      checkpoint: 'implementation_approval',
      reason: 'High-risk implementation requires approval.',
    })

    await manager.approve({
      requestId: request.id,
      taskId: baseState.task.id,
      decidedBy: 'human-reviewer',
    })

    const resolution = await manager.waitForDecision({
      requestId: request.id,
      taskId: baseState.task.id,
      timeoutMs: 10,
      pollIntervalMs: 1,
    })

    expect(resolution.status).toBe('approved')
    expect(resolution.decision?.decidedBy).toBe('human-reviewer')
  })

  it('rejects invalid request metadata', async () => {
    const manager = new ApprovalManager({
      store: new InMemoryApprovalStore(),
      validator: new ApprovalValidator(),
      logger,
      now: () => new Date(0),
    })

    await expect(
      manager.pauseExecution({
        taskId: baseState.task.id,
        state: baseState,
        checkpoint: '',
        reason: 'Missing checkpoint should fail.',
      }),
    ).rejects.toBeInstanceOf(ApprovalValidationError)
  })

  it('fails when decision taskId does not match the request', async () => {
    const manager = new ApprovalManager({
      store: new InMemoryApprovalStore(),
      validator: new ApprovalValidator(),
      logger,
      now: () => new Date(0),
    })

    const request = await manager.pauseExecution({
      taskId: baseState.task.id,
      state: baseState,
      checkpoint: 'implementation_approval',
      reason: 'Approval required.',
    })

    await expect(
      manager.approve({
        requestId: request.id,
        taskId: 'wrong-task-id',
        decidedBy: 'human-reviewer',
      }),
    ).rejects.toBeInstanceOf(ApprovalStateError)
  })
})
