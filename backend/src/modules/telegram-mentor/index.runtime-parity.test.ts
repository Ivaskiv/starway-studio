import { afterEach, describe, expect, it, vi } from 'vitest'

type RegistrationEntry = {
  method: 'use' | 'command' | 'hears' | 'on' | 'catch'
  event: string
  handler: (...args: unknown[]) => unknown
}

type RegistrationSnapshot = {
  registrations: Array<Pick<RegistrationEntry, 'method' | 'event'>>
  startHandler: ((...args: unknown[]) => unknown) | undefined
}

const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv
})

async function registerMentorBotForEnv(
  env: 'development' | 'production',
): Promise<{
  snapshot: RegistrationSnapshot
  handleStartMock: ReturnType<typeof vi.fn>
}> {
  vi.resetModules()
  process.env.NODE_ENV = env

  const registrations: RegistrationEntry[] = []
  const commandHandlers = new Map<string, (...args: unknown[]) => unknown>()
  const botMock = {
    use: vi.fn((handler: (...args: unknown[]) => unknown) => {
      registrations.push({ method: 'use', event: 'middleware', handler })
      return botMock
    }),
    command: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      registrations.push({ method: 'command', event, handler })
      commandHandlers.set(event, handler)
      return botMock
    }),
    hears: vi.fn((pattern: RegExp, handler: (...args: unknown[]) => unknown) => {
      registrations.push({ method: 'hears', event: String(pattern), handler })
      return botMock
    }),
    on: vi.fn((event: string | string[], handler: (...args: unknown[]) => unknown) => {
      registrations.push({
        method: 'on',
        event: Array.isArray(event) ? event.join('|') : event,
        handler,
      })
      return botMock
    }),
    catch: vi.fn((handler: (...args: unknown[]) => unknown) => {
      registrations.push({ method: 'catch', event: 'error', handler })
      return botMock
    }),
  }

  const handleStartMock = vi.fn(async () => undefined)
  const mockNoop = vi.fn(async () => undefined)
  const mockFalse = vi.fn(async () => false)
  const mockNull = vi.fn(async () => null)

  vi.doMock('../../lib/telegram.js', () => ({
    bot: botMock,
    sendOpsTelegramMessage: mockNoop,
  }))
  vi.doMock('../../db/client.js', () => ({
    prisma: {
      user: { findFirst: mockNull },
      expert: { findFirst: mockNull },
      zoomSession: { findFirst: mockNull, findUnique: mockNull },
      zoomSessionAttendee: { findMany: vi.fn(async () => []) },
    },
  }))
  vi.doMock('../../utils/logger.js', () => ({
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }))
  vi.doMock('../../core/decision/decision.resolver.js', () => ({
    resolveDecision: mockNull,
    shouldRenderDecisionBeforeTransport: vi.fn(() => false),
  }))
  vi.doMock('../content-pipeline/pipeline.controller.js', () => ({
    dispatchPipelineCallback: mockFalse,
    registerPipelineCommands: vi.fn(),
  }))
  vi.doMock('../events/contentAttribution.service.js', () => ({
    trackDmStartFromContent: mockNoop,
  }))
  vi.doMock('../sales-assistant/sales-assistant.providers.js', () => ({
    callProviderSafe: mockNull,
  }))
  vi.doMock('../subscriptions/payments/callback.notifications.js', () => ({
    handleFocusChannelJoinByTelegramUserId: mockNoop,
    resendFocusAccessTelegramMessage: mockNoop,
    sendAbTestBlock12Welcome: mockNoop,
  }))
  vi.doMock('../subscriptions/payments/focus.access.js', () => ({
    hasActiveFocusSubscription: mockFalse,
  }))
  vi.doMock('../zoom/service.js', () => ({
    afterZoomOperation: mockNoop,
    createFullSession: mockNull,
    notifyMonthSchedule: mockNoop,
    syncChannelPost: mockNoop,
    updateSession: mockNull,
  }))
  vi.doMock('../zoom/zoom.channel-parser.js', () => ({
    parseZoomChannelPost: vi.fn(() => ({ isValid: false, errors: [] })),
  }))
  vi.doMock('./conversation/delivery/planDelivery.js', () => ({
    conversationOrchestrator: {
      patchContext: vi.fn(),
    },
    planAck: mockNoop,
    planMessage: mockNoop,
  }))
  vi.doMock('./core/guard.middleware.js', () => ({
    guard: async (_ctx: unknown, next: () => Promise<unknown>) => next(),
  }))
  vi.doMock('./core/state.service.js', () => ({
    resolveLinkedUserIdFromContext: mockNull,
  }))
  vi.doMock('./handlers/chat.js', () => ({
    handleChat: mockNoop,
  }))
  vi.doMock('./handlers/evening.js', () => ({
    handleEvening: mockNoop,
  }))
  vi.doMock('./handlers/morning.js', () => ({
    handleMorning: mockNoop,
  }))
  vi.doMock('./handlers/privacy.js', () => ({
    handlePrivacy: mockNoop,
  }))
  vi.doMock('./handlers/start.js', () => ({
    getAccessAwareAppReplyMarkupForContext: vi.fn(async () => undefined),
    handleStart: handleStartMock,
  }))
  vi.doMock('./handlers/status.js', () => ({
    handleStatus: mockNoop,
  }))
  vi.doMock('./handlers/voice.js', () => ({
    handleVoice: mockNoop,
  }))
  vi.doMock('./renderers/decisionTelegram.js', () => ({
    renderTelegram: mockFalse,
  }))
  vi.doMock('./services/ctaInteraction.service.js', () => ({
    recordTelegramCtaInteraction: mockNoop,
  }))
  vi.doMock('./services/telegram-event-bus.service.js', () => ({
    dispatchTelegramCallbackEvent: mockFalse,
  }))
  vi.doMock('./session.js', () => ({
    getSession: mockNull,
  }))
  vi.doMock('./router/messageRouter.js', () => ({
    routeTelegramTextMessage: mockFalse,
  }))
  vi.doMock('@/packages/abTestActions.js', () => ({
    AB_TEST_ACTIONS: {
      FOCUS_ALREADY_PAID: 'focus_already_paid',
    },
  }))
  vi.doMock('@/products/ab-system/telegram/abTest.service.js', () => ({
    handleAbTestCallback: mockFalse,
    markAbTestPaymentSuccess: mockNoop,
  }))
  vi.doMock('@/products/ab-system/telegram/abTest.flows.js', () => ({
    handlePendingFocusPaymentEvidenceAttachment: mockFalse,
    handlePendingFocusPaymentEvidenceText: mockFalse,
  }))
  vi.doMock('@starway/ai/providers/routing', () => ({
    resolveModelStrategyTier: vi.fn(() => 'raw_truth'),
  }))

  const { registerMentorBot } = await import('./index.js')
  await registerMentorBot()

  return {
    snapshot: {
      registrations: registrations.map(({ method, event }) => ({ method, event })),
      startHandler: commandHandlers.get('start'),
    },
    handleStartMock,
  }
}

describe('registerMentorBot runtime parity', () => {
  it.each(['development', 'production'] as const)(
    'registers the canonical /start owner in %s',
    async (env) => {
      const { snapshot, handleStartMock } = await registerMentorBotForEnv(env)

      expect(snapshot.registrations).toContainEqual({
        method: 'command',
        event: 'start',
      })
      expect(snapshot.registrations).toContainEqual({
        method: 'on',
        event: 'text',
      })
      expect(snapshot.registrations).toContainEqual({
        method: 'on',
        event: 'callback_query',
      })

      expect(snapshot.startHandler).toBeTypeOf('function')
      await snapshot.startHandler?.({ state: {} })
      expect(handleStartMock).toHaveBeenCalledTimes(1)
    },
  )

  it('keeps one identical runtime registration graph in development and production', async () => {
    const development = await registerMentorBotForEnv('development')
    const production = await registerMentorBotForEnv('production')

    expect(development.snapshot.registrations).toEqual(
      production.snapshot.registrations,
    )
  })
})
