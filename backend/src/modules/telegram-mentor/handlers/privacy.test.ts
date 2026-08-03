import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPlanMessage = vi.fn(async () => ({ message_id: 1 }))
const mockPlanAck = vi.fn(async () => true)
const mockSendStateMenu = vi.fn(async () => undefined)
const mockHandleStart = vi.fn(async () => undefined)
const mockResolveDecision = vi.fn(async () => ({ decision: { nextAction: 'noop' } }))
const mockRenderTelegram = vi.fn(async () => false)
const mockHandleAbTestCallback = vi.fn(async () => false)
const mockObserveAbTestCanonicalAction = vi.fn(async () => undefined)
const mockBuildHomeScreen = vi.fn(async () => ({
  text: 'Попереднє меню',
  reply_markup: {
    inline_keyboard: [[{ text: 'Кнопка меню', callback_data: 'menu' }]],
  },
  parseMode: 'HTML' as const,
}))
const mockWelcomeMessage = vi.fn(() => ({
  text: 'Guest menu',
  reply_markup: {
    inline_keyboard: [[{ text: 'Почати', callback_data: 'ab_test:start' }]],
  },
  parseMode: 'HTML' as const,
}))
const mockResolveLinkedUserIdFromContext = vi.fn(async () => 'user-1')
const mockResolveEffectiveStartLifecycleState = vi.fn(({ lifecycleState }) => lifecycleState)

vi.mock('../../../db/client.js', () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(async () => ({
        id: 'user-1',
        role: 'USER',
        activeRole: 'USER',
        lifecycleState: 'TEST_DONE',
        testStartedAt: null,
        testCompletedAt: null,
        offerShownAt: null,
        testResultType: 'decision',
        updatedAt: new Date('2026-08-03T10:00:00.000Z'),
        firstName: 'Надя',
      })),
    },
  },
}))

vi.mock('../../subscriptions/payments/focus.access.js', () => ({
  getUserAccessState: vi.fn(async () => null),
}))

vi.mock('@/products/ab-system/telegram/abTest.progress.js', () => ({
  loadAbTestProgress: vi.fn(async () => null),
}))

vi.mock('./abTest.start.js', () => ({
  welcomeMessage: (...args: unknown[]) => mockWelcomeMessage(...args),
}))

vi.mock('./homeScreen.builder.js', () => ({
  buildHomeScreen: (...args: unknown[]) => mockBuildHomeScreen(...args),
}))

vi.mock('./start.js', () => ({
  resolveLinkedUserIdFromContext: (...args: unknown[]) =>
    mockResolveLinkedUserIdFromContext(...args),
  resolveEffectiveStartLifecycleState: (...args: unknown[]) =>
    mockResolveEffectiveStartLifecycleState(...args),
  sendStateMenu: (...args: unknown[]) => mockSendStateMenu(...args),
  handleStart: (...args: unknown[]) => mockHandleStart(...args),
  getAccessAwareAppReplyMarkupForContext: vi.fn(async () => ({
    inline_keyboard: [[{ text: 'Mini App', callback_data: 'open_platform' }]],
  })),
}))

vi.mock('../runtime/botConfig.js', () => ({
  requireTelegramBotConfig: vi.fn(() => ({ username: 'Test_ABsystem_bot' })),
}))

vi.mock('../conversation/delivery/planDelivery.js', () => ({
  planMessage: (...args: unknown[]) => mockPlanMessage(...args),
  planAck: (...args: unknown[]) => mockPlanAck(...args),
}))

vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../core/decision/decision.resolver.js', () => ({
  resolveDecision: (...args: unknown[]) => mockResolveDecision(...args),
}))

vi.mock('../renderers/decisionTelegram.js', () => ({
  renderTelegram: (...args: unknown[]) => mockRenderTelegram(...args),
}))

vi.mock('../handlers/billing.js', () => ({
  handleBillingCheckout: vi.fn(),
  handleBillingPaywall: vi.fn(),
}))

vi.mock('../handlers/morning.js', () => ({
  handleMorning: vi.fn(),
  resumeQuestionSession: vi.fn(),
}))

vi.mock('../handlers/evening.js', () => ({
  handleEvening: vi.fn(),
}))

vi.mock('../handlers/status.js', () => ({
  handleStatus: vi.fn(),
}))

vi.mock('../handlers/tasks.js', () => ({
  handleTasks: vi.fn(),
  handleTaskDone: vi.fn(),
}))

vi.mock('../handlers/lidmagnet.js', () => ({
  handleLidmagnet: vi.fn(),
}))

vi.mock('../flows/leadMagnet.flow.js', () => ({
  startLeadMagnet: vi.fn(),
}))

vi.mock('./nudge.service.js', () => ({
  dismissNudges: vi.fn(),
}))

vi.mock('../session.js', () => ({
  getSession: vi.fn(async () => ({ userId: 'user-1' })),
}))

vi.mock('../../events/service.js', () => ({
  trackEvent: vi.fn(async () => undefined),
}))

vi.mock('../../../core/state-machine/ctaFoundation.js', () => ({
  CANONICAL_CTA_REGISTRY: {},
  resolveCanonicalCtaId: vi.fn(() => null),
  resolveCanonicalMessageKeyByCtaId: vi.fn(() => null),
}))

vi.mock('../../../core/state-machine/securityFoundation.js', () => ({
  buildRequestFingerprint: vi.fn(() => 'fingerprint'),
}))

