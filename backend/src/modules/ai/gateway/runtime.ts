import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
AgentRunner,
ArtifactContextProvider,
ContextLoader,
DEFAULT_RUNTIME_PROMPT_SOURCES,
DeterministicContextMerger,
FileSystemPromptLoader,
InMemoryPromptCache,
InMemoryUsageLedgerStore,
PromptContextProvider,
PromptRegistry,
RuntimeContextValidator,
RuntimeStateContextProvider,
TaskContextProvider,
UsageLedger,
type AgentDefinition,
type EngineeringTask,
type ExecutionStateSnapshot,
type IAIProvider,
    type IPromptLoader,
    type PromptSourceDefinition,
    type PromptSourceOwnerId,
    type IRuntimeLogger,
    type PromptLoaderInput,
    } from '@starway/ai'
import {
AnthropicProvider,
GeminiProvider,
OllamaProvider,
OpenAIProvider,
OpenRouterProvider,
} from '@starway/ai/providers'
import {
ProviderFactory,
ProviderRegistry,
type ProviderConfiguration,
} from '@starway/ai/providers/registry'
import { prisma } from '../../../db/client.js'

import { resolveAiModel } from '../../../platform/ai.registry.js'
import type { ModelProvider } from '../../ai-assistant/promptCompiler.js'
import type { StrictTelegramIntent } from '../../telegram-mentor/services/strict-system.js'
import { CanonicalGatewayAgentRegistry } from '../agentRegistry.js'
import {
getNumberMetadata,
getStringMetadata,
getTokenUsage,
readAssistantResponse,
readStringArrayField,
readStringField,
} from './helpers.js'
import type {
AssistantArtifactPayload,
ClassificationArtifactPayload,
ClassificationTaskInput,
EchoArtifactPayload,
EchoTaskInput,
IRuntimeGatewayExecutor,
RuntimeGatewayExecutionInput,
RuntimeTelemetry,
TelegramAgentGatewayResult,
} from './types.js'
export class TelegramRuntimeExecutor implements IRuntimeGatewayExecutor {
  private readonly logger: IRuntimeLogger
  private readonly agentRunner: AgentRunner
  private readonly usageLedgerStore: InMemoryUsageLedgerStore
  private readonly registry: CanonicalGatewayAgentRegistry
  private readonly promptCache: InMemoryPromptCache

