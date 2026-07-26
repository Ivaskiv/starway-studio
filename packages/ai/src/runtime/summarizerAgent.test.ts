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
import { ProviderRegistry } from '../providers/registry/providerRegistry.js'
import {
  SUMMARY_ARTIFACT_TYPE,
  SUMMARIZER_AGENT_CAPABILITY,
  SUMMARIZER_AGENT_CONFIGURATION,
  SUMMARIZER_AGENT_ID,
  type SummarizeTaskInput,
  type SummaryArtifactPayload,
} from './summarizerAgent.js'

const EXPECTED_PROMPT = `Summarize the text.

Requirements:

- preserve meaning

- no hallucinations

- no additional facts

- answer in input language`

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function createTask(input: SummarizeTaskInput, testId: string): EngineeringTask {
  return {
    id: `summarize-task-${testId}`,
    description: 'Run the production summarizer agent.',
    objective: 'Verify that the runtime pipeline returns a bounded summary.',
    metadata: {
      input,
    },
  }
}

function createState(task: EngineeringTask): ExecutionStateSnapshot {
  return {
    task,
    status: 'running',
    currentAgentId: SUMMARIZER_AGENT_ID,
    completedAgentIds: [],
    artifacts: [],
    notes: [],
    lastUpdatedAt: new Date(0).toISOString(),
  }
}

