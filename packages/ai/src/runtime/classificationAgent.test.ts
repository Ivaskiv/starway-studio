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
  CLASSIFICATION_AGENT_CAPABILITY,
  CLASSIFICATION_AGENT_CONFIGURATION,
  CLASSIFICATION_AGENT_ID,
  CLASSIFICATION_ARTIFACT_TYPE,
  type ClassificationArtifactPayload,
  type ClassificationTaskInput,
} from './classificationAgent.js'

const EXPECTED_PROMPT = `Classify the input.

Rules:

Return ONLY one category.

Choose ONLY from allowedCategories.

Never invent categories.

Never explain.`

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function createTask(input: ClassificationTaskInput, testId: string): EngineeringTask {
  return {
    id: `classification-task-${testId}`,
    description: 'Run the production classification agent.',
    objective: 'Verify that the runtime pipeline returns one allowed category.',
    metadata: {
      input,
    },
  }
}

function createState(task: EngineeringTask): ExecutionStateSnapshot {
  return {
    task,
    status: 'running',
    currentAgentId: CLASSIFICATION_AGENT_ID,
    completedAgentIds: [],
    artifacts: [],
    notes: [],
    lastUpdatedAt: new Date(0).toISOString(),
  }
}

describe('ClassificationAgent', () => {
  it.each([
    {
      testId: 'positive-en',
      input: {
        text: 'I feel optimistic and ready to move forward.',
        categories: ['positive', 'negative', 'neutral'],
      },
      expected: {
        category: 'positive',
        confidence: 0.93,
        provider: 'openai',
        model: 'runtime-classification-model',
        tokensUsed: 21,
      },
    },
    {
      testId: 'negative-en',
      input: {
        text: 'Everything feels heavy and I do not want to continue today.',
        categories: ['positive', 'negative', 'neutral'],
      },
      expected: {
        category: 'negative',
        confidence: 0.91,
        provider: 'openai',
        model: 'runtime-classification-model',
        tokensUsed: 24,
      },
    },
    {
      testId: 'many-categories',
      input: {
        text: 'Please send me pricing and payment details.',
        categories: ['support', 'sales', 'feedback', 'other'],
        instructions: 'Prefer sales when the user asks about packages or payment.',
      },
      expected: {
        category: 'sales',
        confidence: 0.88,
        provider: 'openai',
        model: 'runtime-classification-model',
        tokensUsed: 29,
      },
    },
    {
      testId: 'unknown-input',
      input: {
        text: '......',
        categories: ['known', 'unknown', 'other'],
      },
      expected: {
        category: 'unknown',
        confidence: 0.67,
        provider: 'openai',
        model: 'runtime-classification-model',
        tokensUsed: 16,
      },
    },
    {
      testId: 'ukrainian',
      input: {
        text: 'Я хочу записатися на практику і дізнатися ціну.',
        categories: ['підтримка', 'продаж', 'інше'],
      },
      expected: {
        category: 'продаж',
        confidence: 0.9,
        provider: 'openai',
        model: 'runtime-classification-model',
        tokensUsed: 27,
      },
    },
    {
      testId: 'english',
      input: {
        text: 'Can you help me reset my access?',
        categories: ['support', 'sales', 'other'],
      },
      expected: {
        category: 'support',
        confidence: 0.89,
        provider: 'openai',
        model: 'runtime-classification-model',
        tokensUsed: 19,
      },
    },
  ])('returns one allowed category for $testId', async ({ testId, input, expected }) => {
    const task = createTask(input, testId)
    const state = createState(task)

    const agentRegistry = new AgentRegistry({
      agents: [CLASSIFICATION_AGENT_CONFIGURATION],
      logger,
    })
    const agentDefinition = agentRegistry.getAgentById(CLASSIFICATION_AGENT_ID)

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
      expect(prompt.id).toBe('classification-agent-prompt')
      expect(prompt.content.trim()).toBe(EXPECTED_PROMPT)
      expect(context.sourceOrder).toEqual(['task', 'runtime_state', 'prompt'])
      expect(context.task?.metadata).toEqual({
        input,
      })

      const classificationInput = context.task?.metadata?.input
      if (!isClassificationTaskInput(classificationInput)) {
        throw new Error('ClassificationAgent expected task metadata input to include text and categories.')
      }

      expect(classificationInput.text).toBe(input.text)
      expect(classificationInput.categories).toEqual(input.categories)
      expect(classificationInput.instructions).toBe(input.instructions)
      expect(classificationInput.categories).toContain(expected.category)

      return {
        content: expected.category,
        metadata: {
          provider: expected.provider,
          model: expected.model,
          confidence: expected.confidence,
          tokenUsage: {
            totalTokens: expected.tokensUsed,
          },
        },
      }
    })

    const providerRegistry = new ProviderRegistry({
      configuration: {
        selectedProvider: 'openai',
        selectedCapability: CLASSIFICATION_AGENT_CAPABILITY,
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
          [CLASSIFICATION_AGENT_CAPABILITY]: {
            preferred: {
              provider: 'openai',
              model: 'runtime-classification-model',
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
          expect(selection.config.defaultModel).toBe('runtime-classification-model')
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
          artifact.payload.category === expected.category &&
          artifact.payload.confidence === expected.confidence &&
          artifact.payload.model === expected.model &&
          artifact.payload.provider === expected.provider &&
          artifact.payload.tokensUsed === expected.tokensUsed,
        reason: 'Classification artifact fields must match the provider output exactly.',
      })),
    }

    const runner = new AgentRunner({
      agentDefinitions: [agentDefinition],
      promptRegistry,
      contextLoader,
      aiProvider: providerRegistry.getProvider(),
      artifactFactory: {
        createArtifact: vi.fn(async ({ providerResponse }) => ({
          id: `classification-artifact-${testId}`,
          type: CLASSIFICATION_ARTIFACT_TYPE,
          owner: CLASSIFICATION_AGENT_ID,
          summary: `Classification generated for ${testId}.`,
          payload: {
            category: providerResponse.content,
            confidence: getNumberMetadata(providerResponse.metadata, 'confidence'),
            provider: getStringMetadata(providerResponse.metadata, 'provider'),
            model: getStringMetadata(providerResponse.metadata, 'model'),
            tokensUsed: getTokenUsage(providerResponse.metadata),
          } satisfies ClassificationArtifactPayload,
        })),
      },
      artifactValidator: runnerArtifactValidator,
      logger,
    })

    const runResult = await runner.run({
      task,
      agentId: CLASSIFICATION_AGENT_ID,
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
      agentId: CLASSIFICATION_AGENT_ID,
      artifact: runResult.artifact,
      state,
    })

    expect(runResult.artifact.payload).toEqual<ClassificationArtifactPayload>(expected)
    expect(providerExecute).toHaveBeenCalledTimes(1)
    expect(storedResult.kind).toBe('accepted')
    if (storedResult.kind !== 'accepted') {
      throw new Error('Classification artifact was rejected unexpectedly.')
    }

    expect(storedResult.artifact.payload).toEqual<ClassificationArtifactPayload>(expected)
    expect(storedResult.artifact.metadata.ownerAgentId).toBe(CLASSIFICATION_AGENT_ID)
  })
})

function isClassificationTaskInput(value: unknown): value is ClassificationTaskInput {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as ClassificationTaskInput
  return (
    typeof candidate.text === 'string' &&
    Array.isArray(candidate.categories) &&
    candidate.categories.every((category) => typeof category === 'string') &&
    (typeof candidate.instructions === 'undefined' || typeof candidate.instructions === 'string')
  )
}

function getStringMetadata(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key]
  if (typeof value !== 'string') {
    throw new Error(`Expected provider metadata '${key}' to be a string.`)
  }
  return value
}

function getNumberMetadata(metadata: Record<string, unknown> | undefined, key: string): number {
  const value = metadata?.[key]
  if (typeof value !== 'number') {
    throw new Error(`Expected provider metadata '${key}' to be a number.`)
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