vi.mock('../../../core/runtime/runtimeIdempotency.js', () => ({
  claimRuntimeEventReplay: vi.fn(async () => ({ duplicate: false })),
  buildRuntimeTelemetry: vi.fn(() => ({
    request_id: 'runtime-request',
    runtime_stage: 'telegram',
  })),
  withRuntimeAdvisoryLock: vi.fn(async (_input, callback) => ({
    acquired: true,
    value: await callback(),
  })),
}))

vi.mock('@/products/ab-system/telegram/abTest.service.js', () => ({
  handleAbTestCallback: (...args: unknown[]) => mockHandleAbTestCallback(...args),
  observeAbTestCanonicalAction: (...args: unknown[]) =>
    mockObserveAbTestCanonicalAction(...args),
}))

vi.mock('../../zoom/service.js', () => ({
  acceptSwapRequest: vi.fn(),
  bookPrivateSlot: vi.fn(),
  cancelPrivateBooking: vi.fn(),
  declineSwapRequest: vi.fn(),
  getUpcomingGroupSessions: vi.fn(),
  getCoachWeekSlots: vi.fn(),
  toggleCoachSlotStatus: vi.fn(),
}))

vi.mock('@/products/ab-system/content/abTest.zoom.js', () => ({
  abTestZoomContent: {},
}))

import { dispatchTelegramCallbackEvent } from '../services/telegram-event-bus.service.js'
import { handlePrivacy, handlePrivacyBack } from './privacy.js'

function createContext(messageText = '<b>Політика конфіденційності чат-бота</b>') {
  const ctx = {
    from: { id: 42, first_name: 'Надя' },
    chat: { id: 42 },
    state: { userId: 'user-1' },
    callbackQuery: {
      id: 'callback-1',
      data: 'privacy:back',
      message: {
        text: messageText,
      },
    },
    reply: vi.fn(async () => ({ message_id: 2 })),
    answerCbQuery: vi.fn(async () => true),
    editMessageText: vi.fn(async () => true),
    telegram: {
      answerCbQuery: vi.fn(async () => true),
    },
  }

  mockPlanMessage.mockImplementation(async (innerCtx, method, _key, text, replyMarkup, parseMode) => {
    if (method === 'ctx.editMessageText') {
      return innerCtx.editMessageText(text, {
        parse_mode: parseMode ?? 'HTML',
        reply_markup: replyMarkup,
      })
    }

    return innerCtx.reply(text, {
      parse_mode: parseMode ?? 'HTML',
      reply_markup: replyMarkup,
    })
  })

  mockPlanAck.mockImplementation(async (innerCtx) => innerCtx.answerCbQuery())

  return ctx
}

describe('privacy navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens privacy without mutating state and uses a dedicated privacy:back callback', async () => {
    const ctx = createContext()

    await handlePrivacy(ctx as never)

    expect(mockPlanMessage).toHaveBeenCalledWith(
      ctx,
      'ctx.reply',
      'privacy_policy',
      expect.stringContaining('Політика конфіденційності чат-бота'),
      {
        inline_keyboard: [[expect.objectContaining({ text: '← Повернутись', callback_data: 'privacy:back' })]],
      },
      'HTML',
    )
    expect(mockBuildHomeScreen).not.toHaveBeenCalled()
    expect(mockResolveDecision).not.toHaveBeenCalled()
    expect(mockSendStateMenu).not.toHaveBeenCalled()
    expect(mockHandleStart).not.toHaveBeenCalled()
  })

  it('restores the exact previous menu with one edit path and no new messages', async () => {
    const ctx = createContext()

    await handlePrivacyBack(ctx as never)

    expect(mockBuildHomeScreen).toHaveBeenCalledTimes(1)
    expect(ctx.editMessageText).toHaveBeenCalledTimes(1)
    expect(ctx.editMessageText).toHaveBeenCalledWith('Попереднє меню', {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: 'Кнопка меню', callback_data: 'menu' }]],
      },
    })
    expect(ctx.reply).not.toHaveBeenCalled()
    expect(String(ctx.editMessageText.mock.calls[0]?.[0] ?? '')).not.toContain('✨ Розпочати')
    expect(String(ctx.editMessageText.mock.calls[0]?.[0] ?? '')).not.toContain('у тебе вже є база')
    expect(mockResolveDecision).not.toHaveBeenCalled()
    expect(mockSendStateMenu).not.toHaveBeenCalled()
  })

  it('dispatches privacy:back once, acks once, and never falls through to generic fallback', async () => {
    const ctx = createContext()

    const handled = await dispatchTelegramCallbackEvent(ctx as never, 'privacy:back')

    expect(handled).toBe(true)
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(ctx.editMessageText).toHaveBeenCalledTimes(1)
    expect(ctx.reply).not.toHaveBeenCalled()
    expect(mockResolveDecision).not.toHaveBeenCalled()
    expect(mockSendStateMenu).not.toHaveBeenCalled()
    expect(mockHandleStart).not.toHaveBeenCalled()
    expect(mockHandleAbTestCallback).toHaveBeenCalledTimes(1)
  })

  it('acknowledges a repeated stale back click without rendering duplicates', async () => {
    const ctx = createContext('Попереднє меню')

    const handled = await dispatchTelegramCallbackEvent(ctx as never, 'privacy:back')

    expect(handled).toBe(true)
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(ctx.editMessageText).not.toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
    expect(mockResolveDecision).not.toHaveBeenCalled()
    expect(mockSendStateMenu).not.toHaveBeenCalled()
  })
})
