import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AgentRunner,
  ArtifactContextProvider,
  ContextLoader,
  DeterministicContextMerger,
  FileSystemPromptLoader,
  InMemoryPromptCache,
  PromptContextProvider,
  PromptRegistry,
  RuntimeContextValidator,
  RuntimeStateContextProvider,
  TaskContextProvider,
  InMemoryUsageLedgerStore,
  UsageLedger,
  type AgentDefinition,
  type EngineeringTask,
  type ExecutionStateSnapshot,
  type IRuntimeLogger,
  type IAIProvider,
  DEFAULT_RUNTIME_PROMPT_SOURCES,
} from '@starway/ai'
import {
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  OllamaProvider,
  OpenRouterProvider,
} from '@starway/ai/providers'

import { resolveAiModel } from '../../platform/ai.registry.js'
import { prisma } from '../../db/client.js'
import {
  resolveAssistantDecision,
  type AssistantDecision,
  type AssistantDecisionInput,
} from '../assistant/decisionEngine.js'
import { getUserSubscriptionInfo } from '../subscriptions/service.js'
import { resolveUserLifecycle } from '../flow-control/service.js'
import { STRICT_KNOWLEDGE_BASE } from '../telegram-mentor/services/STRICT-SYSTEM-code.js'
import type { StrictTelegramIntent } from '../telegram-mentor/services/STRICT-SYSTEM-code.js'
import type { TelegramAiRequestContext } from '../telegram-mentor/services/requestContext.service.js'
import { getTelegramConversationHistory } from '../telegram-mentor/services/intelligence.service.js'
import {
  CanonicalGatewayAgentRegistry,
  type CanonicalGatewayAgentRegistration,
} from './canonicalAgentRegistry.js'

export type TelegramGatewayBot = 'user' | 'coach' | 'support' | 'admin'

export type TelegramGatewayIntent =
  | 'telegram_intelligence'
  | 'telegram_echo'
  | 'telegram_assistant'

export interface TelegramAgentGatewayRequest {
  bot: TelegramGatewayBot
  intent: TelegramGatewayIntent
  chatId: string
  userId?: string | null
  message: string
  messageType?: string | null
  requestContext?: TelegramAiRequestContext | null
  requestId?: string | null
}

export interface TelegramAgentGatewayResult<TPayload = Record<string, unknown>> {
  bot: TelegramGatewayBot
  intent: TelegramGatewayIntent
  agentId: AgentDefinition['id']
  taskId: string
  artifact: {
    id: string
    type: string
    summary: string
    payload: TPayload
    metadata?: Record<string, unknown>
  }
}

export interface IAgentGateway {
  execute(input: TelegramAgentGatewayRequest): Promise<TelegramAgentGatewayResult>
}

export interface TelegramAgentGatewayDependencies {
  runtimeExecutor?: IRuntimeGatewayExecutor
  logger?: IRuntimeLogger
  aiProvider?: IAIProvider
}

interface RuntimeGatewayExecutionInput {
  agentDefinition: AgentDefinition
  task: EngineeringTask
}

interface IRuntimeGatewayExecutor {
  execute(input: RuntimeGatewayExecutionInput): Promise<TelegramAgentGatewayResult['artifact']>
}

const TELEGRAM_INTELLIGENCE_CATEGORIES: StrictTelegramIntent[] = [
  'about_focus',
  'about_absystem',
  'about_course',
  'pricing',
  'not_ready_to_buy',
  'technical_issue',
  'general_inquiry',
  'out_of_scope',
  'unknown',
]

type ClassificationTaskInput = {
  text: string
  categories: StrictTelegramIntent[]
  instructions?: string
}

type EchoTaskInput = {
  message: string
}

type AssistantTaskInput = {
  userMessage: string
  userContext: {
    profile: Record<string, unknown>
    subscription: Record<string, unknown>
    lifecycle: Record<string, unknown>
  }
  conversationContext: {
    history: string[]
    journal: string[]
  }
  goals: string[]
  wheel: Record<string, unknown>
  knowledgeBase: typeof STRICT_KNOWLEDGE_BASE
  decision: AssistantDecision | null
  orchestration: {
    selectedAgent: string
    delegated: boolean
    specialistInstructions: string | null
    capability: string
  }
}

