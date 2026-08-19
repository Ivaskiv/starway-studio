import {
type AgentDefinition,
type EngineeringTask,
type IRuntimeLogger,
} from '@starway/ai'
import {
CanonicalGatewayAgentRegistry,
type CanonicalGatewayAgentRegistration,
} from '../agentRegistry.js'
import { buildAssistantTaskInput } from './context.js'
import {
NoopRuntimeLogger,
extractRuntimeTelemetry,
readAssistantDecision,
readDecisionDuration,
} from './helpers.js'
import { TelegramRuntimeExecutor } from './runtime.js'
import {
TELEGRAM_INTELLIGENCE_CATEGORIES,
type ClassificationTaskInput,
type EchoTaskInput,
type IAgentGateway,
type IRuntimeGatewayExecutor,
type TargetedGatewayAgentTestRequest,
type TelegramAgentGatewayDependencies,
type TelegramAgentGatewayRequest,
type TelegramAgentGatewayResult,
} from './types.js'
export class TelegramAgentGateway implements IAgentGateway {
  private readonly logger: IRuntimeLogger
  private readonly runtimeExecutor: IRuntimeGatewayExecutor
  private readonly registry: CanonicalGatewayAgentRegistry

  constructor(deps: TelegramAgentGatewayDependencies = {}) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
    this.registry = new CanonicalGatewayAgentRegistry(this.logger)
    this.runtimeExecutor =
      deps.runtimeExecutor ??
      new TelegramRuntimeExecutor(this.logger, deps.aiProvider, this.registry)
  }

  async execute(
    input: TelegramAgentGatewayRequest
  ): Promise<TelegramAgentGatewayResult> {
    const requestId =
      input.requestId ?? `tg:${input.intent}:${input.chatId}:${Date.now()}`
    const selectedRegistration = this.registry.selectRegistration(input)
    const delegated =
      input.intent === 'telegram_assistant' &&
      selectedRegistration.key !== 'assistant'

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

      const fallbackRegistration =
        this.registry.getRegistrationByKey('assistant')
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

  async executeTargetedAgentTest(
    input: TargetedGatewayAgentTestRequest
  ): Promise<TelegramAgentGatewayResult> {
    const registration = this.registry.getRegistrationByKey(input.key)
    if (!registration.allowedBots.includes(input.bot)) {
      throw new Error(
        `Bot '${input.bot}' is not allowed to execute '${registration.key}'.`
      )
    }

    const requestId =
      input.requestId ??
      `tg:test:${registration.key}:${input.chatId}:${Date.now()}`
    const request: TelegramAgentGatewayRequest = {
      bot: input.bot,
      intent: registration.intent,
      chatId: input.chatId,
      userId: input.userId ?? null,
      message: input.message,
      messageType: input.messageType ?? null,
      requestContext: input.requestContext ?? null,
      requestId,
    }

    const executed = await this.executeRegistration({
      requestId,
      input: request,
      selectedRegistration: registration,
      executionRegistration: registration,
      delegated: false,
      fallbackActivated: false,
      fallbackAgent: null,
    })

    return {
      bot: request.bot,
      intent: request.intent,
      agentId: executed.agentDefinition.id,
      taskId: executed.task.id,
      artifact: executed.artifact,
    }
  }

  async invalidatePromptCache(): Promise<void> {
    await this.runtimeExecutor.invalidatePromptCache?.()
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
    const agentDefinition = this.registry.getAgentDefinition(
      input.executionRegistration
    )
    const task = await this.buildTask(
      input.input,
      input.requestId,
      input.executionRegistration,
      input.delegated,
      input.selectedRegistration.key
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
    selectedAgent: string
  ): Promise<EngineeringTask> {
    const assistantTask =
      registration.buildInputKind === 'assistant'
        ? await buildAssistantTaskInput(
            input,
            registration,
            delegated,
            selectedAgent
          )
        : null
    const taskInput =
      registration.buildInputKind === 'echo'
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
