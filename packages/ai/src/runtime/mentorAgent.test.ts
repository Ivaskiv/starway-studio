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
  MENTOR_AGENT_CAPABILITY,
  MENTOR_AGENT_CONFIGURATION,
  MENTOR_AGENT_ID,
  MENTOR_RESPONSE_ARTIFACT_TYPE,
  type MentorResponseArtifactPayload,
  type MentorTaskInput,
} from './mentorAgent.js'

const EXPECTED_PROMPT = `You are the Starway mentor agent.

Respond with grounded coaching guidance based only on the provided user context and conversation context.

Requirements:

- be supportive and concrete

- do not invent facts

- keep suggestions actionable

- include one clear follow-up`

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function createTask(input: MentorTaskInput, testId: string): EngineeringTask {
  return {
    id: `mentor-task-${testId}`,
    description: 'Run the Starway mentor agent through Runtime.',
    objective: 'Verify that mentoring responses are assembled by the runtime pipeline.',
    metadata: { input },
  }
}

function createState(task: EngineeringTask): ExecutionStateSnapshot {
  return {
    task,
    status: 'running',
    currentAgentId: MENTOR_AGENT_ID,
    completedAgentIds: [],
    artifacts: [],
    notes: [],
    lastUpdatedAt: new Date(0).toISOString(),
  }
}

