import { describe, expect, it, vi } from 'vitest'

import type { IRuntimeLogger } from '../orchestrator/types.js'
import { AgentRegistry } from './agentRegistry.js'
import {
  AgentRegistrationValidationError,
  AgentRegistryLookupError,
} from './errors.js'

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('AgentRegistry', () => {
  it('stores canonical agent configuration and looks up by id', () => {
    const registry = new AgentRegistry({
      agents: [
        {
          id: 'implementation',
          capability: 'coding',
          prompt: 'implementation-prompt',
          temperature: 0.2,
          contextSources: ['task', 'runtime_state', 'prompt', 'repository'],
          artifactType: 'implementation_artifact',
          routingMetadata: {
            lane: 'main',
          },
          requiredCompletedAgentIds: ['task_planning'],
        },
      ],
      logger,
    })

    const agent = registry.getAgentById('implementation')

    expect(agent).toEqual({
      id: 'implementation',
      promptId: 'implementation-prompt',
      temperature: 0.2,
      requiredContextSources: ['task', 'runtime_state', 'prompt', 'repository'],
      artifactType: 'implementation_artifact',
      routingMetadata: {
        lane: 'main',
      },
      requiredCompletedAgentIds: ['task_planning'],
    })
  })

  it('returns all registered agents', () => {
    const registry = new AgentRegistry({
      agents: [
        {
          id: 'task_planning',
          capability: 'planning',
          prompt: 'task-planning-prompt',
          artifactType: 'planning_artifact',
        },
        {
          id: 'code_review',
          capability: 'deep_reasoning',
          prompt: 'code-review-prompt',
          artifactType: 'review_artifact',
        },
      ],
      logger,
    })

    expect(registry.getAllAgents()).toHaveLength(2)
    expect(registry.hasAgent('task_planning')).toBe(true)
    expect(registry.hasAgent('release_readiness')).toBe(false)
  })

  it('applies default context sources when none are provided', () => {
    const registry = new AgentRegistry({
      agents: [
        {
          id: 'refactoring',
          capability: 'summarization',
          prompt: 'refactoring-prompt',
          artifactType: 'refactoring_artifact',
        },
      ],
      logger,
    })

    expect(registry.getAgentById('refactoring').requiredContextSources).toEqual([
      'task',
      'runtime_state',
      'prompt',
    ])
  })

  it('normalizes duplicate context sources and statuses', () => {
    const registry = new AgentRegistry({
      agents: [
        {
          id: 'bug_investigation',
          capability: 'classification',
          prompt: 'bug-investigation-prompt',
          artifactType: 'investigation_artifact',
          contextSources: ['task', 'task', 'repository', 'repository'],
          allowedStatuses: ['running', 'running', 'initialized'],
        },
      ],
      logger,
    })

    const agent = registry.getAgentById('bug_investigation')
    expect(agent.requiredContextSources).toEqual(['task', 'repository'])
    expect(agent.allowedStatuses).toEqual(['running', 'initialized'])
  })

  it('fails lookup for an unknown agent id', () => {
    const registry = new AgentRegistry({
      agents: [
        {
          id: 'release_readiness',
          capability: 'planning',
          prompt: 'release-readiness-prompt',
          artifactType: 'release_artifact',
        },
      ],
      logger,
    })

    expect(() => registry.getAgentById('implementation')).toThrow(AgentRegistryLookupError)
  })

  it('rejects duplicate agent ids', () => {
    expect(
      () =>
        new AgentRegistry({
          agents: [
            {
              id: 'implementation',
              capability: 'coding',
              prompt: 'implementation-prompt',
              artifactType: 'implementation_artifact',
            },
            {
              id: 'implementation',
              capability: 'deep_reasoning',
              prompt: 'implementation-prompt-v2',
              artifactType: 'implementation_artifact',
            },
          ],
          logger,
        }),
    ).toThrow(AgentRegistrationValidationError)
  })

  it('rejects missing capabilities', () => {
    expect(
      () =>
        new AgentRegistry({
          agents: [
            {
              id: 'implementation',
              capability: '   ',
              prompt: 'implementation-prompt',
              artifactType: 'implementation_artifact',
            },
          ],
          logger,
        }),
    ).toThrow(AgentRegistrationValidationError)
  })

  it('rejects invalid temperatures', () => {
    expect(
      () =>
        new AgentRegistry({
          agents: [
            {
              id: 'implementation',
              capability: 'coding',
              prompt: 'implementation-prompt',
              temperature: 4,
              artifactType: 'implementation_artifact',
            },
          ],
          logger,
        }),
    ).toThrow(AgentRegistrationValidationError)
  })

  it('rejects unknown context sources', () => {
    expect(
      () =>
        new AgentRegistry({
          agents: [
            {
              id: 'implementation',
              capability: 'coding',
              prompt: 'implementation-prompt',
              artifactType: 'implementation_artifact',
              contextSources: ['task', 'unknown' as 'task'],
            },
          ],
          logger,
        }),
    ).toThrow(AgentRegistrationValidationError)
  })

  it('rejects self-referential prerequisites', () => {
    expect(
      () =>
        new AgentRegistry({
          agents: [
            {
              id: 'implementation',
              capability: 'coding',
              prompt: 'implementation-prompt',
              artifactType: 'implementation_artifact',
              requiredCompletedAgentIds: ['implementation'],
            },
          ],
          logger,
        }),
    ).toThrow(AgentRegistrationValidationError)
  })
})
