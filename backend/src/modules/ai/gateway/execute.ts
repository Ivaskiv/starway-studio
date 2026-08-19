import {
AgentRunner,
type AgentDefinition,
type AIProviderResponse,
type EngineeringTask,
type PromptMetadata,
} from '@starway/ai'
import { CanonicalGatewayAgentRegistry } from '../agentRegistry.js'
import {
getStringMetadata,
getTokenUsage,
NoopRuntimeLogger,
} from './helpers.js'
import { buildGatewayAiProvider,createExecutionState } from './runtime.js'
import type {
CanonicalPromptAgentExecutionInput,
CanonicalPromptAgentExecutionResult,
} from './types.js'
export async function executeCanonicalPromptAgent(
  input: CanonicalPromptAgentExecutionInput
): Promise<CanonicalPromptAgentExecutionResult> {
  const logger = new NoopRuntimeLogger()
  const registry = new CanonicalGatewayAgentRegistry(logger)
  const registration = registry.getRegistrationByKey(input.agentKey)
  const agentDefinition = registry.getAgentDefinition(registration)
  const promptMetadata: PromptMetadata = {
    execution: {
      userPrompt: input.userPrompt,
      strategyTier: input.strategyTier,
      contentType: input.contentType,
    },
  }
  const task: EngineeringTask = {
    id:
      input.taskId ??
      `sales-assistant:${input.agentKey}:${input.userId ?? 'anonymous'}:${Date.now()}`,
    description:
      input.taskDescription ??
      `Execute canonical ${input.agentKey} agent for sales assistant generation.`,
    objective:
      input.objective ??
      'Return one canonical content artifact for the sales assistant request.',
    metadata: {
      userId: input.userId ?? null,
      contentType: input.contentType,
      ...(input.taskMetadata ?? {}),
    },
  }
  const runner = new AgentRunner({
    agentDefinitions: [agentDefinition],
    promptRegistry: {
      resolvePrompt: async () => ({
        id: agentDefinition.promptId,
        version: 'sales-assistant-canonical-v1',
        content: input.systemPrompt,
        metadata: promptMetadata,
      }),
    },
    contextLoader: {
      loadContext: async () => ({
        summary: input.contextSummary?.trim() || input.userPrompt,
        sourceOrder: ['task', 'prompt'],
        task: {
          id: task.id,
          description: task.description,
          objective: task.objective,
          metadata: task.metadata,
        },
        prompt: {
          id: agentDefinition.promptId,
          version: 'sales-assistant-canonical-v1',
        },
        metadata: {
          contentType: input.contentType,
        },
      }),
    },
    aiProvider: buildGatewayAiProvider(logger, input.preferredProvider),
    artifactFactory: {
      createArtifact: async ({
        providerResponse,
        task: activeTask,
        agentDefinition: activeAgent,
      }) =>
        createCanonicalPromptArtifact({
          providerResponse,
          task: activeTask,
          agentDefinition: activeAgent,
        }),
    },
    artifactValidator: {
      validate: async ({ artifact }) => ({
        valid:
          typeof (artifact.payload as { response?: unknown }).response ===
            'string' &&
          (artifact.payload as { response?: string }).response!.trim().length >
            0,
        reason: 'Canonical prompt artifact must return a non-empty response.',
      }),
    },
    logger,
  })

  const runResult = await runner.run({
    task,
    agentId: agentDefinition.id,
    state: createExecutionState(task, agentDefinition.id),
  })

  const payload = runResult.artifact.payload as { response?: string }
  return {
    content: payload.response ?? '',
    metadata: runResult.artifact.metadata,
  }
}

function createCanonicalPromptArtifact(input: {
  providerResponse: AIProviderResponse
  task: EngineeringTask
  agentDefinition: AgentDefinition
}) {
  return {
    id: `canonical-prompt-${input.task.id}`,
    type: input.agentDefinition.artifactType,
    owner: input.agentDefinition.id,
    summary: `Canonical prompt execution generated for task '${input.task.id}'.`,
    payload: {
      response: input.providerResponse.content ?? '',
      provider: getStringMetadata(input.providerResponse.metadata, 'provider'),
      model: getStringMetadata(input.providerResponse.metadata, 'model'),
      tokensUsed: getTokenUsage(input.providerResponse.metadata),
    },
    metadata: {
      providerResponse: input.providerResponse.metadata ?? {},
    },
  }
}
