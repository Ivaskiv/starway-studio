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
  PLAN_ARTIFACT_TYPE,
  PLANNING_AGENT_CAPABILITY,
  PLANNING_AGENT_CONFIGURATION,
  PLANNING_AGENT_ID,
  type PlanningTaskInput,
  type PlanArtifactPayload,
} from './planningAgent.js'

const EXPECTED_PROMPT = `Create a structured execution plan.

Requirements

Clear

Ordered

Actionable

No hallucinations`

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function createTask(input: PlanningTaskInput, testId: string): EngineeringTask {
  return {
    id: `planning-task-${testId}`,
    description: 'Run the production planning agent.',
    objective: 'Verify that the runtime pipeline returns a structured plan.',
    metadata: { input },
  }
}

function createState(task: EngineeringTask): ExecutionStateSnapshot {
  return {
    task,
    status: 'running',
    currentAgentId: PLANNING_AGENT_ID,
    completedAgentIds: [],
    artifacts: [],
    notes: [],
    lastUpdatedAt: new Date(0).toISOString(),
  }
}

describe('PlanningAgent', () => {
  it.each([
    {
      testId: 'simple-goal',
      input: {
        goal: 'Launch the weekly summary email.',
        constraints: ['Use existing content', 'Finish this week'],
        history: ['Draft outline approved'],
        context: 'Email is sent every Friday.',
      },
      expected: {
        steps: [
          'Review the approved outline and confirm the Friday send window.',
          'Assemble the weekly content from existing materials.',
          'Prepare and validate the email before scheduling the send.',
        ],
        assumptions: ['The approved outline is still current.'],
        risks: ['Existing content may require minor editing before send.'],
        provider: 'openai',
        model: 'runtime-planning-model',
      },
    },
    {
      testId: 'complex-goal',
      input: {
        goal: 'Prepare a launch plan for the new onboarding flow.',
        constraints: ['No backend changes', 'Use current design system', 'Complete in two sprints'],
        history: ['Current funnel audit completed', 'Key blockers documented'],
        context: 'The team needs a phased rollout with validation after each milestone.',
      },
      expected: {
        steps: [
          'Break the onboarding launch into phased milestones aligned to the two-sprint limit.',
          'Map each milestone to current design-system components and frontend-only changes.',
          'Define validation checks after every milestone before moving to the next phase.',
        ],
        assumptions: ['The existing design system covers the needed onboarding screens.'],
        risks: ['Frontend-only constraints may limit some onboarding improvements.'],
        provider: 'openai',
        model: 'runtime-planning-model',
      },
    },
    {
      testId: 'empty-history',
      input: {
        goal: 'Create a plan for the first customer interview.',
        constraints: ['Keep it simple', 'Need it today'],
        history: [],
        context: 'No previous interviews have been conducted.',
      },
      expected: {
        steps: [
          'Define the interview goal and the core questions for today.',
          'Prepare a lightweight interview script and logistics.',
          'Run the interview and capture immediate follow-up notes.',
        ],
        assumptions: ['A customer is available for an interview today.'],
        risks: ['Limited preparation time may reduce question depth.'],
        provider: 'openai',
        model: 'runtime-planning-model',
      },
    },
    {
      testId: 'large-context',
      input: {
        goal: 'Plan the migration of the help center content.',
        constraints: ['Do not rewrite content', 'Preserve URLs', 'Reduce publishing risk'],
        history: ['Content inventory completed', 'Priority pages identified', 'Stakeholders approved migration scope'],
        context:
          'The help center includes onboarding, billing, troubleshooting, and policy content. The migration must preserve discoverability, avoid broken links, and keep support volume stable during the transition.',
      },
      expected: {
        steps: [
          'Sequence the migration by priority pages and preserve the approved scope.',
          'Map existing URLs and content destinations before publishing any moved pages.',
          'Validate discoverability and support impact after each migration batch.',
        ],
        assumptions: ['The current content inventory is complete enough for sequencing.'],
        risks: ['Broken links could increase support volume during the transition.'],
        provider: 'openai',
        model: 'runtime-planning-model',
      },
    },
  ])('returns a structured plan for $testId', async ({ testId, input, expected }) => {
    const task = createTask(input, testId)
    const state = createState(task)

    const agentRegistry = new AgentRegistry({
      agents: [PLANNING_AGENT_CONFIGURATION],
      logger,
    })
    const agentDefinition = agentRegistry.getAgentById(PLANNING_AGENT_ID)

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
      expect(prompt.id).toBe('planning-agent-prompt')
      expect(prompt.content.trim()).toBe(EXPECTED_PROMPT)
      expect(context.sourceOrder).toEqual(['task', 'runtime_state', 'prompt'])
      expect(context.task?.metadata).toEqual({ input })

      const planningInput = context.task?.metadata?.input
      if (!isPlanningTaskInput(planningInput)) {
        throw new Error('PlanningAgent expected task metadata input to include goal and constraints.')
      }

      expect(planningInput.goal).toBe(input.goal)
      expect(planningInput.constraints).toEqual(input.constraints)
      expect(planningInput.history).toEqual(input.history)
      expect(planningInput.context).toBe(input.context)

      return {
        content: JSON.stringify({
          steps: expected.steps,
          assumptions: expected.assumptions,
          risks: expected.risks,
        }),
        structuredOutput: {
          steps: expected.steps,
          assumptions: expected.assumptions,
          risks: expected.risks,
        },
        metadata: {
          provider: expected.provider,
          model: expected.model,
        },
      }
    })

    const providerRegistry = new ProviderRegistry({
      configuration: {
        selectedProvider: 'openai',
        selectedCapability: PLANNING_AGENT_CAPABILITY,
        providers: {
          openai: {
            config: { apiKey: 'test-openai-key' },
          },
          anthropic: {
            config: { apiKey: 'test-anthropic-key' },
          },
        },
        capabilityMappings: {
          [PLANNING_AGENT_CAPABILITY]: {
            preferred: {
              provider: 'openai',
              model: 'runtime-planning-model',
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
          expect(selection.config.defaultModel).toBe('runtime-planning-model')
          return { execute: providerExecute }
        }),
      },
      logger,
    })

    const runnerArtifactValidator: IRunnerArtifactValidator = {
      validate: vi.fn(async ({ artifact }) => ({
        valid:
          Array.isArray(artifact.payload.steps) &&
          Array.isArray(artifact.payload.assumptions) &&
          Array.isArray(artifact.payload.risks) &&
          artifact.payload.provider === expected.provider &&
          artifact.payload.model === expected.model,
        reason: 'Plan artifact must include structured arrays and provider metadata.',
      })),
    }

    const runner = new AgentRunner({
      agentDefinitions: [agentDefinition],
      promptRegistry,
      contextLoader,
      aiProvider: providerRegistry.getProvider(),
      artifactFactory: {
        createArtifact: vi.fn(async ({ providerResponse }) => ({
          id: `plan-artifact-${testId}`,
          type: PLAN_ARTIFACT_TYPE,
          owner: PLANNING_AGENT_ID,
          summary: `Plan generated for ${testId}.`,
          payload: {
            steps: getStringArrayField(providerResponse.structuredOutput, 'steps'),
            assumptions: getStringArrayField(providerResponse.structuredOutput, 'assumptions'),
            risks: getStringArrayField(providerResponse.structuredOutput, 'risks'),
            provider: getStringMetadata(providerResponse.metadata, 'provider'),
            model: getStringMetadata(providerResponse.metadata, 'model'),
          } satisfies PlanArtifactPayload,
        })),
      },
      artifactValidator: runnerArtifactValidator,
      logger,
    })

    const runResult = await runner.run({
      task,
      agentId: PLANNING_AGENT_ID,
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
      agentId: PLANNING_AGENT_ID,
      artifact: runResult.artifact,
      state,
    })

    expect(runResult.artifact.payload).toEqual<PlanArtifactPayload>(expected)
    expect(providerExecute).toHaveBeenCalledTimes(1)
    expect(storedResult.kind).toBe('accepted')
    if (storedResult.kind !== 'accepted') {
      throw new Error('Plan artifact was rejected unexpectedly.')
    }

    expect(storedResult.artifact.payload).toEqual<PlanArtifactPayload>(expected)
    expect(storedResult.artifact.metadata.ownerAgentId).toBe(PLANNING_AGENT_ID)
  })
})

function isPlanningTaskInput(value: unknown): value is PlanningTaskInput {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as PlanningTaskInput
  return (
    typeof candidate.goal === 'string' &&
    Array.isArray(candidate.constraints) &&
    candidate.constraints.every((constraint) => typeof constraint === 'string') &&
    (typeof candidate.history === 'undefined' ||
      (Array.isArray(candidate.history) && candidate.history.every((item) => typeof item === 'string'))) &&
    (typeof candidate.context === 'undefined' || typeof candidate.context === 'string')
  )
}

function getStringMetadata(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key]
  if (typeof value !== 'string') {
    throw new Error(`Expected provider metadata '${key}' to be a string.`)
  }
  return value
}

function getStringArrayField(
  value: Record<string, unknown> | undefined,
  field: 'steps' | 'assumptions' | 'risks',
): string[] {
  const result = value?.[field]
  if (!Array.isArray(result) || !result.every((item) => typeof item === 'string')) {
    throw new Error(`Expected structured output field '${field}' to be a string array.`)
  }
  return result
}
