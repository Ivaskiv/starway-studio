import { describe, expect, it, vi } from 'vitest'

import type { Context } from 'telegraf'

import { handleIntelligentMessage } from './intelligence.handler.js'
import { TelegramAgentGateway } from '../../ai/agentGateway.js'
import type { IAIProvider, IRuntimeLogger } from '@starway/ai'

vi.mock('../services/requestContext.service.js', () => ({
  getTelegramAiRequestContext: vi.fn(async (ctx: Context) => ({
    chatId: String(ctx.chat?.id ?? ''),
    userId: 'user-test-runtime',
    isAnonymous: false,
    userState: 'ACTIVE',
    profile: {
      firstName: 'Runtime',
      telegramUserName: 'test_runtime_user',
      lifecycleState: 'ACTIVE',
      currentState: 'ACTIVE',
      currentStep: 'START_FLOW',
    },
    lifecycle: {
      state: 'paid',
      flow: 'mentor',
      subscriptionStatus: 'active',
      subscriptionActive: true,
      currentStep: 'START_FLOW',
      leadStep: 0,
      hasLeadMagnetFlow: false,
      hasCompletedLeadMagnet: false,
      hasMentorAccess: true,
      hasExpiredAccess: false,
      hasWaitlistFlag: false,
      priority: 5,
    },
    subscription: {
      status: 'active',
      endsAt: null,
      daysLeft: null,
      canFillWheel: true,
      wheelCooldownDaysLeft: 0,
    },
    focusParticipation: {
      isActive: true,
      status: 'active',
    },
    nextZoom: null,
    unfinishedActions: [],
    primaryGoal: null,
    latestWheel: null,
    recentConversation: [],
    lastInteraction: null,
    lastAssistantMessage: null,
  })),
}))

vi.mock('../services/intelligence.service.js', () => ({
  appendTelegramConversationTurn: vi.fn(async () => undefined),
  detectTelegramIntelligenceMessageType: vi.fn((text: string) => {
    const normalized = text.trim().toLowerCase()
    return normalized === 'привіт' ? 'SMALL_TALK' : 'UNKNOWN'
  }),
}))
const loggerEvents: Array<{ level: 'debug' | 'info' | 'warn' | 'error'; message: string; context?: Record<string, unknown> }> = []

const logger: IRuntimeLogger = {
  debug(message, context) {
    loggerEvents.push({ level: 'debug', message, context })
  },
  info(message, context) {
    loggerEvents.push({ level: 'info', message, context })
  },
  warn(message, context) {
    loggerEvents.push({ level: 'warn', message, context })
  },
  error(message, context) {
    loggerEvents.push({ level: 'error', message, context })
  },
}

function createContext(text: string) {
  const replies: string[] = []
  const chatActions: string[] = []

  const ctx = {
    message: { text },
    chat: { id: 424242 },
    from: { id: 777777, username: 'test_runtime_user' },
    state: { userId: 'user-test-runtime' },
    update: { update_id: 1001 },
    sendChatAction: vi.fn(async (action: string) => {
      chatActions.push(action)
      return true
    }),
    reply: vi.fn(async (message: string) => {
      replies.push(message)
      return { message_id: 1, text: message }
    }),
  } as unknown as Context

  return { ctx, replies, chatActions }
}

describe('Telegram Runtime Echo E2E', () => {
  it('routes Привіт through Bot -> Gateway -> Runtime -> EchoAgent -> Provider -> Telegram reply', async () => {
    loggerEvents.length = 0

    const provider: IAIProvider = {
      execute: vi.fn(async ({ task }) => {
        const input = task.metadata?.input as { userMessage?: string } | undefined
        return {
          content: input?.userMessage ?? '',
          structuredOutput: {
            response: input?.userMessage ?? '',
          },
          metadata: {
            provider: 'openai',
            model: 'gpt-4.1-mini',
            tokenUsage: {
              inputTokens: 8,
              outputTokens: 8,
              totalTokens: 16,
              cachedInputTokens: 0,
            },
          },
        }
      }),
    }

    const gateway = new TelegramAgentGateway({
      aiProvider: provider,
      logger,
    })

    const { ctx, replies, chatActions } = createContext('Привіт')

    const handled = await handleIntelligentMessage(ctx, gateway)

    expect(handled).toBe(true)
    expect(chatActions).toEqual(['typing'])
    expect(replies).toEqual(['Привіт'])

    expect(loggerEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'telegram_agent_gateway.execution_started',
          context: expect.objectContaining({
            bot: 'user',
            intent: 'telegram_assistant',
            selectedAgent: 'assistant',
            executedAgent: 'assistant',
          }),
        }),
        expect.objectContaining({
          message: 'agent_runner.agent_started',
          context: expect.objectContaining({
            agentId: 'assistant_agent',
          }),
        }),
        expect.objectContaining({
          message: 'agent_runner.agent_completed',
          context: expect.objectContaining({
            agentId: 'assistant_agent',
          }),
        }),
        expect.objectContaining({
          message: 'telegram_agent_gateway.runtime_telemetry',
          context: expect.objectContaining({
            selectedAgent: 'assistant',
            executedAgent: 'assistant',
            provider: 'openai',
            model: 'gpt-4.1-mini',
            promptTokens: 8,
            completionTokens: 8,
            actualCost: expect.any(Number),
            estimatedCost: expect.any(Number),
            latency: expect.any(Number),
          }),
        }),
      ]),
    )
  })
})