describe('MentorAgent', () => {
  it.each([
    {
      testId: 'focus-reset',
      input: {
        userMessage: 'Я знову відклала важливу розмову і тепер почуваюся винною.',
        userContext: {
          profile: { name: 'Vira', language: 'uk' },
          subscription: { product: 'FOCUS', status: 'active' },
          progress: { completedPractices: 2, streakDays: 3 },
        },
        conversationContext: {
          history: ['Минулого тижня користувачка хотіла повернутися до складної розмови.'],
          journal: ['Найважче почати, коли боюся конфлікту.'],
        },
        goals: ['Провести складну розмову цього тижня'],
        wheel: { communication: 4, energy: 6 },
      } satisfies MentorTaskInput,
      expected: {
        response: 'Ти вже бачиш, де саме зупиняєшся, і це хороший початок. Спробуй зменшити тиск: не вирішити все одразу, а визначити перший крок до цієї розмови сьогодні.',
        suggestions: [
          'Запиши одну фразу, з якої почнеш розмову.',
          'Признач 10 хвилин сьогодні, щоб підготуватися без відволікань.',
        ],
        followUp: 'Який найменший крок до цієї розмови ти готова зробити сьогодні?',
        provider: 'openai',
        model: 'runtime-mentor-model',
        tokensUsed: 42,
      },
    },
    {
      testId: 'energy-support',
      input: {
        userMessage: 'I feel scattered and I cannot keep momentum this week.',
        userContext: {
          profile: { name: 'Anna', language: 'en' },
          subscription: { product: 'FOCUS', status: 'active' },
          progress: { completedPractices: 1, streakDays: 0 },
        },
        conversationContext: {
          history: ['The user wanted a simpler routine after a busy week.'],
          journal: ['Too many parallel tasks make it hard to focus.'],
        },
        goals: ['Rebuild a stable daily rhythm'],
        wheel: { focus: 3, recovery: 5 },
      } satisfies MentorTaskInput,
      expected: {
        response: 'You do not need a perfect week to regain momentum. Start by narrowing your attention to one stabilizing action that makes the rest of the day easier.',
        suggestions: [
          'Choose one anchor task for tomorrow morning.',
          'Remove one non-essential task from this week’s list.',
        ],
        followUp: 'What single anchor action would help you feel more steady tomorrow?',
        provider: 'openai',
        model: 'runtime-mentor-model',
        tokensUsed: 37,
      },
    },
  ])('returns a grounded mentor response for $testId', async ({ testId, input, expected }) => {
    const task = createTask(input, testId)
    const state = createState(task)

    const agentRegistry = new AgentRegistry({
      agents: [MENTOR_AGENT_CONFIGURATION],
      logger,
    })
    const agentDefinition = agentRegistry.getAgentById(MENTOR_AGENT_ID)

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
      expect(prompt.id).toBe('mentor-agent-prompt')
      expect(prompt.content.trim()).toBe(EXPECTED_PROMPT)
      expect(context.sourceOrder).toEqual(['task', 'runtime_state', 'prompt'])
      expect(context.task?.metadata).toEqual({ input })

      const mentorInput = context.task?.metadata?.input
      if (!isMentorTaskInput(mentorInput)) {
        throw new Error('MentorAgent expected task metadata input to include user message and mentoring context.')
      }

      expect(mentorInput.userMessage).toBe(input.userMessage)
      expect(mentorInput.goals).toEqual(input.goals)
      expect(mentorInput.userContext).toEqual(input.userContext)
      expect(mentorInput.conversationContext).toEqual(input.conversationContext)
      expect(mentorInput.wheel).toEqual(input.wheel)

      return {
        content: expected.response,
        structuredOutput: {
          response: expected.response,
          suggestions: expected.suggestions,
          followUp: expected.followUp,
        },
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
        selectedCapability: MENTOR_AGENT_CAPABILITY,
        providers: {
          openai: {
            config: { apiKey: 'test-openai-key' },
          },
          anthropic: {
            config: { apiKey: 'test-anthropic-key' },
          },
        },
        capabilityMappings: {
          [MENTOR_AGENT_CAPABILITY]: {
            preferred: {
              provider: 'openai',
              model: 'runtime-mentor-model',
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
          expect(selection.config.defaultModel).toBe('runtime-mentor-model')
          return { execute: providerExecute }
        }),
      },
      logger,
    })

    const runnerArtifactValidator: IRunnerArtifactValidator = {
      validate: vi.fn(async ({ artifact }) => ({
        valid:
          typeof artifact.payload.response === 'string' &&
          Array.isArray(artifact.payload.suggestions) &&
          typeof artifact.payload.followUp === 'string' &&
          artifact.payload.provider === expected.provider &&
          artifact.payload.model === expected.model &&
          artifact.payload.tokensUsed === expected.tokensUsed,
        reason: 'Mentor response artifact must include response, suggestions, followUp, and provider metadata.',
      })),
    }

    const runner = new AgentRunner({
      agentDefinitions: [agentDefinition],
      promptRegistry,
      contextLoader,
      aiProvider: providerRegistry.getProvider(),
      artifactFactory: {
        createArtifact: vi.fn(async ({ providerResponse }) => ({
          id: `mentor-response-artifact-${testId}`,
          type: MENTOR_RESPONSE_ARTIFACT_TYPE,
          owner: MENTOR_AGENT_ID,
          summary: `Mentor response generated for ${testId}.`,
          payload: {
            response: getStringField(providerResponse.structuredOutput, 'response'),
            suggestions: getStringArrayField(providerResponse.structuredOutput, 'suggestions'),
            followUp: getStringField(providerResponse.structuredOutput, 'followUp'),
            provider: getStringMetadata(providerResponse.metadata, 'provider'),
            model: getStringMetadata(providerResponse.metadata, 'model'),
            tokensUsed: getTokenUsage(providerResponse.metadata),
          } satisfies MentorResponseArtifactPayload,
        })),
      },
      artifactValidator: runnerArtifactValidator,
      logger,
    })

    const runResult = await runner.run({
      task,
      agentId: MENTOR_AGENT_ID,
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
      agentId: MENTOR_AGENT_ID,
      artifact: runResult.artifact,
      state,
    })

    expect(runResult.artifact.payload).toEqual<MentorResponseArtifactPayload>(expected)
    expect(providerExecute).toHaveBeenCalledTimes(1)
    expect(storedResult.kind).toBe('accepted')
    if (storedResult.kind !== 'accepted') {
      throw new Error('Mentor response artifact was rejected unexpectedly.')
    }

    expect(storedResult.artifact.payload).toEqual<MentorResponseArtifactPayload>(expected)
    expect(storedResult.artifact.metadata.ownerAgentId).toBe(MENTOR_AGENT_ID)
  })
})

function isMentorTaskInput(value: unknown): value is MentorTaskInput {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as MentorTaskInput
  return (
    typeof candidate.userMessage === 'string' &&
    Array.isArray(candidate.goals) &&
    candidate.goals.every((goal) => typeof goal === 'string') &&
    isRecord(candidate.userContext) &&
    isRecord(candidate.conversationContext) &&
    isRecord(candidate.wheel)
  )
}

function getStringField(
  value: Record<string, unknown> | undefined,
  field: 'response' | 'followUp',
): string {
  const result = value?.[field]
  if (typeof result !== 'string') {
    throw new Error(`Expected structured output field '${field}' to be a string.`)
  }
  return result
}

function getStringArrayField(
  value: Record<string, unknown> | undefined,
  field: 'suggestions',
): string[] {
  const result = value?.[field]
  if (!Array.isArray(result) || !result.every((item) => typeof item === 'string')) {
    throw new Error(`Expected structured output field '${field}' to be a string array.`)
  }
  return result
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
