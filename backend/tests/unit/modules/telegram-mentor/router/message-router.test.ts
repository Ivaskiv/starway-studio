import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Context } from 'telegraf'

const mocks = vi.hoisted(() => ({
  handleAbTestCallback: vi.fn(),
  handleAbTestEmailCaptureText: vi.fn(),
  detectTelegramIntelligenceMessageType: vi.fn(),
  handleStatus: vi.fn(),
  handleMorningAnswer: vi.fn(),
  handleEveningAnswer: vi.fn(),
  handlePendingTelegramIdentityText: vi.fn(),
  sendEntryOffer: vi.fn(),
  sendStateMenu: vi.fn(),
  hasPendingName: vi.fn(),
  clearPendingName: vi.fn(),
  getSession: vi.fn(),
  parseQuestionState: vi.fn(),
  planMessage: vi.fn(),
  gatewayExecute: vi.fn(),
  getConversationHistory: vi.fn(),
  resolveTelegramIntelligence: vi.fn(),
  getTelegramAiRequestContext: vi.fn(),
  appendTelegramConversationTurn: vi.fn(),
  loadAbTestProgress: vi.fn(),
  renderCurrentView: vi.fn(),
}))

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}))

vi.mock('@/products/ab-system/telegram/service.js', () => ({
  handleAbTestCallback: mocks.handleAbTestCallback,
  handleAbTestEmailCaptureText: mocks.handleAbTestEmailCaptureText,
}))

vi.mock('../../handlers/intelligence.handler.ts', () => ({
  detectTelegramIntelligenceMessageType: mocks.detectTelegramIntelligenceMessageType,
}))

vi.mock('../../handlers/status.ts', () => ({
  handleStatus: mocks.handleStatus,
}))

vi.mock('../../handlers/morning.ts', () => ({
  handleMorningAnswer: mocks.handleMorningAnswer,
}))

vi.mock('../../handlers/evening.ts', () => ({
  handleEveningAnswer: mocks.handleEveningAnswer,
}))

vi.mock('../../handlers/start.ts', () => ({
  handlePendingTelegramIdentityText: mocks.handlePendingTelegramIdentityText,
  sendEntryOffer: mocks.sendEntryOffer,
}))

vi.mock('../../handlers/start.menu.ts', () => ({
  sendStateMenu: mocks.sendStateMenu,
}))

vi.mock('../../services/identity/pending.ts', () => ({
  hasPendingName: mocks.hasPendingName,
  clearPendingName: mocks.clearPendingName,
}))

vi.mock('../../session.ts', () => ({
  getSession: mocks.getSession,
  parseQuestionState: mocks.parseQuestionState,
}))

vi.mock('../../conversation/delivery/planDelivery.ts', () => ({
  planMessage: mocks.planMessage,
}))

vi.mock('../../../ai/gateway/index.ts', () => ({
  getTelegramAgentGateway: () => ({
    execute: mocks.gatewayExecute,
  }),
}))

vi.mock('../../../../services/claude-intelligence.service.ts', () => ({
  claudeIntelligenceService: {
    getConversationHistory: mocks.getConversationHistory,
  },
}))

vi.mock('../../services/context/intelligence.ts', () => ({
  resolveTelegramIntelligence: mocks.resolveTelegramIntelligence,
  appendTelegramConversationTurn: mocks.appendTelegramConversationTurn,
  resolveTelegramSupportUrl: vi.fn(() => 'https://support.example/demo'),
}))

vi.mock('../../services/context/request.ts', () => ({
  getTelegramAiRequestContext: mocks.getTelegramAiRequestContext,
}))

vi.mock('@/products/ab-system/telegram/progress.js', () => ({
  loadAbTestProgress: mocks.loadAbTestProgress,
}))

vi.mock('@/products/ab-system/telegram/views/index.js', () => ({
  renderCurrentView: mocks.renderCurrentView,
}))

import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { resolveTelegramTextRoute, routeTelegramTextMessage } from '../messageRouter.ts'