type ClassificationArtifactPayload = {
  category?: string
  confidence?: number
  provider?: string
  model?: string
  tokensUsed?: number
  allowedCategories?: StrictTelegramIntent[]
}

type EchoArtifactPayload = {
  message?: string
}

type AssistantArtifactPayload = {
  response?: string
  suggestions?: string[]
  followUp?: string
  provider?: string
  model?: string
  tokensUsed?: number
}

type RuntimeTelemetry = {
  provider: string
  model: string
  latency: number
  promptTokens: number
  completionTokens: number
  cachedTokens: number
  estimatedCost: number
  actualCost: number
  timestamp: string
  user: string | null
}

type BuiltAssistantTaskInput = {
  input: AssistantTaskInput
  decisionDurationMs: number | null
}

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class TelegramAgentGateway implements IAgentGateway {
  private readonly logger: IRuntimeLogger
  private readonly runtimeExecutor: IRuntimeGatewayExecutor
  private readonly registry: CanonicalGatewayAgentRegistry

  constructor(deps: TelegramAgentGatewayDependencies = {}) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
    this.registry = new CanonicalGatewayAgentRegistry(this.logger)
    this.runtimeExecutor = deps.runtimeExecutor ?? new TelegramRuntimeExecutor(
      this.logger,
      deps.aiProvider,
      this.registry,
    )
  }

  async execute(input: TelegramAgentGatewayRequest): Promise<TelegramAgentGatewayResult> {
    const requestId = input.requestId ?? `tg:${input.intent}:${input.chatId}:${Date.now()}`
    const selectedRegistration = this.registry.selectRegistration(input)
    const delegated = input.intent === 'telegram_assistant' && selectedRegistration.key !== 'assistant'

    this.logger.info('telegram_agent_gateway.selection_completed', {
      requestId,
      bot: input.bot,
      intent: input.intent,
      selectedAgent: selectedRegistration.key,
      runtimeAgentId: selectedRegistration.runtime.id,
      delegated,
      chatId: input.chatId,
      userId: input.userId ?? null,
    })

    const executed = await this.executeRegistration({
      requestId,
      input,
      selectedRegistration,
      executionRegistration: selectedRegistration,
      delegated,
      fallbackActivated: false,
      fallbackAgent: null,
    }).catch(async (error) => {
      if (!delegated) {
        throw error
      }

      const fallbackRegistration = this.registry.getRegistrationByKey('assistant')
      this.logger.warn('telegram_agent_gateway.delegation_failed', {
        requestId,
        bot: input.bot,
        intent: input.intent,
        selectedAgent: selectedRegistration.key,
        runtimeAgentId: selectedRegistration.runtime.id,
        fallbackAgent: fallbackRegistration.key,
        error: error instanceof Error ? error.message : String(error),
      })

      return this.executeRegistration({
        requestId,
        input,
        selectedRegistration,
        executionRegistration: fallbackRegistration,
        delegated,
        fallbackActivated: true,
        fallbackAgent: fallbackRegistration.key,
      })
    })

    return {
      bot: input.bot,
      intent: input.intent,
      agentId: executed.agentDefinition.id,
      taskId: executed.task.id,
      artifact: executed.artifact,
    }
  }

  private async executeRegistration(input: {
    requestId: string
    selectedRegistration: CanonicalGatewayAgentRegistration
    executionRegistration: CanonicalGatewayAgentRegistration
    delegated: boolean
    fallbackActivated: boolean
    fallbackAgent: string | null
    input: TelegramAgentGatewayRequest
  }): Promise<{
    agentDefinition: AgentDefinition
    task: EngineeringTask
    artifact: TelegramAgentGatewayResult['artifact']
  }> {
    const agentDefinition = this.registry.getAgentDefinition(input.executionRegistration)
    const task = await this.buildTask(
      input.input,
      input.requestId,
      input.executionRegistration,
      input.selectedRegistration.key !== 'assistant',
      input.selectedRegistration.key,
    )
    const decision = readAssistantDecision(task.metadata?.input)
    const decisionDurationMs = readDecisionDuration(task.metadata)

    this.logger.info('telegram_agent_gateway.execution_started', {
      requestId: input.requestId,
      bot: input.input.bot,
      intent: input.input.intent,
      selectedAgent: input.selectedRegistration.key,
      executedAgent: input.executionRegistration.key,
      runtimeAgentId: agentDefinition.id,
      delegated: input.delegated,
      fallbackActivated: input.fallbackActivated,
      taskId: task.id,
      chatId: input.input.chatId,
      userId: input.input.userId ?? null,
    })

    if (decision) {
      this.logger.info('telegram_agent_gateway.decision_completed', {
        decision: decision.primaryIntent,
        confidence: decision.confidence,
        recommendedAction: decision.recommendedAction,
        selectedAgent: input.selectedRegistration.key,
        durationMs: decisionDurationMs ?? 0,
      })
    }

    const artifact = await this.runtimeExecutor.execute({
      agentDefinition,
      task,
    })

    artifact.metadata = {
      ...(artifact.metadata ?? {}),
      orchestration: {
        requestId: input.requestId,
        selectedAgent: input.selectedRegistration.key,
        executedAgent: input.executionRegistration.key,
        runtimeAgentId: agentDefinition.id,
        delegated: input.delegated,
        fallbackActivated: input.fallbackActivated,
        fallbackAgent: input.fallbackAgent,
      },
      decision,
    }

    this.logger.info('telegram_agent_gateway.execution_completed', {
      requestId: input.requestId,
      bot: input.input.bot,
      intent: input.input.intent,
      selectedAgent: input.selectedRegistration.key,
      executedAgent: input.executionRegistration.key,
      runtimeAgentId: agentDefinition.id,
      delegated: input.delegated,
      fallbackActivated: input.fallbackActivated,
      taskId: task.id,
      artifactId: artifact.id,
      artifactType: artifact.type,
    })

    const runtimeTelemetry = extractRuntimeTelemetry(artifact.metadata)
    if (runtimeTelemetry) {
      this.logger.info('telegram_agent_gateway.runtime_telemetry', {
        requestId: input.requestId,
        bot: input.input.bot,
        intent: input.input.intent,
        selectedAgent: input.selectedRegistration.key,
        executedAgent: input.executionRegistration.key,
        delegated: input.delegated,
        fallbackActivated: input.fallbackActivated,
        taskId: task.id,
        ...runtimeTelemetry,
      })
    }

    return {
      agentDefinition,
      task,
      artifact,
    }
  }

  private async buildTask(
    input: TelegramAgentGatewayRequest,
    requestId: string,
    registration: CanonicalGatewayAgentRegistration,
    delegated: boolean,
    selectedAgent: string,
  ): Promise<EngineeringTask> {
    const assistantTask = registration.buildInputKind === 'assistant'
      ? await buildAssistantTaskInput(input, registration, delegated, selectedAgent)
      : null
    const taskInput = registration.buildInputKind === 'echo'
      ? ({
          message: input.message,
        } satisfies EchoTaskInput)
      : registration.buildInputKind === 'classification'
        ? ({
            text: input.message,
            categories: TELEGRAM_INTELLIGENCE_CATEGORIES,
            instructions: [
              'Classify the Telegram message using the strict Telegram intent taxonomy.',
              'Prefer technical_issue for payment, access, login, or product problems.',
              'Prefer pricing for questions about cost, tariffs, or subscription price.',
              'Prefer about_focus or about_absystem only when the user explicitly asks about those products.',
            ].join(' '),
          } satisfies ClassificationTaskInput)
        : assistantTask!.input

    return {
      id: `tg-${registration.key}-${input.chatId}-${Date.now()}`,
      description: `Telegram gateway task for ${registration.key}.`,
      objective: registration.objective,
      priority: 'high',
      metadata: {
        requestId,
        bot: input.bot,
        chatId: input.chatId,
        userId: input.userId ?? null,
        decisionDurationMs: assistantTask?.decisionDurationMs ?? null,
        input: taskInput,
      },
    }
  }
}

