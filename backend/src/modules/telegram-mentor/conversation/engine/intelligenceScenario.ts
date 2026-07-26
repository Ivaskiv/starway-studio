import type { IAgentGateway } from '../../../ai/agentGateway.js'
import type { Context } from 'telegraf'
import {
  createConversationResponse,
  type ConversationResponse,
} from './types.js'
import { telegramContentRegistry } from '../../content/contentRegistry.js'
import {
  appendTelegramConversationTurn,
  type TelegramIntelligenceMessageType,
} from '../../services/intelligence.service.js'
import { getTelegramAiRequestContext } from '../../services/requestContext.service.js'
import type { TelegramAiRequestContext } from '../../services/requestContext.service.js'

export interface IntelligenceScenarioInput {
  ctx: Context
  chatId: string
  userId: string | null
  message: string
  messageType: TelegramIntelligenceMessageType
  gateway: IAgentGateway
  requestId?: string | null
}

type OrchestrationTelemetry = {
  selectedAgent?: string
  executedAgent?: string
  delegated?: boolean
  fallbackActivated?: boolean
}

type DecisionTelemetry = {
  primaryIntent?: string
  secondaryIntent?: string | null
  userState?: string
  recommendedAction?: string
  confidence?: number
}

function buildSoftBridgeReply(): string {
  return telegramContentRegistry.replies.softBridge
}

function buildPersonalSituationReply(): string {
  return telegramContentRegistry.replies.personalSituation
}

function buildSmallTalkReply(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('привіт')) return telegramContentRegistry.replies.smallTalkGreeting
  if (lower.includes('дякую') || lower.includes('спасибо')) return telegramContentRegistry.replies.smallTalkThanks
  if (lower.includes('як дела')) return telegramContentRegistry.replies.smallTalkHowAreYou
  return telegramContentRegistry.replies.smallTalkGreeting
}

function isEchoGreeting(text: string): boolean {
  return text.trim().toLowerCase() === 'привіт'
}

function readOrchestrationTelemetry(value: unknown): OrchestrationTelemetry | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as OrchestrationTelemetry
}

function readDecisionTelemetry(value: unknown): DecisionTelemetry | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as DecisionTelemetry
}

export async function buildIntelligenceConversationResponse(
  input: IntelligenceScenarioInput,
): Promise<ConversationResponse> {
  const requestContext = await getTelegramAiRequestContext(input.ctx)

  return resolveIntelligenceConversationResponse({
    chatId: input.chatId,
    userId: input.userId,
    message: input.message,
    messageType: input.messageType,
    gateway: input.gateway,
    requestContext,
    requestId: input.requestId ?? null,
  })
}

export async function resolveIntelligenceConversationResponse(
  input: {
    chatId: string
    userId: string | null
    message: string
    messageType: TelegramIntelligenceMessageType
    gateway: IAgentGateway
    requestContext: TelegramAiRequestContext
    requestId?: string | null
  },
): Promise<ConversationResponse> {
  const requestContext = input.requestContext

  if (input.messageType === 'MEMORY_REQUEST') {
    const lastAssistantMessage = [...requestContext.recentConversation]
      .reverse()
      .find((message) => message.role === 'assistant')

    return createConversationResponse({
      text: lastAssistantMessage?.content ?? telegramContentRegistry.replies.memoryFallback,
      telemetry: {
        scenario: 'memory_request',
      },
      analytics: {
        intent: 'memory_request',
      },
    })
  }

  try {
    const gatewayResult = await input.gateway.execute({
      bot: 'user',
      intent: 'telegram_assistant',
      chatId: input.chatId,
      userId: input.userId,
      message: input.message,
      messageType: input.messageType,
      requestContext,
      requestId: input.requestId ?? null,
    })

    const payload = gatewayResult.artifact.payload as {
      response?: string
      followUp?: string
      suggestions?: string[]
      provider?: string
      model?: string
    } | undefined

    const responseText = [payload?.response, payload?.followUp]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .join('\n\n')

    if (responseText.trim().length > 0) {
      const orchestration = readOrchestrationTelemetry(gatewayResult.artifact.metadata?.orchestration)
      const decision = readDecisionTelemetry(gatewayResult.artifact.metadata?.decision)
      const selectedAgent = typeof orchestration?.selectedAgent === 'string'
        ? orchestration.selectedAgent
        : null
      const executedAgent = typeof orchestration?.executedAgent === 'string'
        ? orchestration.executedAgent
        : null
      const delegated = orchestration?.delegated === true
      const fallbackActivated = orchestration?.fallbackActivated === true

      if (input.userId) {
        await appendTelegramConversationTurn(
          input.userId,
          input.message,
          responseText,
          {
            intent: input.messageType.toLowerCase(),
            confidence: 1,
            isFallback: false,
            nextStep: null,
            messageType: input.messageType,
          },
        ).catch((error) => {
          console.warn('[conversation-engine] failed to persist assistant turn', {
            userId: input.userId,
            chatId: input.chatId,
            error: error instanceof Error ? error.message : String(error),
          })
        })
      }

      return createConversationResponse({
        text: responseText,
        telemetry: {
          scenario: 'assistant',
          agentId: gatewayResult.agentId,
          artifactType: gatewayResult.artifact.type,
          messageType: input.messageType,
          provider: payload?.provider ?? null,
          model: payload?.model ?? null,
          decision: typeof decision?.primaryIntent === 'string' ? decision.primaryIntent : null,
          secondaryIntent: typeof decision?.secondaryIntent === 'string' ? decision.secondaryIntent : null,
          userState: typeof decision?.userState === 'string' ? decision.userState : null,
          recommendedAction: typeof decision?.recommendedAction === 'string' ? decision.recommendedAction : null,
          confidence: typeof decision?.confidence === 'number' ? decision.confidence : null,
          selectedAgent,
          executedAgent,
          delegated,
          fallbackActivated,
        },
        analytics: {
          intent: input.messageType === 'SMALL_TALK' && isEchoGreeting(input.message)
            ? 'greeting'
            : input.messageType.toLowerCase(),
        },
      })
    }
  } catch (error) {
    console.warn('[conversation-engine] assistant gateway failed, fallback to local intelligence flow', {
      chatId: input.chatId,
      userId: input.userId,
      messageType: input.messageType,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  if (input.messageType === 'SMALL_TALK') {
    return createConversationResponse({
      text: buildSmallTalkReply(input.message),
      telemetry: {
        scenario: 'small_talk',
        fallbackActivated: true,
      },
      analytics: {
        intent: isEchoGreeting(input.message) ? 'greeting' : 'small_talk',
      },
    })
  }

  if (input.messageType === 'PERSONAL_SITUATION') {
    return createConversationResponse({
      text: buildPersonalSituationReply(),
      buttons: [
        {
          label: telegramContentRegistry.buttons.bookDemo,
          kind: 'url',
          value: 'https://t.me/nadya_couch',
        },
      ],
      telemetry: {
        scenario: 'personal_situation',
        fallbackActivated: true,
      },
      analytics: {
        intent: 'personal_situation',
      },
    })
  }

  return createConversationResponse({
    text: buildSoftBridgeReply(),
    telemetry: {
      scenario: 'assistant_unavailable',
      fallbackActivated: true,
    },
    analytics: {
      intent: input.messageType.toLowerCase(),
    },
  })
}