  constructor(
    logger: IRuntimeLogger,
    aiProvider: IAIProvider | undefined,
    registry: CanonicalGatewayAgentRegistry
  ) {
    this.logger = logger
    this.usageLedgerStore = new InMemoryUsageLedgerStore()
    this.registry = registry

    this.promptCache = new InMemoryPromptCache()
    const promptRegistry = new PromptRegistry({
      sources: buildGatewayPromptSources(),
      loader: new DatabaseBackedPromptLoader(),
      cache: this.promptCache,
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

    const artifactValidator = {
      validate: async ({
        artifact,
        task,
        agentDefinition,
      }: {
        artifact: { payload: Record<string, unknown> }
        task: EngineeringTask
        agentDefinition: AgentDefinition
      }) => {
        const registration = this.registry.getRegistrationByRuntimeAgentId(
          agentDefinition.id
        )

        if (registration.buildInputKind === 'echo') {
          const payload = artifact.payload as Partial<EchoArtifactPayload>
          const input = task.metadata?.input as
            | Partial<EchoTaskInput>
            | undefined
          return {
            valid:
              typeof payload.message === 'string' &&
              payload.message === input?.message,
            reason:
              'Echo artifact must return the original Telegram message unchanged.',
          }
        }

        if (registration.buildInputKind === 'assistant') {
          const payload = artifact.payload as Partial<AssistantArtifactPayload>
          return {
            valid:
              typeof payload.response === 'string' &&
              payload.response.trim().length > 0,
            reason: 'Assistant artifact must return a non-empty response.',
          }
        }

        const payload =
          artifact.payload as Partial<ClassificationArtifactPayload>
        const taskInput = task.metadata?.input as
          | Partial<ClassificationTaskInput>
          | undefined
        const allowedCategories = Array.isArray(taskInput?.categories)
          ? taskInput.categories
          : []

        if (!payload.category || typeof payload.category !== 'string') {
          return {
            valid: false,
            reason: 'Classification artifact is missing category.',
          }
        }

        if (
          !allowedCategories.includes(payload.category as StrictTelegramIntent)
        ) {
          return {
            valid: false,
            reason: `Classification artifact category '${payload.category}' is outside the allowed taxonomy.`,
          }
        }

        return { valid: true }
      },
    }

    this.agentRunner = new AgentRunner({
      agentDefinitions: this.registry.getAllAgentDefinitions(),
      promptRegistry,
      contextLoader,
      aiProvider: aiProvider ?? buildGatewayAiProvider(),
      artifactFactory: {
        createArtifact: async ({ providerResponse, task, agentDefinition }) => {
          const registration = this.registry.getRegistrationByRuntimeAgentId(
            agentDefinition.id
          )

          if (registration.buildInputKind === 'echo') {
            return {
              id: `echo-${task.id}`,
              type: registration.runtime.artifactType,
              owner: agentDefinition.id,
              summary: `Telegram echo generated for task '${task.id}'.`,
              payload: {
                message: providerResponse.content ?? '',
              },
            }
          }

          if (registration.buildInputKind === 'assistant') {
            return {
              id: `assistant-${task.id}`,
              type: registration.runtime.artifactType,
              owner: agentDefinition.id,
              summary: `Telegram assistant reply generated for task '${task.id}'.`,
              payload: {
                response: readAssistantResponse(providerResponse),
                suggestions: readStringArrayField(
                  providerResponse.structuredOutput,
                  'suggestions'
                ),
                followUp: readStringField(
                  providerResponse.structuredOutput,
                  'followUp'
                ),
                provider: getStringMetadata(
                  providerResponse.metadata,
                  'provider'
                ),
                model: getStringMetadata(providerResponse.metadata, 'model'),
                tokensUsed: getTokenUsage(providerResponse.metadata),
              },
            }
          }

          const taskInput = task.metadata?.input as
            | Partial<ClassificationTaskInput>
            | undefined
          return {
            id: `classification-${task.id}`,
            type: registration.runtime.artifactType,
            owner: agentDefinition.id,
            summary: `Telegram intent classified for task '${task.id}'.`,
            payload: {
              category: providerResponse.content ?? 'unknown',
              confidence: getNumberMetadata(
                providerResponse.metadata,
                'confidence'
              ),
              provider: getStringMetadata(
                providerResponse.metadata,
                'provider'
              ),
              model: getStringMetadata(providerResponse.metadata, 'model'),
              tokensUsed: getTokenUsage(providerResponse.metadata),
              allowedCategories: taskInput?.categories ?? [],
            },
          }
        },
      },
      artifactValidator,
      usageLedger: new UsageLedger(this.usageLedgerStore),
      logger,
    })
  }

  async execute(
    input: RuntimeGatewayExecutionInput
  ): Promise<TelegramAgentGatewayResult['artifact']> {
    const state = createExecutionState(input.task, input.agentDefinition.id)
    const runResult = await this.agentRunner.run({
      task: input.task,
      agentId: input.agentDefinition.id,
      state,
    })

    const telemetry = await this.readLatestTelemetry()
    return {
      ...runResult.artifact,
      metadata: {
        ...(runResult.artifact.metadata ?? {}),
        runtimeTelemetry: telemetry,
      },
    }
  }

  async invalidatePromptCache(): Promise<void> {
    await this.promptCache.clear()
  }

  private async readLatestTelemetry(): Promise<RuntimeTelemetry | null> {
    const entries = await this.usageLedgerStore.list()
    const latest = entries.at(-1)
    if (!latest) {
      return null
    }

    return {
      provider: latest.provider,
      model: latest.model,
      latency: latest.latency,
      promptTokens: latest.promptTokens,
      completionTokens: latest.completionTokens,
      cachedTokens: latest.cachedTokens,
      estimatedCost: latest.estimatedCost,
      actualCost: latest.actualCost,
      timestamp: latest.timestamp,
      user: latest.user,
    }
  }
}

export function resolveRepositoryPromptsDir(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../../prompts'
  )
}

export function buildGatewayPromptSources(): PromptSourceDefinition[] {
  const promptsDir = resolveRepositoryPromptsDir()
  const defaultSources = DEFAULT_RUNTIME_PROMPT_SOURCES.map((source) => ({
    ...source,
    filePath: path.join(promptsDir, path.basename(source.filePath)),
  }))
  const mentorPromptFilePath = path.join(promptsDir, 'mentor-agent-prompt.md')

  return [
    ...defaultSources,
    buildPromptAlias(
      'marketing-analyst-prompt',
      'marketing_analyst',
      path.resolve(promptsDir, '../docs/agents/ai-strategist/business-model-full.md')
    ),
    buildPromptAlias(
      'assistant-agent-prompt',
      'assistant_agent',
      path.resolve(promptsDir, '../docs/agents/ai-assistant-bot/00-SURGICAL-SYSTEM-UPDATE.md')
    ),
    buildPromptAlias(
      'content-agent-prompt',
      'content_agent',
      path.resolve(promptsDir, '../docs/agents/ai-content/dna-content-generator-offer.md')
    ),
    buildPromptAlias(
      'trend-radar-prompt',
      'trend_radar',
      path.resolve(promptsDir, '../docs/agents/ai-content/SKILL-output-engine.md')
    ),
    buildPromptAlias(
      'sales-agent-prompt',
      'sales_agent',
      path.resolve(promptsDir, '../docs/agents/ai-seller/ai-seller-system-prompt.md')
    ),
    buildPromptAlias(
      'funnel-agent-prompt',
      'funnel_agent',
      path.resolve(promptsDir, '../docs/agents/ai-funnel-assistant/README.md')
    ),
    buildPromptAlias(
      'zoom-recap-prompt',
      'zoom_recap',
      path.resolve(promptsDir, '../docs/agents/ai-mentor/focus-course-materials.md')
    ),
    buildPromptAlias(
      'coach-agent-prompt',
      'coach_agent',
      path.resolve(promptsDir, '../docs/client/svoia-nadya/SKILL-coach.md')
    ),
  ]
}

function buildPromptAlias(
  id: string,
  ownerAgentId: PromptSourceOwnerId,
  filePath: string
): PromptSourceDefinition {
  return {
    id,
    version: '1.0.0',
    filePath,
    ownerAgentIds: [ownerAgentId],
    canonical: true,
    defaultVersion: true,
  }
}

class DatabaseBackedPromptLoader implements IPromptLoader {
  private readonly fallback = new FileSystemPromptLoader()

