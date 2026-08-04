import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  gatewayExecute: vi.fn(),
  getConversationHistory: vi.fn(),
  resolveTelegramIntelligence: vi.fn(),
  handleAbTestCallback: vi.fn(),
  getTelegramAiRequestContext: vi.fn(),
  appendTelegramConversationTurn: vi.fn(),
}))

vi.mock('../../../ai/agentGateway.js', () => ({
  getTelegramAgentGateway: () => ({
    execute: mocks.gatewayExecute,
  }),
}))

vi.mock('../../../services/claude-intelligence.service.js', () => ({
  claudeIntelligenceService: {
    getConversationHistory: mocks.getConversationHistory,
  },
}))

vi.mock('../../services/intelligence.service.js', () => ({
  resolveTelegramIntelligence: mocks.resolveTelegramIntelligence,
  appendTelegramConversationTurn: mocks.appendTelegramConversationTurn,
  resolveTelegramSupportUrl: vi.fn(() => 'https://t.me/test_support'),
}))

vi.mock('../../services/requestContext.service.js', () => ({
  getTelegramAiRequestContext: mocks.getTelegramAiRequestContext,
}))

vi.mock('@/products/ab-system/telegram/abTest.service.js', () => ({
  handleAbTestCallback: mocks.handleAbTestCallback,
}))

vi.mock('../../handlers/status.js', () => ({
  handleStatus: vi.fn(),
}))

import { TelegramConversationEngine } from './conversationEngine.js'

describe('TelegramConversationEngine', () => {
  const baseRequestContext = {
    chatId: 'chat-1',
    userId: 'user-1',
    isAnonymous: false,
    userState: 'ACTIVE',
    profile: {
      firstName: 'Test',
      telegramUserName: 'tester',
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
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.gatewayExecute.mockResolvedValue({
      agentId: 'echo_agent',
      artifact: {
        type: 'echo_artifact',
        payload: { message: 'Привіт' },
      },
    })
    mocks.getConversationHistory.mockResolvedValue([])
    mocks.resolveTelegramIntelligence.mockResolvedValue({
      intent: 'about_focus',
      confidence: 1,
      isFallback: false,
      nextStep: 'show_focus',
      message: 'ФОКУС',
      replyMarkup: undefined,
    })
    mocks.handleAbTestCallback.mockResolvedValue(true)
    mocks.appendTelegramConversationTurn.mockResolvedValue(undefined)
    mocks.getTelegramAiRequestContext.mockResolvedValue(baseRequestContext)
  })

  function createContext() {
    return {
      state: {},
      chat: { id: 1 },
      from: { id: 1 },
      reply: vi.fn(),
      telegram: {
        sendMessage: vi.fn(),
        sendPhoto: vi.fn(),
        sendVoice: vi.fn(),
        sendVideo: vi.fn(),
        sendDocument: vi.fn(),
        sendChatAction: vi.fn(),
        answerCbQuery: vi.fn(),
      },
      answerCbQuery: vi.fn(),
      editMessageText: vi.fn(),
    } as never
  }

  it('returns a pure contract for subscription status without Telegram transport', async () => {
    const engine = new TelegramConversationEngine()

    const response = await engine.execute(createContext(), {
      chatId: 'chat-1',
      userId: null,
      text: 'Покажи статус підписки',
      route: {
        intent: 'subscription_status',
        scenario: 'ab_test_callback',
        abTestAction: 'ab_test:subscription',
      },
    })

    expect(mocks.handleAbTestCallback).not.toHaveBeenCalled()
    expect(response).toEqual({
      text: null,
      cards: [],
      buttons: [],
      media: [],
      nextActions: [],
      telemetry: { handled: true, scenario: 'subscription_status', reason: 'missing_user' },
      analytics: {},
    })
  })

  it('returns a pure contract for greeting through the AI scenario', async () => {
    mocks.gatewayExecute.mockResolvedValueOnce({
      agentId: 'mentor_agent',
      artifact: {
        type: 'mentor_response_artifact',
        payload: { response: 'Привіт' },
      },
    })

    const engine = new TelegramConversationEngine()

    const response = await engine.execute(createContext(), {
      chatId: 'chat-1',
      userId: 'user-1',
      text: 'Привіт',
      route: {
        intent: 'greeting',
        scenario: 'intelligence',
        intelligenceMessageType: 'SMALL_TALK',
      },
    })

    expect(response.text).toBe('Привіт')
    expect(response.nextActions).toEqual([])
    expect(response.buttons).toEqual([])
    expect(response.cards).toEqual([])
    expect(response.media).toEqual([])
    expect(response.telemetry).toMatchObject({
      scenario: 'assistant',
      agentId: 'mentor_agent',
      artifactType: 'mentor_response_artifact',
    })
  })

  it('returns the last assistant turn for a memory request using request-scoped context', async () => {
    mocks.getTelegramAiRequestContext.mockResolvedValueOnce({
      ...baseRequestContext,
      recentConversation: [
        {
          role: 'assistant',
          content: 'Ось що було важливим у нашій останній розмові.',
          createdAt: '2026-07-23T10:00:00.000Z',
        },
      ],
      lastAssistantMessage: 'Ось що було важливим у нашій останній розмові.',
    })

    const engine = new TelegramConversationEngine()

    const response = await engine.execute(createContext(), {
      chatId: 'chat-1',
      userId: 'user-1',
      text: 'На чому ми зупинились?',
      route: {
        intent: 'memory_request',
        scenario: 'intelligence',
        intelligenceMessageType: 'MEMORY_REQUEST',
      },
    })

    expect(response.text).toBe('Ось що було важливим у нашій останній розмові.')
    expect(mocks.gatewayExecute).not.toHaveBeenCalled()
  })

  it('returns a single pure response for focus info without legacy callback execution', async () => {
    const engine = new TelegramConversationEngine()

    const response = await engine.execute(createContext(), {
      chatId: 'chat-1',
      userId: 'user-1',
      text: 'Хочу у ФОКУС',
      route: {
        intent: 'focus_info',
        scenario: 'ab_test_callback',
        abTestAction: 'ab_test:focus_info',
      },
    })

    expect(mocks.handleAbTestCallback).not.toHaveBeenCalled()
    expect(response.text).toContain('ФОКУС')
    expect(response.buttons).toEqual([
      {
        label: 'ОПЛАТИТИ ФОКУС',
        kind: 'callback',
        value: 'open_focus_payment',
      },
    ])
    expect(response.cards).toEqual([])
    expect(response.media).toEqual([])
    expect(response.nextActions).toEqual([])
    expect(response.telemetry).toMatchObject({
      scenario: 'focus_info',
      source: 'pure_content_registry',
    })
  })
})
