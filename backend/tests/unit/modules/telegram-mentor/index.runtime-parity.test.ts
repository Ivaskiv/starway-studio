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

  vi.doMock('../../../lib/telegram.ts', () => ({
    bot: botMock,
    sendOpsTelegramMessage: mockNoop,
  }))
  vi.doMock('../../../db/client.ts', () => ({
    prisma: {
      user: { findFirst: mockNull },
      expert: { findFirst: mockNull },
      zoomSession: { findFirst: mockNull, findUnique: mockNull },
      zoomSessionAttendee: { findMany: vi.fn(async () => []) },
    },
  }))
  vi.doMock('../../../utils/logger.ts', () => ({
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }))
  vi.doMock('../../../core/decision/decision.resolver.ts', () => ({
    resolveDecision: mockNull,
    shouldRenderDecisionBeforeTransport: vi.fn(() => false),
  }))
  vi.doMock('../../content-pipeline/pipeline.controller.ts', () => ({
    dispatchPipelineCallback: mockFalse,
    registerPipelineCommands: vi.fn(),
  }))
  vi.doMock('../../events/contentAttribution.service.ts', () => ({
    trackDmStartFromContent: mockNoop,
  }))
  vi.doMock('../../sales-assistant/sales-assistant.providers.ts', () => ({
    callProviderSafe: mockNull,
  }))
  vi.doMock('../../subscriptions/payments/callback.notifications.ts', () => ({
    handleFocusChannelJoinByTelegramUserId: mockNoop,
    resendFocusAccessTelegramMessage: mockNoop,
    sendAbTestBlock12Welcome: mockNoop,
  }))
  vi.doMock('../../subscriptions/payments/focus.access.ts', () => ({
    hasActiveFocusSubscription: mockFalse,
  }))
  vi.doMock('../../zoom/service.ts', () => ({
    afterZoomOperation: mockNoop,
    createFullSession: mockNull,
    notifyMonthSchedule: mockNoop,
    syncChannelPost: mockNoop,
    updateSession: mockNull,
  }))
  vi.doMock('../../zoom/shared/zoom.channel-parser.ts', () => ({
    parseZoomChannelPost: vi.fn(() => ({ isValid: false, errors: [] })),
  }))
  vi.doMock('../conversation/delivery/planDelivery.ts', () => ({
    conversationOrchestrator: {
      patchContext: vi.fn(),
    },
    planAck: mockNoop,
    planMessage: mockNoop,
  }))
  vi.doMock('../core/guard.middleware.ts', () => ({
    guard: async (_ctx: unknown, next: () => Promise<unknown>) => next(),
  }))
  vi.doMock('../core/state.service.ts', () => ({
    resolveLinkedUserIdFromContext: mockNull,
  }))
  vi.doMock('../handlers/chat.ts', () => ({
    handleChat: mockNoop,
  }))
  vi.doMock('../handlers/evening.ts', () => ({
    handleEvening: mockNoop,
  }))
  vi.doMock('../handlers/morning.ts', () => ({
    handleMorning: mockNoop,
  }))
  vi.doMock('../handlers/privacy.ts', () => ({
    handlePrivacy: mockNoop,
  }))
  vi.doMock('../handlers/start.ts', () => ({
    getAccessAwareAppReplyMarkupForContext: vi.fn(async () => undefined),
    handleStart: handleStartMock,
  }))
  vi.doMock('../handlers/status.ts', () => ({
    handleStatus: mockNoop,
  }))
  vi.doMock('../handlers/voice.ts', () => ({
    handleVoice: mockNoop,
  }))
  vi.doMock('../renderers/decisionTelegram.ts', () => ({
    renderTelegram: mockFalse,
  }))
  vi.doMock('../services/engagement/cta.ts', () => ({
    recordTelegramCtaInteraction: mockNoop,
  }))
  vi.doMock('../services/delivery/event-bus/index.ts', () => ({
    dispatchTelegramCallbackEvent: mockFalse,
  }))
  vi.doMock('../session.ts', () => ({
    getSession: mockNull,
  }))
  vi.doMock('../router/messageRouter.ts', () => ({
    routeTelegramTextMessage: mockFalse,
  }))
  vi.doMock('@/packages/abTestActions.js', () => ({
    AB_TEST_ACTIONS: {
      FOCUS_ALREADY_PAID: 'focus_already_paid',
    },
  }))
  vi.doMock('@/products/ab-system/telegram/service.js', () => ({
    handleAbTestCallback: mockFalse,
    markAbTestPaymentSuccess: mockNoop,
  }))
  vi.doMock('@/products/ab-system/telegram/flow.js', () => ({
    handlePendingFocusPaymentEvidenceAttachment: mockFalse,
    handlePendingFocusPaymentEvidenceText: mockFalse,
  }))
  vi.doMock('@starway/ai/providers/routing', () => ({
    resolveModelStrategyTier: vi.fn(() => 'raw_truth'),
  }))

  const { registerMentorBot } = await import('../index.ts')
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