function createContext(text: string, userId: string | null = 'user-1'): Context {
  return {
    message: { text },
    chat: { id: 12345 },
    from: { id: 777 },
    state: { userId },
    reply: vi.fn(),
    sendChatAction: vi.fn(async () => true),
    telegram: {
      sendMessage: vi.fn(),
    },
    update: { update_id: 1 },
  } as unknown as Context
}

describe('resolveTelegramTextRoute', () => {
  beforeEach(() => {
    mocks.detectTelegramIntelligenceMessageType.mockReset()
  })

  it.each([
    ['Привіт', 'greeting', 'intelligence'],
    ['Добрий день', 'greeting', 'intelligence'],
    ['Хочу у ФОКУС', 'focus_related', 'intelligence'],
    ['Покажи статус підписки', 'focus_related', 'intelligence'],
    ['Проблема з оплатою', 'payment_issue', 'intelligence'],
    ['Допомога', 'navigation', 'intelligence'],
    ['Мої Zoom', 'navigation', 'intelligence'],
    ['Скасувати', 'cancel', 'menu'],
    ['Невідомий текст', 'unknown', 'intelligence'],
  ])('maps "%s" to %s / %s', (input, intent, scenario) => {
    mocks.detectTelegramIntelligenceMessageType.mockReturnValue('UNKNOWN')
    const route = resolveTelegramTextRoute(input)
    expect(route.intent).toBe(intent)
    expect(route.scenario).toBe(scenario)
  })
})