describe('SummarizerAgent', () => {
  it.each([
    {
      testId: 'short-uk',
      input: {
        text: 'Це короткий текст про фокус і щоденну практику.',
        language: 'uk',
        maxLength: 80,
      },
      expected: {
        summary: 'Короткий текст про фокус і щоденну практику.',
        tokensUsed: 24,
        model: 'runtime-summarizer-model',
        provider: 'openai',
      },
    },
    {
      testId: 'long-uk',
      input: {
        text:
          'ФОКУС допомагає людині не просто зрозуміти, що треба змінити, а регулярно рухатися вперед через Zoom-практики, підтримку групи та маленькі щоденні кроки.',
        language: 'uk',
        maxLength: 90,
      },
      expected: {
        summary: 'ФОКУС допомагає регулярно рухатися вперед через практики, підтримку і щоденні кроки.',
        tokensUsed: 46,
        model: 'runtime-summarizer-model',
        provider: 'openai',
      },
    },
    {
      testId: 'short-en',
      input: {
        text: 'Starway helps people turn insight into consistent action.',
        language: 'en',
        maxLength: 70,
      },
      expected: {
        summary: 'Starway helps people turn insight into consistent action.',
        tokensUsed: 18,
        model: 'runtime-summarizer-model',
        provider: 'openai',
      },
    },
    {
      testId: 'long-en',
      input: {
        text:
          'The program combines coaching structure, weekly sessions, and daily momentum so people can keep moving without getting stuck between decisions and action.',
        language: 'en',
        maxLength: 85,
      },
      expected: {
        summary: 'The program combines structure, weekly sessions, and daily momentum to keep people moving.',
        tokensUsed: 39,
        model: 'runtime-summarizer-model',
        provider: 'openai',
      },
    },
  ])('returns a bounded summary for $testId', async ({ testId, input, expected }) => {
    const task = createTask(input, testId)
    const state = createState(task)

    const agentRegistry = new AgentRegistry({
      agents: [SUMMARIZER_AGENT_CONFIGURATION],
      logger,
    })
    const agentDefinition = agentRegistry.getAgentById(SUMMARIZER_AGENT_ID)

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
      expect(prompt.id).toBe('summarizer-agent-prompt')
      expect(prompt.content.trim()).toBe(EXPECTED_PROMPT)
      expect(context.sourceOrder).toEqual(['task', 'runtime_state', 'prompt'])
      expect(context.task?.metadata).toEqual({
        input,
      })

      const summarizeInput = context.task?.metadata?.input
      if (!isSummarizeTaskInput(summarizeInput)) {
        throw new Error('SummarizerAgent expected task metadata input to include text, language, and maxLength.')
      }

      expect(summarizeInput.language).toBe(input.language)
      expect(summarizeInput.maxLength).toBe(input.maxLength)
      expect(summarizeInput.text).toBe(input.text)

      return {
        content: expected.summary,
        metadata: {
          provider: expected.provider,
          model: expected.model,
          tokenUsage: {
            totalTokens: expected.tokensUsed,
          },
        },
      }
    })

    const providerRegistry = new ProviderRegistry({
      configuration: {
        selectedProvider: 'openai',
        selectedCapability: SUMMARIZER_AGENT_CAPABILITY,
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
          [SUMMARIZER_AGENT_CAPABILITY]: {
            preferred: {
              provider: 'openai',
              model: 'runtime-summarizer-model',
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
          expect(selection.config.defaultModel).toBe('runtime-summarizer-model')
          return {
            execute: providerExecute,
          }
        }),
      },
      logger,
    })

    const runnerArtifactValidator: IRunnerArtifactValidator = {
      validate: vi.fn(async ({ artifact }) => ({
        valid:
          artifact.payload.summary === expected.summary &&
          artifact.payload.tokensUsed === expected.tokensUsed &&
          artifact.payload.model === expected.model &&
          artifact.payload.provider === expected.provider,
        reason: 'Summary artifact fields must match the provider output exactly.',
      })),
    }

    const runner = new AgentRunner({
      agentDefinitions: [agentDefinition],
      promptRegistry,
      contextLoader,
      aiProvider: providerRegistry.getProvider(),
      artifactFactory: {
        createArtifact: vi.fn(async ({ providerResponse }) => ({
          id: `summary-artifact-${testId}`,
          type: SUMMARY_ARTIFACT_TYPE,
          owner: SUMMARIZER_AGENT_ID,
          summary: `Summary generated for ${input.language} text.`,
          payload: {
            summary: providerResponse.content,
            tokensUsed: getTokenUsage(providerResponse.metadata),
            model: getStringMetadata(providerResponse.metadata, 'model'),
            provider: getStringMetadata(providerResponse.metadata, 'provider'),
          } satisfies SummaryArtifactPayload,
        })),
      },
      artifactValidator: runnerArtifactValidator,
      logger,
    })

    const runResult = await runner.run({
      task,
      agentId: SUMMARIZER_AGENT_ID,
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
      agentId: SUMMARIZER_AGENT_ID,
      artifact: runResult.artifact,
      state,
    })

    expect(runResult.artifact.payload).toEqual<SummaryArtifactPayload>(expected)
    expect(providerExecute).toHaveBeenCalledTimes(1)
    expect(storedResult.kind).toBe('accepted')
    if (storedResult.kind !== 'accepted') {
      throw new Error('Summary artifact was rejected unexpectedly.')
    }

    expect(storedResult.artifact.payload).toEqual<SummaryArtifactPayload>(expected)
    expect(storedResult.artifact.metadata.ownerAgentId).toBe(SUMMARIZER_AGENT_ID)
  })
})

function isSummarizeTaskInput(value: unknown): value is SummarizeTaskInput {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as SummarizeTaskInput
  return (
    typeof candidate.text === 'string' &&
    typeof candidate.language === 'string' &&
    typeof candidate.maxLength === 'number'
  )
}

function getStringMetadata(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key]
  if (typeof value !== 'string') {
    throw new Error(`Expected provider metadata '${key}' to be a string.`)
  }
  return value
}

function getTokenUsage(metadata: Record<string, unknown> | undefined): number {
  const tokenUsage = metadata?.tokenUsage
  if (!tokenUsage || typeof tokenUsage !== 'object') {
    throw new Error('Expected provider metadata tokenUsage to be present.')
  }

  const totalTokens = (tokenUsage as { totalTokens?: unknown }).totalTokens
  if (typeof totalTokens !== 'number') {
    throw new Error('Expected provider metadata tokenUsage.totalTokens to be a number.')
  }

  return totalTokens
}
