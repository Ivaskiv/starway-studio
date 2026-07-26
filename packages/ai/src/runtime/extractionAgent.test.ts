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
  EXTRACTION_AGENT_CAPABILITY,
  EXTRACTION_AGENT_CONFIGURATION,
  EXTRACTION_AGENT_ID,
  EXTRACTION_ARTIFACT_TYPE,
  type ExtractionArtifactPayload,
  type ExtractionTaskInput,
} from './extractionAgent.js'

const EXPECTED_PROMPT = `Extract only information matching the schema.

Never invent fields.

Return valid JSON only.`

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function createTask(input: ExtractionTaskInput, testId: string): EngineeringTask {
  return {
    id: `extraction-task-${testId}`,
    description: 'Run the production extraction agent.',
    objective: 'Verify that the runtime pipeline returns valid structured JSON.',
    metadata: {
      input,
    },
  }
}

function createState(task: EngineeringTask): ExecutionStateSnapshot {
  return {
    task,
    status: 'running',
    currentAgentId: EXTRACTION_AGENT_ID,
    completedAgentIds: [],
    artifacts: [],
    notes: [],
    lastUpdatedAt: new Date(0).toISOString(),
  }
}

describe('ExtractionAgent', () => {
  it.each([
    {
      testId: 'address',
      input: {
        text: 'Our office is at 221B Baker Street, London.',
        schema: { type: 'object', properties: { address: { type: 'string' } }, required: ['address'] },
        rules: ['Extract the postal address only.'],
      },
      expectedData: { address: '221B Baker Street, London' },
    },
    {
      testId: 'email',
      input: {
        text: 'Write to hello@starway.app for details.',
        schema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
        rules: ['Extract one email only.'],
      },
      expectedData: { email: 'hello@starway.app' },
    },
    {
      testId: 'phone',
      input: {
        text: 'Call us at +380 67 123 45 67 tomorrow.',
        schema: { type: 'object', properties: { phone: { type: 'string' } }, required: ['phone'] },
        rules: ['Keep the phone number formatting from the source.'],
      },
      expectedData: { phone: '+380 67 123 45 67' },
    },
    {
      testId: 'date',
      input: {
        text: 'The session starts on August 5, 2026 at 19:00.',
        schema: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] },
        rules: ['Extract the date phrase only, without time.'],
      },
      expectedData: { date: 'August 5, 2026' },
    },
    {
      testId: 'multiple-entities',
      input: {
        text: 'Contact Anna at anna@starway.app or +380 50 555 11 22, meeting on September 1, 2026.',
        schema: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            phone: { type: 'string' },
            date: { type: 'string' },
          },
          required: ['email', 'phone', 'date'],
        },
        rules: ['Extract all entities present in the schema.'],
      },
      expectedData: {
        email: 'anna@starway.app',
        phone: '+380 50 555 11 22',
        date: 'September 1, 2026',
      },
    },
  ])('returns valid structured JSON for $testId', async ({ testId, input, expectedData }) => {
    const task = createTask(input, testId)
    const state = createState(task)

    const agentRegistry = new AgentRegistry({
      agents: [EXTRACTION_AGENT_CONFIGURATION],
      logger,
    })
    const agentDefinition = agentRegistry.getAgentById(EXTRACTION_AGENT_ID)

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
      expect(prompt.id).toBe('extraction-agent-prompt')
      expect(prompt.content.trim()).toBe(EXPECTED_PROMPT)
      expect(context.sourceOrder).toEqual(['task', 'runtime_state', 'prompt'])
      expect(context.task?.metadata).toEqual({ input })

      const extractionInput = context.task?.metadata?.input
      if (!isExtractionTaskInput(extractionInput)) {
        throw new Error('ExtractionAgent expected task metadata input to include text and schema.')
      }

      expect(extractionInput.text).toBe(input.text)
      expect(extractionInput.schema).toEqual(input.schema)
      expect(extractionInput.rules).toEqual(input.rules)

      return {
        content: JSON.stringify(expectedData),
        structuredOutput: expectedData,
        metadata: {
          provider: 'openai',
          model: 'runtime-extraction-model',
          tokenUsage: {
            totalTokens: 31,
          },
        },
      }
    })

    const providerRegistry = new ProviderRegistry({
      configuration: {
        selectedProvider: 'openai',
        selectedCapability: EXTRACTION_AGENT_CAPABILITY,
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
          [EXTRACTION_AGENT_CAPABILITY]: {
            preferred: {
              provider: 'openai',
              model: 'runtime-extraction-model',
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
          expect(selection.config.defaultModel).toBe('runtime-extraction-model')
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
          isRecord(artifact.payload.data) &&
          JSON.stringify(artifact.payload.data) === JSON.stringify(expectedData) &&
          artifact.payload.provider === 'openai' &&
          artifact.payload.model === 'runtime-extraction-model' &&
          artifact.payload.tokensUsed === 31,
        reason: 'Extraction artifact must contain valid JSON matching the expected schema output.',
      })),
    }

    const runner = new AgentRunner({
      agentDefinitions: [agentDefinition],
      promptRegistry,
      contextLoader,
      aiProvider: providerRegistry.getProvider(),
      artifactFactory: {
        createArtifact: vi.fn(async ({ providerResponse }) => ({
          id: `extraction-artifact-${testId}`,
          type: EXTRACTION_ARTIFACT_TYPE,
          owner: EXTRACTION_AGENT_ID,
          summary: `Extraction completed for ${testId}.`,
          payload: {
            data: getStructuredData(providerResponse),
            provider: getStringMetadata(providerResponse.metadata, 'provider'),
            model: getStringMetadata(providerResponse.metadata, 'model'),
            tokensUsed: getTokenUsage(providerResponse.metadata),
          } satisfies ExtractionArtifactPayload,
        })),
      },
      artifactValidator: runnerArtifactValidator,
      logger,
    })

    const runResult = await runner.run({
      task,
      agentId: EXTRACTION_AGENT_ID,
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
      agentId: EXTRACTION_AGENT_ID,
      artifact: runResult.artifact,
      state,
    })

    expect(runResult.artifact.payload).toEqual<ExtractionArtifactPayload>({
      data: expectedData,
      provider: 'openai',
      model: 'runtime-extraction-model',
      tokensUsed: 31,
    })
    expect(providerExecute).toHaveBeenCalledTimes(1)
    expect(storedResult.kind).toBe('accepted')
    if (storedResult.kind !== 'accepted') {
      throw new Error('Extraction artifact was rejected unexpectedly.')
    }

    expect(storedResult.artifact.payload).toEqual<ExtractionArtifactPayload>({
      data: expectedData,
      provider: 'openai',
      model: 'runtime-extraction-model',
      tokensUsed: 31,
    })
    expect(storedResult.artifact.metadata.ownerAgentId).toBe(EXTRACTION_AGENT_ID)
  })
})

function isExtractionTaskInput(value: unknown): value is ExtractionTaskInput {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as ExtractionTaskInput
  return (
    typeof candidate.text === 'string' &&
    isRecord(candidate.schema) &&
    (typeof candidate.rules === 'undefined' ||
      (Array.isArray(candidate.rules) && candidate.rules.every((rule) => typeof rule === 'string')))
  )
}

function getStructuredData(providerResponse: {
  structuredOutput?: Record<string, unknown>
  content?: string
}): Record<string, unknown> {
  if (providerResponse.structuredOutput && isRecord(providerResponse.structuredOutput)) {
    return providerResponse.structuredOutput
  }

  if (typeof providerResponse.content !== 'string') {
    throw new Error('Expected provider response content to contain valid JSON.')
  }

  const parsed = JSON.parse(providerResponse.content) as unknown
  if (!isRecord(parsed)) {
    throw new Error('Expected provider JSON output to be an object.')
  }

  return parsed
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
