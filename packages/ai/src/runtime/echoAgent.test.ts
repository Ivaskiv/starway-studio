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
  ECHO_AGENT_ARTIFACT_TYPE,
  ECHO_AGENT_CAPABILITY,
  ECHO_AGENT_CONFIGURATION,
  ECHO_AGENT_ID,
  type EchoArtifactPayload,
  type EchoTaskInput,
} from './echoAgent.js'
import { ProviderRegistry } from '../providers/registry/providerRegistry.js'

const EXPECTED_PROMPT = `You are an echo agent.

Return exactly the user message.

Do not summarize.

Do not explain.

Do not add punctuation.`

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function createTask(input: EchoTaskInput): EngineeringTask {
  return {
    id: `echo-task-${input.message}`,
    description: 'Run the runtime echo agent.',
    objective: 'Verify that the runtime pipeline returns the original message.',
    metadata: {
      input,
    },
  }
}

function createState(task: EngineeringTask): ExecutionStateSnapshot {
  return {
    task,
    status: 'running',
    currentAgentId: ECHO_AGENT_ID,
    completedAgentIds: [],
    artifacts: [],
    notes: [],
    lastUpdatedAt: new Date(0).toISOString(),
  }
}

describe('EchoAgent', () => {
  it.each([
    { input: 'Hello', expected: 'Hello' },
    { input: 'Starway', expected: 'Starway' },
    { input: 'Україна', expected: 'Україна' },
  ])('returns the original message for $input', async ({ input, expected }) => {
    const taskInput: EchoTaskInput = {
      message: input,
    }
    const task = createTask(taskInput)
    const state = createState(task)

    const agentRegistry = new AgentRegistry({
      agents: [ECHO_AGENT_CONFIGURATION],
      logger,
    })
    const agentDefinition = agentRegistry.getAgentById(ECHO_AGENT_ID)

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
      expect(prompt.id).toBe('echo-agent-prompt')
      expect(prompt.content.trim()).toBe(EXPECTED_PROMPT)
      expect(context.sourceOrder).toEqual(['task', 'runtime_state', 'prompt'])
      expect(context.task?.metadata).toEqual({
        input: taskInput,
      })

      const message = context.task?.metadata?.input
      if (!isEchoTaskInput(message)) {
        throw new Error('EchoAgent expected task metadata input.message to be present.')
      }

      return {
        content: message.message,
        metadata: {
          provider: 'openai',
          model: 'runtime-echo-model',
        },
      }
    })

    const providerRegistry = new ProviderRegistry({
      configuration: {
        selectedProvider: 'openai',
        selectedCapability: ECHO_AGENT_CAPABILITY,
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
          [ECHO_AGENT_CAPABILITY]: {
            preferred: {
              provider: 'openai',
              model: 'runtime-echo-model',
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
          expect(selection.config.defaultModel).toBe('runtime-echo-model')
          return {
            execute: providerExecute,
          }
        }),
      },
      logger,
    })

    const runnerArtifactValidator: IRunnerArtifactValidator = {
      validate: vi.fn(async ({ artifact }) => ({
        valid: artifact.payload.message === expected,
        reason:
          artifact.payload.message === expected
            ? undefined
            : 'Echo artifact message must equal the original input message.',
      })),
    }

    const runner = new AgentRunner({
      agentDefinitions: [agentDefinition],
      promptRegistry,
      contextLoader,
      aiProvider: providerRegistry.getProvider(),
      artifactFactory: {
        createArtifact: vi.fn(async ({ providerResponse }) => ({
          id: `echo-artifact-${expected}`,
          type: ECHO_AGENT_ARTIFACT_TYPE,
          owner: ECHO_AGENT_ID,
          summary: `Echo agent returned: ${expected}`,
          payload: {
            message: providerResponse.content,
          } satisfies EchoArtifactPayload,
        })),
      },
      artifactValidator: runnerArtifactValidator,
      logger,
    })

    const runResult = await runner.run({
      task,
      agentId: ECHO_AGENT_ID,
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
      agentId: ECHO_AGENT_ID,
      artifact: runResult.artifact,
      state,
    })

    expect(runResult.artifact.payload).toEqual<EchoArtifactPayload>({
      message: expected,
    })
    expect(providerExecute).toHaveBeenCalledTimes(1)
    expect(storedResult.kind).toBe('accepted')
    if (storedResult.kind !== 'accepted') {
      throw new Error('Echo artifact was rejected unexpectedly.')
    }

    expect(storedResult.artifact.payload).toEqual<EchoArtifactPayload>({
      message: expected,
    })
    expect(storedResult.artifact.metadata.ownerAgentId).toBe(ECHO_AGENT_ID)
  })
})

function isEchoTaskInput(value: unknown): value is EchoTaskInput {
  return !!value && typeof value === 'object' && typeof (value as EchoTaskInput).message === 'string'
}