  async load(input: PromptLoaderInput): Promise<string> {
    const activePrompt = await prisma.promptVersion.findFirst({
      where: {
        name: input.source.id,
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        content: true,
      },
    })

    if (activePrompt?.content.trim()) {
      return activePrompt.content
    }

    return this.fallback.load(input)
  }
}

export function createExecutionState(
  task: EngineeringTask,
  agentId: AgentDefinition['id']
): ExecutionStateSnapshot {
  return {
    task,
    status: 'running',
    currentAgentId: agentId,
    completedAgentIds: [],
    artifacts: [],
    notes: [],
    lastUpdatedAt: new Date().toISOString(),
  }
}

function resolveGatewayProviderId():
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'ollama'
  | 'openrouter' {
  const raw = String(process.env.TELEGRAM_AGENT_GATEWAY_PROVIDER ?? 'openai')
    .trim()
    .toLowerCase()
  if (
    raw === 'anthropic' ||
    raw === 'gemini' ||
    raw === 'ollama' ||
    raw === 'openrouter'
  ) {
    return raw
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'ollama'
  }

  return 'openai'
}

function buildGatewayProviderConfiguration(
  preferredProvider?: ModelProvider
): ProviderConfiguration {
  return {
    selectedProvider: resolveCanonicalProviderId(preferredProvider),
    providers: {
      anthropic: {
        config: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          defaultModel:
            process.env.TELEGRAM_AGENT_GATEWAY_ANTHROPIC_MODEL ??
            'claude-sonnet-4-5',
        },
      },
      gemini: {
        config: {
          apiKey:
            process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY,
          defaultModel:
            process.env.TELEGRAM_AGENT_GATEWAY_GEMINI_MODEL ??
            'gemini-2.5-flash',
        },
      },
      ollama: {
        config: {
          baseUrl: process.env.OLLAMA_BASE_URL,
          defaultModel:
            process.env.TELEGRAM_AGENT_GATEWAY_OLLAMA_MODEL ?? 'qwen3:latest',
          timeoutMs: 120_000,
        },
      },
      openrouter: {
        config: {
          apiKey: process.env.OPENROUTER_API_KEY,
          defaultModel:
            process.env.TELEGRAM_AGENT_GATEWAY_OPENROUTER_MODEL ??
            resolveAiModel('telegram_intelligence'),
        },
      },
      openai: {
        config: {
          apiKey: process.env.OPENAI_API_KEY,
          defaultModel:
            process.env.TELEGRAM_AGENT_GATEWAY_OPENAI_MODEL ??
            resolveAiModel('telegram_intelligence'),
        },
      },
    },
  }
}

export function buildGatewayAiProvider(
  logger?: IRuntimeLogger,
  preferredProvider?: ModelProvider
): IAIProvider {
  const registry = new ProviderRegistry({
    configuration: buildGatewayProviderConfiguration(preferredProvider),
    factory: new ProviderFactory({
      creators: {
        openai: (config) => new OpenAIProvider(config),
        anthropic: (config) => new AnthropicProvider(config),
        gemini: (config) => new GeminiProvider(config),
        ollama: (config) => new OllamaProvider(config),
        openrouter: (config) => new OpenRouterProvider(config),
      },
      logger,
    }),
    logger,
  })
  return registry.getProvider()
}

export function resolveCanonicalProviderId(
  preferredProvider?: ModelProvider
): ProviderConfiguration['selectedProvider'] {
  if (preferredProvider === 'claude') return 'anthropic'
  if (preferredProvider === 'gemini') return 'gemini'
  if (preferredProvider === 'gpt') return 'openai'
  return resolveGatewayProviderId()
}
