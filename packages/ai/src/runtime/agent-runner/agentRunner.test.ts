import { describe, expect, it, vi } from 'vitest'

import { AgentRunner } from './agentRunner.js'
import {
  AgentDefinitionNotFoundError,
  AgentDependencyResolutionError,
  AgentOutputValidationError,
  AgentPrerequisiteError,
} from './errors.js'
import type {
  AgentDefinition,
  AIProviderResponse,
  IAIProvider,
  IArtifactFactory,
  IArtifactValidator,
  IContextLoader,
  IPromptRegistry,
  PromptMetadata,
} from './types.js'
import type { ContextSourceKind } from '../context-loader/types.js'
import { InMemoryUsageLedgerStore, UsageLedger } from '../../providers/usageLedger.js'
import type {
  AgentId,
  AgentRunInput,
  EngineeringArtifact,
  EngineeringTask,
  ExecutionStateSnapshot,
  IRuntimeLogger,
} from '../orchestrator/types.js'

const task: EngineeringTask = {
  id: 'runtime-task-1',
  description: 'Execute agent',
  objective: 'Return one validated artifact',
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

const planningDefinition: AgentDefinition = {
  id: 'task_planning',
  promptId: 'task-planning-prompt',
  artifactType: 'planning_artifact',
  requiredCompletedAgentIds: ['project_manager'],
}

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function makeArtifact(overrides: Partial<EngineeringArtifact> = {}): EngineeringArtifact {
  return {
    id: 'artifact-1',
    type: 'planning_artifact',
    owner: 'task_planning',
    summary: 'Planning artifact',
    payload: { plan: ['step-1'] },
    ...overrides,
  }
}

function makeInput(overrides: Partial<AgentRunInput> = {}): AgentRunInput {
  return {
    task,
    agentId: 'task_planning',
    state,
    ...overrides,
  }
}

function makeRunner(overrides: Partial<{
  promptRegistry: IPromptRegistry
  contextLoader: IContextLoader
  aiProvider: IAIProvider
  artifactFactory: IArtifactFactory
  artifactValidator: IArtifactValidator
  agentDefinitions: AgentDefinition[] | Partial<Record<AgentId, AgentDefinition>>
  usageLedger: UsageLedger
}> = {}) {
  return new AgentRunner({
    agentDefinitions: overrides.agentDefinitions ?? [planningDefinition],
    promptRegistry: overrides.promptRegistry ?? {
      resolvePrompt: vi.fn(async () => ({
        id: 'task-planning-prompt',
        version: '1.0.0',
        content: 'You are the planning agent',
      })),
    },
    contextLoader: overrides.contextLoader ?? {
      loadContext: vi.fn(async () => ({
        summary: 'Scoped planning context',
        sourceOrder: ['task', 'runtime_state', 'prompt'] as ContextSourceKind[],
        canonicalDocuments: ['docs/reference/ai-engineer-roles.md'],
      })),
    },
    aiProvider: overrides.aiProvider ?? {
      execute: vi.fn(async (): Promise<AIProviderResponse> => ({
        content: 'Execution plan',
        notes: ['provider-note'],
      })),
    },
    artifactFactory: overrides.artifactFactory ?? {
      createArtifact: vi.fn(async () => makeArtifact()),
    },
    artifactValidator: overrides.artifactValidator ?? {
      validate: vi.fn(async () => ({
        valid: true,
        notes: ['artifact-validated'],
      })),
    },
    usageLedger: overrides.usageLedger,
    logger,
  })
}

describe('AgentRunner', () => {
  it('runs one agent and returns one validated artifact', async () => {
    const runner = makeRunner()

    const result = await runner.run(makeInput())

    expect(result.artifact).toEqual(makeArtifact())
    expect(result.notes).toEqual(['provider-note', 'artifact-validated'])
  })

  it('preserves split prompt execution metadata at the provider boundary', async () => {
    const providerExecute = vi.fn(async (): Promise<AIProviderResponse> => ({
      content: 'Execution plan',
    }))
    const executionMetadata: PromptMetadata = {
      execution: {
        userPrompt: 'USER_SENTINEL',
        strategyTier: 'complex',
        contentType: 'telegram',
      },
    }
    const runner = makeRunner({
      promptRegistry: {
        resolvePrompt: vi.fn(async () => ({
          id: 'task-planning-prompt',
          version: '1.0.0',
          content: 'SYSTEM_SENTINEL',
          metadata: executionMetadata,
        })),
      },
      aiProvider: {
        execute: providerExecute,
      },
    })

    await runner.run(makeInput())

    expect(providerExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.objectContaining({
          content: 'SYSTEM_SENTINEL',
          metadata: executionMetadata,
        }),
      }),
    )
  })

  it('fails when the agent definition is missing', async () => {
    const runner = makeRunner({ agentDefinitions: [] })

    await expect(runner.run(makeInput())).rejects.toBeInstanceOf(AgentDefinitionNotFoundError)
  })

  it('fails when execution state prerequisites are not satisfied', async () => {
    const runner = makeRunner()

    await expect(
      runner.run(makeInput({
        state: {
          ...state,
          status: 'completed',
        },
      })),
    ).rejects.toBeInstanceOf(AgentPrerequisiteError)
  })

  it('wraps prompt resolution failures as dependency errors', async () => {
    const runner = makeRunner({
      promptRegistry: {
        resolvePrompt: vi.fn(async () => {
          throw new Error('prompt-missing')
        }),
      },
    })

    await expect(runner.run(makeInput())).rejects.toBeInstanceOf(AgentDependencyResolutionError)
  })

  it('rejects provider output when it contains no usable content', async () => {
    const runner = makeRunner({
      aiProvider: {
        execute: vi.fn(async () => ({
          content: '   ',
        })),
      },
    })

    await expect(runner.run(makeInput())).rejects.toBeInstanceOf(AgentOutputValidationError)
  })

  it('rejects artifacts that violate the expected contract', async () => {
    const runner = makeRunner({
      artifactFactory: {
        createArtifact: vi.fn(async () => makeArtifact({ type: 'review_artifact' })),
      },
    })

    await expect(runner.run(makeInput())).rejects.toBeInstanceOf(AgentOutputValidationError)
  })

  it('rejects artifacts that fail validator checks', async () => {
    const runner = makeRunner({
      artifactValidator: {
        validate: vi.fn(async () => ({
          valid: false,
          reason: 'artifact invalid',
        })),
      },
    })

    await expect(runner.run(makeInput())).rejects.toBeInstanceOf(AgentOutputValidationError)
  })

  it('records runtime usage when a usage ledger is configured', async () => {
    const store = new InMemoryUsageLedgerStore()
    const runner = makeRunner({
      usageLedger: new UsageLedger(store),
      aiProvider: {
        execute: vi.fn(async (): Promise<AIProviderResponse> => ({
          content: 'Execution plan',
          metadata: {
            provider: 'openai',
            model: 'gpt-4.1-mini',
            tokenUsage: {
              inputTokens: 42,
              outputTokens: 12,
              totalTokens: 54,
              cachedInputTokens: 5,
            },
          },
        })),
      },
    })

    await runner.run(makeInput({
      task: {
        ...task,
        metadata: { userId: 'user-42' },
      },
    }))

    await expect(store.list()).resolves.toEqual([
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-4.1-mini',
        agent: 'task_planning',
        task: 'runtime-task-1',
        promptTokens: 42,
        completionTokens: 12,
        cachedTokens: 5,
        user: 'user-42',
      }),
    ])
  })
})
