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
  planMessageMock: ReturnType<typeof vi.fn>
  debugStateHandler: ((...args: unknown[]) => unknown) | undefined
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
  const planMessageMock = vi.fn(async () => undefined)
  const buildTelegramDebugStateMessagesMock = vi.fn(async () => [
    '<b>DEBUG STATE</b>\n\nchunk-1',
    '<b>DEBUG STATE</b>\n\nchunk-2',
  ])

  vi.doMock('@/lib/telegram.js', () => ({
    bot: botMock,
    sendOpsTelegramMessage: mockNoop,
  }))
  vi.doMock('@/db/client.js', () => ({
    prisma: {
      user: { findFirst: mockNull },
      expert: { findFirst: mockNull },
      zoomSession: { findFirst: mockNull, findUnique: mockNull },
      zoomSessionAttendee: { findMany: vi.fn(async () => []) },
    },
  }))
  vi.doMock('@/utils/logger.js', () => ({
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
  vi.doMock('@/modules/content-pipeline/pipeline.controller.js', () => ({
    dispatchPipelineCallback: mockFalse,
    registerPipelineCommands: vi.fn(),
  }))
  vi.doMock('../../events/contentAttribution.service.ts', () => ({
    trackDmStartFromContent: mockNoop,
  }))
  vi.doMock('../../sales-assistant/sales-assistant.providers.ts', () => ({
    callProviderSafe: mockNull,
  }))
  vi.doMock('@/modules/subscriptions/payments/callback/notifications.js', () => ({
    handleFocusChannelJoinByTelegramUserId: mockNoop,
    resendFocusAccessTelegramMessage: mockNoop,
    sendAbTestBlock12Welcome: mockNoop,
  }))
  vi.doMock('@/modules/subscriptions/payments/focus-access.js', () => ({
    hasActiveFocusSubscription: mockFalse,
  }))
  vi.doMock('@/modules/zoom/service.js', () => ({
    afterZoomOperation: mockNoop,
    createFullSession: mockNull,
    notifyMonthSchedule: mockNoop,
    syncChannelPost: mockNoop,
    updateSession: mockNull,
  }))
  vi.doMock('../../zoom/shared/zoom-channel-parser.js', () => ({
    parseZoomChannelPost: vi.fn(() => ({ isValid: false, errors: [] })),
  }))
  vi.doMock('@/modules/telegram-mentor/conversation/delivery/planDelivery.js', () => ({
    conversationOrchestrator: {
      patchContext: vi.fn(),
    },
    planAck: mockNoop,
    planMessage: planMessageMock,
  }))
  vi.doMock('@/modules/telegram-mentor/core/guard.middleware.js', () => ({
    guard: async (_ctx: unknown, next: () => Promise<unknown>) => next(),
  }))
  vi.doMock('@/modules/telegram-mentor/core/state.service.js', () => ({
    resolveLinkedUserIdFromContext: mockNull,
  }))
  vi.doMock('../handlers/chat.js', () => ({
    handleChat: mockNoop,
  }))
  vi.doMock('@/modules/telegram-mentor/handlers/evening.js', () => ({
    handleEvening: mockNoop,
  }))
  vi.doMock('@/modules/telegram-mentor/handlers/morning.js', () => ({
    handleMorning: mockNoop,
  }))
  vi.doMock('@/modules/telegram-mentor/handlers/privacy.js', () => ({
    handlePrivacy: mockNoop,
  }))
  vi.doMock('@/modules/telegram-mentor/handlers/start.js', () => ({
    getAccessAwareAppReplyMarkupForContext: vi.fn(async () => undefined),
    handleStart: handleStartMock,
  }))
  vi.doMock('@/modules/telegram-mentor/handlers/status.js', () => ({
    handleStatus: mockNoop,
  }))
  vi.doMock('@/modules/telegram-mentor/runtime/parity.js', () => ({
    buildTelegramDebugStateMessages: buildTelegramDebugStateMessagesMock,
  }))
  vi.doMock('../handlers/voice.js', () => ({
    handleVoice: mockNoop,
  }))
  vi.doMock('../renderers/decisionTelegram.js', () => ({
    renderTelegram: mockFalse,
  }))
  vi.doMock('../services/engagement/cta.js', () => ({
    recordTelegramCtaInteraction: mockNoop,
  }))
  vi.doMock('../services/delivery/event-bus/index.js', () => ({
    dispatchTelegramCallbackEvent: mockFalse,
  }))
  vi.doMock('../session.js', () => ({
    getSession: mockNull,
  }))
  vi.doMock('../router/messageRouter.js', () => ({
    routeTelegramTextMessage: mockFalse,
  }))
  vi.doMock('@/modules/telegram-mentor/bot/messages.js', () => ({
    registerMessageHandlers: vi.fn(() => {
      botMock.on('text', mockNoop)
    }),
  }))
  vi.doMock('@/modules/telegram-mentor/bot/callback.js', () => ({
    registerCallbackHandler: vi.fn(() => {
      botMock.on('callback_query', mockNoop)
    }),
  }))
  vi.doMock('@/modules/telegram-mentor/bot/channel.js', () => ({
    registerChannelHandlers: vi.fn(),
  }))
  vi.doMock('@/modules/telegram-mentor/bot/zoom-admin.js', () => ({
    registerZoomAdminHandlers: vi.fn(),
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

  const { registerMentorBot } = await import('@/modules/telegram-mentor/bot/register.js')
  await registerMentorBot()

  return {
    snapshot: {
      registrations: registrations.map(({ method, event }) => ({ method, event })),
      startHandler: commandHandlers.get('start'),
      debugStateHandler: commandHandlers.get('debug_state'),
    },
    handleStartMock,
    planMessageMock,
    debugStateHandler: commandHandlers.get('debug_state'),
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
        method: 'command',
        event: 'debug_state',
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

  it('does not register coach-only commands or callback namespaces on the user bot runtime', async () => {
    const { snapshot } = await registerMentorBotForEnv('development')

    expect(snapshot.registrations).not.toContainEqual({
      method: 'command',
      event: 'schedule',
    })
    expect(snapshot.registrations).not.toContainEqual({
      method: 'command',
      event: 'start-day',
    })
    expect(snapshot.registrations.some(({ event }) => event.includes('coach:'))).toBe(false)
  })

  it('returns the debug snapshot through the canonical delivery layer in development', async () => {
    const { debugStateHandler, planMessageMock } = await registerMentorBotForEnv('development')

    await debugStateHandler?.({
      state: { userId: 'user-123' },
    })

    expect(planMessageMock).toHaveBeenCalledTimes(2)
    expect(planMessageMock.mock.calls[0]?.[2]).toBe('telegram_debug_state_1')
    expect(planMessageMock.mock.calls[1]?.[2]).toBe('telegram_debug_state_2')
    expect(planMessageMock.mock.calls[0]?.[3]).toContain('chunk-1')
  })

  it('blocks the debug snapshot command in production', async () => {
    const { debugStateHandler, planMessageMock } = await registerMentorBotForEnv('production')

    await debugStateHandler?.({
      state: { userId: 'user-123' },
    })

    expect(planMessageMock).toHaveBeenCalledTimes(1)
    expect(planMessageMock.mock.calls[0]?.[2]).toBe('telegram_debug_state_unavailable')
    expect(planMessageMock.mock.calls[0]?.[3]).toContain('недоступна у production')
  })
})
