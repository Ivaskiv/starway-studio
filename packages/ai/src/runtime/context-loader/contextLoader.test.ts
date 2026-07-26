import { describe, expect, it, vi } from 'vitest'

import { ContextLoader } from './contextLoader.js'
import { DeterministicContextMerger } from './contextMerger.js'
import { RuntimeContextValidator } from './contextValidator.js'
import {
  ArtifactContextProvider,
  PromptContextProvider,
  RuntimeStateContextProvider,
  TaskContextProvider,
} from './providers.js'
import { ContextProviderError, ContextValidationError } from './errors.js'
import type { AgentDefinition, ResolvedPrompt } from '../agent-runner/types.js'
import type { ContextProviderInput, IContextProvider } from './types.js'
import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../orchestrator/types.js'

const task: EngineeringTask = {
  id: 'task-1',
  description: 'Load context',
  objective: 'Assemble runtime context',
}

const state: ExecutionStateSnapshot = {
  task,
  status: 'running',
  currentAgentId: 'task_planning',
  completedAgentIds: ['project_manager'],
  artifacts: [
    {
      id: 'artifact-1',
      type: 'planning_artifact',
      owner: 'task_planning',
      summary: 'Previous plan',
      payload: { plan: true },
      persistedAt: new Date(0).toISOString(),
    },
  ],
  notes: [],
  lastUpdatedAt: new Date(0).toISOString(),
}

const prompt: ResolvedPrompt = {
  id: 'task-planning-prompt',
  version: '1.0.0',
  content: 'plan',
}

const agentDefinition: AgentDefinition = {
  id: 'task_planning',
  promptId: 'task-planning-prompt',
  artifactType: 'planning_artifact',
  requiredContextSources: ['task', 'runtime_state', 'prompt', 'artifacts'],
}

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function makeInput(overrides: Partial<ContextProviderInput> = {}): ContextProviderInput {
  return {
    agentDefinition,
    task,
    state,
    prompt,
    ...overrides,
  }
}

describe('ContextLoader', () => {
  it('assembles deterministic runtime context from ordered providers', async () => {
    const loader = new ContextLoader({
      providers: [
        new ArtifactContextProvider(),
        new PromptContextProvider(),
        new TaskContextProvider(),
        new RuntimeStateContextProvider(),
      ],
      merger: new DeterministicContextMerger(),
      validator: new RuntimeContextValidator(),
      logger,
    })

    const context = await loader.loadContext(makeInput())

    expect(context.sourceOrder).toEqual(['task', 'runtime_state', 'prompt', 'artifacts'])
    expect(context.task?.objective).toBe('Assemble runtime context')
    expect(context.runtimeState?.status).toBe('running')
    expect(context.prompt).toEqual({ id: 'task-planning-prompt', version: '1.0.0' })
    expect(context.priorArtifacts).toHaveLength(1)
    expect(context.summary).toContain('Task: Assemble runtime context')
    expect(context.summary).toContain('Runtime state: running')
    expect(context.summary).toContain('Prompt: task-planning-prompt@1.0.0')
  })

  it('preserves canonical priority order regardless of provider registration order', async () => {
    const documentationProvider: IContextProvider = {
      source: 'documentation',
      provide: vi.fn(async () => ({
        source: 'documentation' as const,
        summaryFragment: 'Docs loaded',
        canonicalDocuments: ['docs/reference/ai-context-loading.md'],
      })),
    }

    const repositoryProvider: IContextProvider = {
      source: 'repository',
      provide: vi.fn(async () => ({
        source: 'repository' as const,
        summaryFragment: 'Repo evidence loaded',
        repositoryEvidence: ['packages/ai/src/runtime/context-loader/contextLoader.ts'],
      })),
    }

    const loader = new ContextLoader({
      providers: [
        repositoryProvider,
        new PromptContextProvider(),
        documentationProvider,
        new TaskContextProvider(),
        new RuntimeStateContextProvider(),
      ],
      merger: new DeterministicContextMerger(),
      validator: new RuntimeContextValidator(),
      logger,
    })

    const context = await loader.loadContext(
      makeInput({
        agentDefinition: {
          ...agentDefinition,
          requiredContextSources: ['task', 'runtime_state', 'prompt', 'documentation', 'repository'],
        },
      }),
    )

    expect(context.sourceOrder).toEqual(['task', 'runtime_state', 'prompt', 'documentation', 'repository'])
  })

  it('fails when a provider throws', async () => {
    const failingProvider: IContextProvider = {
      source: 'documentation',
      provide: vi.fn(async () => {
        throw new Error('docs unavailable')
      }),
    }

    const loader = new ContextLoader({
      providers: [new TaskContextProvider(), failingProvider],
      merger: new DeterministicContextMerger(),
      validator: new RuntimeContextValidator(),
      logger,
    })

    await expect(
      loader.loadContext(
        makeInput({
          agentDefinition: {
            ...agentDefinition,
            requiredContextSources: ['task', 'documentation'],
          },
        }),
      ),
    ).rejects.toBeInstanceOf(ContextProviderError)
  })

  it('fails when required context remains incomplete', async () => {
    const loader = new ContextLoader({
      providers: [new TaskContextProvider()],
      merger: new DeterministicContextMerger(),
      validator: new RuntimeContextValidator(),
      logger,
    })

    await expect(loader.loadContext(makeInput())).rejects.toBeInstanceOf(ContextValidationError)
  })
})
