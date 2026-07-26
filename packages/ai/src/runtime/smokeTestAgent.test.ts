import { describe, expect, it, vi } from 'vitest'

import { AgentRunner } from './agent-runner/agentRunner.js'
import { AgentRegistry } from './agent-registry/agentRegistry.js'
import { ArtifactEngine } from './artifact-engine/artifactEngine.js'
import { DefaultArtifactFactory } from './artifact-engine/artifactFactory.js'
import { InMemoryArtifactStore } from './artifact-engine/artifactStore.js'
import { DefaultArtifactValidator } from './artifact-engine/artifactValidator.js'
import { ContextLoader } from './context-loader/contextLoader.js'
import { DeterministicContextMerger } from './context-loader/contextMerger.js'
import {
  ArtifactContextProvider,
  PromptContextProvider,
  RuntimeStateContextProvider,
  TaskContextProvider,
} from './context-loader/providers.js'
import { RuntimeContextValidator } from './context-loader/contextValidator.js'
import type { IArtifactValidator as IRunnerArtifactValidator } from './agent-runner/types.js'
import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from './orchestrator/types.js'
import { InMemoryPromptCache } from './prompt-registry/promptCache.js'
import { DEFAULT_RUNTIME_PROMPT_SOURCES } from './prompt-registry/catalog.js'
import { FileSystemPromptLoader } from './prompt-registry/promptLoader.js'
import { PromptRegistry } from './prompt-registry/promptRegistry.js'
import {
  SMOKE_TEST_AGENT_CONFIGURATION,
  SMOKE_TEST_AGENT_ID,
  SMOKE_TEST_ARTIFACT_TYPE,
  SMOKE_TEST_CAPABILITY,
  type SmokeTestArtifactPayload,
  type SmokeTestTaskInput,
} from './smokeTestAgent.js'
import { ProviderRegistry } from '../providers/registry/providerRegistry.js'

const EXPECTED_PROMPT = `You are a runtime verification agent.

Reply with exactly:

OK

Do not output anything else.`

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('SmokeTestAgent', () => {
  it('returns OK through the full runtime pipeline', async () => {
    const taskInput: SmokeTestTaskInput = {}
    const task: EngineeringTask = {
      id: 'smoke-test-task-1',
      description: 'Run the runtime smoke test agent.',
      objective: 'Verify that the runtime pipeline produces OK.',
      metadata: {
        input: taskInput,
      },
    }

    const state: ExecutionStateSnapshot = {
      task,
      status: 'running',
      currentAgentId: SMOKE_TEST_AGENT_ID,
      completedAgentIds: [],
      artifacts: [],
      notes: [],
      lastUpdatedAt: new Date(0).toISOString(),
    }

    const agentRegistry = new AgentRegistry({
      agents: [SMOKE_TEST_AGENT_CONFIGURATION],
      logger,
    })
    const agentDefinition = agentRegistry.getAgentById(SMOKE_TEST_AGENT_ID)

    const promptRegistry = new PromptRegistry({
      sources: DEFAULT_RUNTIME_PROMPT_SOURCES,
      loader: new FileSystemPromptLoader(),
      cache: new InMemoryPromptCache(),
      logger,
    })

    const contextLoader = new ContextLoader({
      providers: [
        new ArtifactContextProvider(),
        new PromptContextProvider(),
        new RuntimeStateContextProvider(),
        new TaskContextProvider(),
      ],
      merger: new DeterministicContextMerger(),
      validator: new RuntimeContextValidator(),
      logger,
    })

    const providerExecute = vi.fn(async ({ prompt, context }) => {
      expect(prompt.id).toBe('smoke-test-prompt')
      expect(prompt.content.trim()).toBe(EXPECTED_PROMPT)
      expect(context.sourceOrder).toEqual(['task', 'runtime_state', 'prompt'])

      return {
        content: 'OK',
        metadata: {
          provider: 'openai',
          model: 'runtime-smoke-test-model',
        },
      }
    })

    const providerRegistry = new ProviderRegistry({
      configuration: {
        selectedProvider: 'openai',
        selectedCapability: SMOKE_TEST_CAPABILITY,
        providers: {
          openai: {
            config: {
              apiKey: 'test-openai-key',
            },
          },
          anthropic: {
            config: {
              apiKey: 'test-anthropic-key',
            },
          },
        },
        capabilityMappings: {
          [SMOKE_TEST_CAPABILITY]: {
            preferred: {
              provider: 'openai',
              model: 'runtime-smoke-test-model',
            },
            fallback: {
              provider: 'anthropic',
              model: 'claude-sonnet',
            },
          },
        },
      },
      factory: {
        create: vi.fn((selection) => {
          expect(selection.providerId).toBe('openai')
          expect(selection.config.defaultModel).toBe('runtime-smoke-test-model')
          return {
            execute: providerExecute,
          }
        }),
      },
      logger,
    })

    const runnerArtifactValidator: IRunnerArtifactValidator = {
      validate: vi.fn(async ({ artifact }) => {
        const result = artifact.payload.result
        return {
          valid: result === 'OK',
          reason: result === 'OK' ? undefined : 'Smoke test artifact result must equal OK.',
        }
      }),
    }

    const runner = new AgentRunner({
      agentDefinitions: [agentDefinition],
      promptRegistry,
      contextLoader,
      aiProvider: providerRegistry.getProvider(),
      artifactFactory: {
        createArtifact: vi.fn(async ({ providerResponse }) => ({
          id: 'smoke-test-artifact-1',
          type: SMOKE_TEST_ARTIFACT_TYPE,
          owner: SMOKE_TEST_AGENT_ID,
          summary: 'Smoke test agent returned OK.',
          payload: {
            result: providerResponse.content,
          } satisfies SmokeTestArtifactPayload,
        })),
      },
      artifactValidator: runnerArtifactValidator,
      logger,
    })

    const runResult = await runner.run({
      task,
      agentId: SMOKE_TEST_AGENT_ID,
      state,
    })

    const artifactEngine = new ArtifactEngine({
      factory: new DefaultArtifactFactory(),
      validator: new DefaultArtifactValidator(),
      store: new InMemoryArtifactStore(),
      logger,
    })

    const storedResult = await artifactEngine.validateAndStore({
      task,
      agentId: SMOKE_TEST_AGENT_ID,
      artifact: runResult.artifact,
      state,
    })

    expect(runResult.artifact.payload).toEqual<SmokeTestArtifactPayload>({
      result: 'OK',
    })
    expect(providerExecute).toHaveBeenCalledTimes(1)
    expect(storedResult.kind).toBe('accepted')
    if (storedResult.kind !== 'accepted') {
      throw new Error('Smoke test artifact was rejected unexpectedly.')
    }

    expect(storedResult.artifact.payload).toEqual<SmokeTestArtifactPayload>({
      result: 'OK',
    })
    expect(storedResult.artifact.metadata.kind).toBe('generic')
    expect(storedResult.artifact.metadata.ownerAgentId).toBe(SMOKE_TEST_AGENT_ID)
  })
})