class TelegramRuntimeExecutor implements IRuntimeGatewayExecutor {
  private readonly logger: IRuntimeLogger
  private readonly agentRunner: AgentRunner
  private readonly usageLedgerStore: InMemoryUsageLedgerStore
  private readonly registry: CanonicalGatewayAgentRegistry

  constructor(
    logger: IRuntimeLogger,
    aiProvider: IAIProvider | undefined,
    registry: CanonicalGatewayAgentRegistry,
  ) {
    this.logger = logger
    this.usageLedgerStore = new InMemoryUsageLedgerStore()
    this.registry = registry

    const promptRegistry = new PromptRegistry({
      sources: this.buildPromptSources(),
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

    const artifactValidator = {
      validate: async (
        { artifact, task, agentDefinition }: {
          artifact: { payload: Record<string, unknown> }
          task: EngineeringTask
          agentDefinition: AgentDefinition
        },
      ) => {
        const registration = this.registry.getRegistrationByRuntimeAgentId(agentDefinition.id)

        if (registration.buildInputKind === 'echo') {
          const payload = artifact.payload as Partial<EchoArtifactPayload>
          const input = task.metadata?.input as Partial<EchoTaskInput> | undefined
          return {
            valid: typeof payload.message === 'string' && payload.message === input?.message,
            reason: 'Echo artifact must return the original Telegram message unchanged.',
          }
        }

        if (registration.buildInputKind === 'assistant') {
          const payload = artifact.payload as Partial<AssistantArtifactPayload>
          return {
            valid: typeof payload.response === 'string' && payload.response.trim().length > 0,
            reason: 'Assistant artifact must return a non-empty response.',
          }
        }

        const payload = artifact.payload as Partial<ClassificationArtifactPayload>
        const taskInput = task.metadata?.input as Partial<ClassificationTaskInput> | undefined
        const allowedCategories = Array.isArray(taskInput?.categories)
          ? taskInput.categories
          : []

        if (!payload.category || typeof payload.category !== 'string') {
          return { valid: false, reason: 'Classification artifact is missing category.' }
        }

        if (!allowedCategories.includes(payload.category as StrictTelegramIntent)) {
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
          const registration = this.registry.getRegistrationByRuntimeAgentId(agentDefinition.id)

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
                suggestions: readStringArrayField(providerResponse.structuredOutput, 'suggestions'),
                followUp: readStringField(providerResponse.structuredOutput, 'followUp'),
                provider: getStringMetadata(providerResponse.metadata, 'provider'),
                model: getStringMetadata(providerResponse.metadata, 'model'),
                tokensUsed: getTokenUsage(providerResponse.metadata),
              },
            }
          }

          const taskInput = task.metadata?.input as Partial<ClassificationTaskInput> | undefined
          return {
            id: `classification-${task.id}`,
            type: registration.runtime.artifactType,
            owner: agentDefinition.id,
            summary: `Telegram intent classified for task '${task.id}'.`,
            payload: {
              category: providerResponse.content ?? 'unknown',
              confidence: getNumberMetadata(providerResponse.metadata, 'confidence'),
              provider: getStringMetadata(providerResponse.metadata, 'provider'),
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

  async execute(input: RuntimeGatewayExecutionInput): Promise<TelegramAgentGatewayResult['artifact']> {
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

  private buildPromptSources() {
    const promptsDir = resolveRepositoryPromptsDir()
    const defaultSources = DEFAULT_RUNTIME_PROMPT_SOURCES.map((source) => ({
      ...source,
      filePath: path.join(promptsDir, path.basename(source.filePath)),
    }))
    const mentorPromptFilePath = path.join(promptsDir, 'mentor-agent-prompt.md')

    return [
      ...defaultSources,
      buildPromptAlias('assistant-agent-prompt', 'assistant_agent', mentorPromptFilePath),
      buildPromptAlias('content-agent-prompt', 'content_agent', mentorPromptFilePath),
      buildPromptAlias('sales-agent-prompt', 'sales_agent', mentorPromptFilePath),
      buildPromptAlias('coach-agent-prompt', 'coach_agent', mentorPromptFilePath),
      buildPromptAlias('funnel-agent-prompt', 'funnel_agent', mentorPromptFilePath),
    ]
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

function resolveRepositoryPromptsDir(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../prompts',
  )
}

function buildPromptAlias(
  id: string,
  ownerAgentId: AgentDefinition['id'],
  filePath: string,
) {
  return {
    id,
    version: '1.0.0',
    filePath,
    ownerAgentIds: [ownerAgentId],
    canonical: true,
    defaultVersion: true,
  }
}

function createExecutionState(
  task: EngineeringTask,
  agentId: AgentDefinition['id'],
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

function resolveGatewayProviderId(): 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openrouter' {
  const raw = String(process.env.TELEGRAM_AGENT_GATEWAY_PROVIDER ?? 'openai').trim().toLowerCase()
  if (raw === 'anthropic' || raw === 'gemini' || raw === 'ollama' || raw === 'openrouter') {
    return raw
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'ollama'
  }

  return 'openai'
}

function buildGatewayAiProvider(): IAIProvider {
  const providerId = resolveGatewayProviderId()
  switch (providerId) {
    case 'anthropic':
      return new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        defaultModel: process.env.TELEGRAM_AGENT_GATEWAY_ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',
      })
    case 'gemini':
      return new GeminiProvider({
        apiKey: process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY,
        defaultModel: process.env.TELEGRAM_AGENT_GATEWAY_GEMINI_MODEL ?? 'gemini-2.5-flash',
      })
    case 'ollama':
      return new OllamaProvider({
        baseUrl: process.env.OLLAMA_BASE_URL,
        defaultModel: process.env.TELEGRAM_AGENT_GATEWAY_OLLAMA_MODEL ?? 'qwen3:latest',
        timeoutMs: 120_000,
      })
    case 'openrouter':
      return new OpenRouterProvider({
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultModel: process.env.TELEGRAM_AGENT_GATEWAY_OPENROUTER_MODEL ?? resolveAiModel('telegram_intelligence'),
      })
    case 'openai':
    default:
      return new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: process.env.TELEGRAM_AGENT_GATEWAY_OPENAI_MODEL ?? resolveAiModel('telegram_intelligence'),
      })
  }
}

function getStringMetadata(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : 'unknown'
}

function readStringField(
  value: Record<string, unknown> | undefined,
  field: 'followUp',
): string {
  const result = value?.[field]
  return typeof result === 'string' ? result : ''
}

function readStringArrayField(
  value: Record<string, unknown> | undefined,
  field: 'suggestions',
): string[] {
  const result = value?.[field]
  return Array.isArray(result) ? result.filter((item): item is string => typeof item === 'string') : []
}

function readAssistantResponse(
  providerResponse: { content?: string; structuredOutput?: Record<string, unknown> },
): string {
  if (typeof providerResponse.structuredOutput?.response === 'string' && providerResponse.structuredOutput.response.trim()) {
    return providerResponse.structuredOutput.response
  }

  if (typeof providerResponse.content === 'string') {
    return providerResponse.content
  }

  return ''
}

function getNumberMetadata(metadata: Record<string, unknown> | undefined, key: string): number {
  const value = metadata?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function getTokenUsage(metadata: Record<string, unknown> | undefined): number {
  const usage = metadata?.tokenUsage
  if (!usage || typeof usage !== 'object') {
    return 0
  }

  const total = (usage as { totalTokens?: unknown }).totalTokens
  return typeof total === 'number' && Number.isFinite(total) ? total : 0
}

function extractRuntimeTelemetry(
  metadata: Record<string, unknown> | undefined,
): RuntimeTelemetry | null {
  const value = metadata?.runtimeTelemetry
  if (!value || typeof value !== 'object') {
    return null
  }

  const telemetry = value as Partial<RuntimeTelemetry>
  if (
    typeof telemetry.provider !== 'string' ||
    typeof telemetry.model !== 'string' ||
    typeof telemetry.latency !== 'number'
  ) {
    return null
  }

  return {
    provider: telemetry.provider,
    model: telemetry.model,
    latency: telemetry.latency ?? 0,
    promptTokens: telemetry.promptTokens ?? 0,
    completionTokens: telemetry.completionTokens ?? 0,
    cachedTokens: telemetry.cachedTokens ?? 0,
    estimatedCost: telemetry.estimatedCost ?? 0,
    actualCost: telemetry.actualCost ?? 0,
    timestamp: telemetry.timestamp ?? new Date(0).toISOString(),
    user: telemetry.user ?? null,
  }
}

function resolveAssistantDecisionSafely(
  input: AssistantDecisionInput,
): {
  decision: AssistantDecision | null
  durationMs: number | null
} {
  try {
    const resolution = resolveAssistantDecision(input)
    return {
      decision: resolution.decision,
      durationMs: resolution.durationMs,
    }
  } catch {
    return {
      decision: null,
      durationMs: null,
    }
  }
}

function readAssistantDecision(value: unknown): AssistantDecision | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const decision = (value as { decision?: unknown }).decision
  if (!decision || typeof decision !== 'object') {
    return null
  }

  const candidate = decision as Partial<AssistantDecision>
  if (
    typeof candidate.primaryIntent !== 'string'
    || typeof candidate.userState !== 'string'
    || typeof candidate.recommendedAction !== 'string'
    || typeof candidate.confidence !== 'number'
  ) {
    return null
  }

  return {
    primaryIntent: candidate.primaryIntent,
    secondaryIntent: typeof candidate.secondaryIntent === 'string' ? candidate.secondaryIntent : null,
    userState: candidate.userState,
    recommendedAction: candidate.recommendedAction,
    confidence: candidate.confidence,
  }
}

function readDecisionDuration(metadata: Record<string, unknown> | undefined): number | null {
  const value = metadata?.decisionDurationMs
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

async function buildAssistantTaskInput(
  input: TelegramAgentGatewayRequest,
  registration: CanonicalGatewayAgentRegistration,
  delegated: boolean,
  selectedAgent: string,
): Promise<BuiltAssistantTaskInput> {
  if (input.requestContext) {
    const decisionResolution = resolveAssistantDecisionSafely({
      message: input.message,
      messageType: input.messageType ?? null,
      userState: input.requestContext.userState,
      lifecycleState: input.requestContext.lifecycle?.state ?? null,
      subscription: {
        status: input.requestContext.subscription.status,
        daysLeft: input.requestContext.subscription.daysLeft,
      },
      focusParticipation: input.requestContext.focusParticipation,
      primaryGoal: input.requestContext.primaryGoal,
      unfinishedActions: input.requestContext.unfinishedActions,
      nextZoom: input.requestContext.nextZoom,
      latestWheel: input.requestContext.latestWheel
        ? {
            weakestSphere: input.requestContext.latestWheel.weakestSphere,
            focusSphere: input.requestContext.latestWheel.focusSphere,
          }
        : null,
      recentConversation: input.requestContext.recentConversation,
      lastInteraction: input.requestContext.lastInteraction,
    })
    const taskInput: AssistantTaskInput = {
      userMessage: input.message,
      userContext: {
        profile: {
          userId: input.requestContext.userId,
          firstName: input.requestContext.profile.firstName,
          telegramUserName: input.requestContext.profile.telegramUserName,
          chatId: input.requestContext.chatId,
          userState: input.requestContext.userState,
          focusParticipation: input.requestContext.focusParticipation,
        },
        subscription: {
          status: input.requestContext.subscription.status,
          endsAt: input.requestContext.subscription.endsAt,
          daysLeft: input.requestContext.subscription.daysLeft,
          canFillWheel: input.requestContext.subscription.canFillWheel,
          wheelCooldownDaysLeft: input.requestContext.subscription.wheelCooldownDaysLeft,
        },
        lifecycle: {
          state: input.requestContext.lifecycle?.state ?? null,
          flow: input.requestContext.lifecycle?.flow ?? null,
          subscriptionStatus: input.requestContext.lifecycle?.subscriptionStatus ?? null,
          legacyLifecycleState: input.requestContext.profile.lifecycleState,
          nextZoom: input.requestContext.nextZoom,
          unfinishedActions: input.requestContext.unfinishedActions,
          lastInteraction: input.requestContext.lastInteraction,
          currentIntent: input.intent,
          messageType: input.messageType ?? null,
        },
      },
      conversationContext: {
        history: input.requestContext.recentConversation.map(
          (message) => `${message.role}: ${message.content}`,
        ),
        journal: [],
      },
      goals: input.requestContext.primaryGoal ? [input.requestContext.primaryGoal] : [],
      wheel: input.requestContext.latestWheel ?? {},
      knowledgeBase: STRICT_KNOWLEDGE_BASE,
      decision: decisionResolution.decision,
      orchestration: {
        selectedAgent,
        delegated,
        specialistInstructions: registration.specialistInstructions ?? null,
        capability: registration.runtime.capability,
      },
    }

    return {
      input: taskInput,
      decisionDurationMs: decisionResolution.durationMs,
    }
  }

  const [userRecord, subscriptionInfo, lifecycle, history] = await Promise.all([
    input.userId
      ? prisma.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            firstName: true,
            telegramUserName: true,
            lifecycleState: true,
            currentState: true,
          },
        }).catch(() => null)
      : Promise.resolve(null),
    input.userId
      ? getUserSubscriptionInfo(input.userId).catch(() => null)
      : Promise.resolve(null),
    input.userId
      ? resolveUserLifecycle(input.userId).catch(() => null)
      : Promise.resolve(null),
    input.userId
      ? getTelegramConversationHistory(input.userId, 6).catch(() => [])
      : Promise.resolve([]),
  ])
  const decisionResolution = resolveAssistantDecisionSafely({
    message: input.message,
    messageType: input.messageType ?? null,
    userState: userRecord?.currentState ?? null,
    lifecycleState: lifecycle?.state ?? null,
    subscription: {
      status: subscriptionInfo?.subscription.status ?? 'inactive',
      daysLeft: subscriptionInfo?.subscription.daysLeft ?? null,
    },
    focusParticipation: {
      isActive: lifecycle?.state === 'paid' || lifecycle?.state === 'trial',
      status: lifecycle?.state === 'paid'
        ? 'active'
        : lifecycle?.state === 'trial'
          ? 'trial'
          : 'inactive',
    },
    primaryGoal: null,
    unfinishedActions: [],
    nextZoom: null,
    latestWheel: null,
    recentConversation: history,
    lastInteraction: history.at(-1) ?? null,
  })

  const taskInput: AssistantTaskInput = {
    userMessage: input.message,
    userContext: {
      profile: {
        userId: input.userId ?? null,
        firstName: userRecord?.firstName ?? null,
        telegramUserName: userRecord?.telegramUserName ?? null,
        chatId: input.chatId,
      },
      subscription: {
        status: subscriptionInfo?.subscription.status ?? 'inactive',
        endsAt: subscriptionInfo?.subscription.endsAt ?? null,
        daysLeft: subscriptionInfo?.subscription.daysLeft ?? null,
        canFillWheel: subscriptionInfo?.cooldown.canFill ?? null,
        wheelCooldownDaysLeft: subscriptionInfo?.cooldown.daysLeft ?? null,
      },
      lifecycle: {
        state: lifecycle?.state ?? null,
        flow: lifecycle?.flow ?? null,
        subscriptionStatus: lifecycle?.subscriptionStatus ?? null,
        legacyLifecycleState: userRecord?.lifecycleState ?? null,
      },
    },
    conversationContext: {
      history: history.map((message) => `${message.role}: ${message.content}`),
      journal: [],
    },
    goals: [],
    wheel: {},
    knowledgeBase: STRICT_KNOWLEDGE_BASE,
    decision: decisionResolution.decision,
    orchestration: {
      selectedAgent,
      delegated,
      specialistInstructions: registration.specialistInstructions ?? null,
      capability: registration.runtime.capability,
    },
  }

  return {
    input: taskInput,
    decisionDurationMs: decisionResolution.durationMs,
  }
}

let telegramAgentGatewaySingleton: TelegramAgentGateway | null = null

export function getTelegramAgentGateway(): TelegramAgentGateway {
  if (!telegramAgentGatewaySingleton) {
    telegramAgentGatewaySingleton = new TelegramAgentGateway()
  }

  return telegramAgentGatewaySingleton
}