describe('routeTelegramTextMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasPendingName.mockResolvedValue(false)
    mocks.handleAbTestEmailCaptureText.mockResolvedValue(false)
    mocks.handlePendingTelegramIdentityText.mockResolvedValue(false)
    mocks.getSession.mockResolvedValue(null)
    mocks.parseQuestionState.mockReturnValue(null)
    mocks.handleAbTestCallback.mockResolvedValue(true)
    mocks.planMessage.mockResolvedValue(true)
    mocks.gatewayExecute.mockResolvedValue({
      agentId: 'mentor_agent',
      artifact: {
        type: 'mentor_response_artifact',
        payload: { response: 'AI reply', followUp: 'Що далі?' },
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
    mocks.appendTelegramConversationTurn.mockResolvedValue(undefined)
    mocks.loadAbTestProgress.mockResolvedValue(null)
    mocks.renderCurrentView.mockResolvedValue(undefined)
    mocks.getTelegramAiRequestContext.mockResolvedValue({
      chatId: '12345',
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
    })
  })

  it('routes subscription requests through the AI assistant scenario', async () => {
    const handled = await routeTelegramTextMessage(createContext('Покажи статус підписки'), 'Покажи статус підписки')

    expect(handled).toBe(true)
    expect(mocks.gatewayExecute).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'telegram_assistant',
      message: 'Покажи статус підписки',
      requestContext: expect.objectContaining({
        chatId: '12345',
        userId: 'user-1',
      }),
    }))
    expect(mocks.handleAbTestCallback).not.toHaveBeenCalled()
    expect(mocks.planMessage).toHaveBeenCalledTimes(1)
  })

  it('routes greeting through intelligence as greeting scenario', async () => {
    mocks.gatewayExecute.mockResolvedValueOnce({
      agentId: 'mentor_agent',
      artifact: {
        type: 'mentor_response_artifact',
        payload: { response: 'Привіт' },
      },
    })
    mocks.detectTelegramIntelligenceMessageType.mockReturnValue('SMALL_TALK')

    const ctx = createContext('Привіт')
    const handled = await routeTelegramTextMessage(ctx, 'Привіт')

    expect(handled).toBe(true)
    expect(mocks.gatewayExecute).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'telegram_assistant',
      message: 'Привіт',
    }))
    expect(mocks.planMessage).toHaveBeenCalledWith(
      ctx,
      'ctx.reply',
      'conversation_engine_response',
      'Привіт',
      undefined,
    )
    expect(mocks.handleAbTestCallback).not.toHaveBeenCalled()
  })

  it('routes help through the AI assistant path', async () => {
    const handled = await routeTelegramTextMessage(createContext('Допомога', 'user-42'), 'Допомога')

    expect(handled).toBe(true)
    expect(mocks.gatewayExecute).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'telegram_assistant',
      message: 'Допомога',
    }))
    expect(mocks.sendStateMenu).not.toHaveBeenCalled()
  })

  it('routes zoom requests through the AI assistant path', async () => {
    const handled = await routeTelegramTextMessage(createContext('Мої Zoom'), 'Мої Zoom')

    expect(handled).toBe(true)
    expect(mocks.gatewayExecute).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'telegram_assistant',
      message: 'Мої Zoom',
    }))
    expect(mocks.handleStatus).not.toHaveBeenCalled()
  })

  it('routes focus info through the AI assistant path', async () => {
    const ctx = createContext('Хочу у ФОКУС')

    const handled = await routeTelegramTextMessage(ctx, 'Хочу у ФОКУС')

    expect(handled).toBe(true)
    expect(mocks.handleAbTestCallback).not.toHaveBeenCalled()
    expect(mocks.gatewayExecute).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'telegram_assistant',
      message: 'Хочу у ФОКУС',
    }))
    expect(mocks.planMessage).toHaveBeenCalledTimes(1)
    expect(mocks.planMessage).toHaveBeenCalledWith(
      ctx,
      'ctx.reply',
      'conversation_engine_response',
      'AI reply\n\nЩо далі?',
      undefined,
    )
  })

  it('does not launch the AI gateway for unknown text and returns a neutral scope fallback', async () => {
    mocks.detectTelegramIntelligenceMessageType.mockReturnValue('UNKNOWN')
    const ctx = createContext('Підкажи щось')

    const handled = await routeTelegramTextMessage(ctx, 'Підкажи щось')

    expect(handled).toBe(true)
    expect(mocks.gatewayExecute).not.toHaveBeenCalled()
    expect(mocks.planMessage).toHaveBeenCalledWith(
      ctx,
      'ctx.reply',
      'conversation_engine_response',
      'Я допомагаю з ФОКУСОМ, Zoom-практиками, прогресом і функціями ABSystem. Обери потрібний розділ у меню або напиши конкретне питання про платформу.',
      undefined,
    )
  })

  it('uses the same neutral scope fallback when the AI gateway fails', async () => {
    mocks.gatewayExecute.mockRejectedValueOnce(new Error('gateway down'))
    const ctx = createContext('Допомога')

    const handled = await routeTelegramTextMessage(ctx, 'Допомога')

    expect(handled).toBe(true)
    expect(mocks.gatewayExecute).toHaveBeenCalledTimes(1)
    expect(mocks.planMessage).toHaveBeenCalledWith(
      ctx,
      'ctx.reply',
      'conversation_engine_response',
      'Я допомагаю з ФОКУСОМ, Zoom-практиками, прогресом і функціями ABSystem. Обери потрібний розділ у меню або напиши конкретне питання про платформу.',
      undefined,
    )
  })

  it('re-renders the current AB-test question when free text arrives mid-test', async () => {
    mocks.detectTelegramIntelligenceMessageType.mockReturnValue('UNKNOWN')
    mocks.loadAbTestProgress.mockResolvedValue({
      status: 'active',
      current_question_id: 'q2',
    })
    const ctx = createContext('щось не те', 'user-7')

    const handled = await routeTelegramTextMessage(ctx, 'щось не те')

    expect(handled).toBe(true)
    expect(mocks.renderCurrentView).toHaveBeenCalledWith(
      ctx,
      'user-7',
      expect.objectContaining({
        status: 'active',
        current_question_id: 'q2',
      }),
    )
    expect(mocks.gatewayExecute).not.toHaveBeenCalled()
    expect(mocks.planMessage).not.toHaveBeenCalled()
  })

  it('suggests /start when the message looks like a mistyped start command', async () => {
    const ctx = createContext('#Start', null)

    const handled = await routeTelegramTextMessage(ctx, '#Start')

    expect(handled).toBe(true)
    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith(
      '12345',
      'Можливо, ти мала на увазі команду /start? Натисни її внизу, щоб продовжити.',
    )
    expect(mocks.gatewayExecute).not.toHaveBeenCalled()
  })
})
