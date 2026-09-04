import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.JWT_ACCESS_SECRET = 'test-access-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    zoomSession: {
      findFirst: vi.fn(),
    },
    checkoutSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    paymentLog: {
      findUnique: vi.fn(),
    },
    productSubscription: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('../../../../../src/modules/subscriptions/payments/activation.ts', () => ({
  activateProductSubscription: vi.fn(),
}))

vi.mock('../../../../../src/modules/subscriptions/payments/business/processing.ts', () => ({
  processEcosystemPayment: vi.fn(),
}))

vi.mock('../../../../../src/modules/subscriptions/payments/callback/notifications.ts', () => ({
  sendAbTestBlock12Welcome: vi.fn(),
  sendFocusPaymentSuccessTelegramMessageByOrder: vi.fn(),
  notifyUserFocusPaymentIssueDenied: vi.fn(),
  sendTrialZoomPaymentSuccessTelegramMessage: vi.fn(),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/index.js', () => ({
  handleCoachAudioCommand: vi.fn(),
  handleCoachNotifyCommand: vi.fn(),
  handleCoachPaymentsCommand: vi.fn(),
  handleCoachUsersCommand: vi.fn(),
  PARTICIPANTS_UPCOMING_CALLBACK: 'coach-content:users:upcoming',
  validateCoachContentCatalog: vi.fn(),
}))

vi.mock('../../../../../src/bot/handlers/coach/analytics.ts', () => ({
  analyticsHandler: vi.fn(),
}))

vi.mock('../../../../../src/bot/handlers/coach/schedule.ts', () => ({
  hoursMenuHandler: vi.fn(),
  nextWeekDoneHandler: vi.fn(),
  nextWeekMenuHandler: vi.fn(),
  nextWeekNoopHandler: vi.fn(),
  scheduleMenuHandler: vi.fn(),
  scheduleToggleHandler: vi.fn(),
  toggleDayHandler: vi.fn(),
  toggleHourHandler: vi.fn(),
}))

vi.mock('../../../../../src/config/webapp.ts', () => ({
  resolveTelegramWebappBaseUrl: vi.fn(() => 'https://miniapp.example'),
  resolveCoachWebAppBaseUrl: vi.fn(() => 'https://miniapp.example'),
}))

vi.mock('../../../../../src/modules/deeplinks/service.ts', () => ({
  generateCoachZoomWebDeepLink: vi.fn(async () => 'https://miniapp.example/app/dashboard/zoom?dl=coach-zoom-token'),
  generateCoachAgentsWebDeepLink: vi.fn(async () => 'https://miniapp.example/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-agents-token'),
  COACH_AGENTS_RETURN_TARGET: '/app/dashboard/admin/studio?tab=agents&item=agents.overview',
  generateDeepLink: vi.fn(async () => ({
    token: 'coach-agents-token',
    path: '/app/dashboard/admin/studio?tab=agents&item=agents.overview',
  })),
  buildWebDeepLink: vi.fn((token: string, path?: string | null) => {
    const url = new URL(path ?? '/onboarding/continue', 'https://miniapp.example')
    url.searchParams.set('dl', token)
    return url.toString()
  }),
}))

vi.mock('../../../../../src/modules/ai-operator/operator.service.ts', () => ({
  AI_OPERATOR_ACTIONS: {},
  isCoachDialogueAwaiting: vi.fn(async () => false),
  isCoachPostEditingActive: vi.fn(async () => false),
  runCoachOperatorAction: vi.fn(),
  runCoachStartDay: vi.fn(),
  submitCoachDialogues: vi.fn(),
  submitCoachEditedPost: vi.fn(),
}))

vi.mock('../../../../../src/modules/telegram-mentor/handlers/start.ts', () => ({
  handleStart: vi.fn(async (ctx: { reply: (...args: any[]) => Promise<unknown> }) => {
    await ctx.reply('user-flow')
  }),
}))

vi.mock('../../../../../src/scripts/user-sync-test-state.ts', () => ({
  switchLocalTestPersona: vi.fn(async ({ telegramId, testRole }: { telegramId: string; testRole: string }) => ({
    telegramId,
    userId: 'coach-user-id',
    persistedRole: 'SUPERADMIN',
    activeRole: testRole,
  })),
}))

import { prisma } from '../../../../../src/db/client.ts'
import { handleStart } from '../../../../../src/modules/telegram-mentor/handlers/start.ts'
import { processEcosystemPayment } from '../../../../../src/modules/subscriptions/payments/business/processing.ts'
import { activateProductSubscription } from '../../../../../src/modules/subscriptions/payments/activation.ts'
import {
  notifyUserFocusPaymentIssueDenied,
  sendAbTestBlock12Welcome,
  sendFocusPaymentSuccessTelegramMessageByOrder,
  sendTrialZoomPaymentSuccessTelegramMessage,
} from '../../../../../src/modules/subscriptions/payments/callback/notifications.ts'
import {
  generateCoachAgentsWebDeepLink,
  generateCoachZoomWebDeepLink,
} from '../../../../../src/modules/deeplinks/service.ts'
import { switchLocalTestPersona } from '../../../../../src/scripts/user-sync-test-state.ts'

type RegisteredHandler = (ctx: any) => Promise<unknown> | unknown
let coachBotContent: typeof import('../../../../../src/bot/content/coachBot.content.ts').coachBotContent
let registerCoachBotHandlers: typeof import('../../../../../src/bot/handlers/coach/register.ts').registerCoachBotHandlers

function createTelegramBotMock() {
  return {
    use: vi.fn(),
    start: vi.fn(),
    command: vi.fn(),
    hears: vi.fn(),
    action: vi.fn(),
  }
}

function createCoachCtx() {
  return {
    chat: { id: 42, type: 'private' },
    from: { id: 99 },
    reply: vi.fn(async () => undefined),
    answerCbQuery: vi.fn(async () => undefined),
  }
}

describe('registerCoachBotHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.COACH_TELEGRAM_ID
    delete process.env.TEST_COACH_MENTOR_TELEGRAM_ID
    process.env.NODE_ENV = 'test'
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      role: 'EXPERT',
      activeRole: 'EXPERT',
      id: 'coach-user-id',
      expertId: null,
    } as never)
    vi.mocked(prisma.zoomSession.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.checkoutSession.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.checkoutSession.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.paymentLog.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.productSubscription.findFirst).mockResolvedValue(null as never)
    vi.mocked(activateProductSubscription).mockResolvedValue({ success: true } as never)
    vi.mocked(processEcosystemPayment).mockResolvedValue({ status: 'approved' } as never)
    vi.mocked(sendAbTestBlock12Welcome).mockResolvedValue(undefined as never)
    vi.mocked(sendFocusPaymentSuccessTelegramMessageByOrder).mockResolvedValue(true as never)
    vi.mocked(notifyUserFocusPaymentIssueDenied).mockResolvedValue(true as never)
    vi.mocked(sendTrialZoomPaymentSuccessTelegramMessage).mockResolvedValue(true as never)
  })

  beforeEach(async () => {
    ;({ coachBotContent } = await import('../../../../../src/bot/content/coachBot.content.ts'))
    ;({ registerCoachBotHandlers } = await import('../../../../../src/bot/handlers/coach/register.ts'))
  })

  it('renders the professional coach workspace on /start without user funnel actions', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledTimes(1)
    const [text, payload] = ctx.reply.mock.calls[0]
    expect(text).toContain(coachBotContent.start.title)
    expect(text).toContain(coachBotContent.start.upcomingTitle)
    expect(payload.reply_markup.keyboard).toEqual([
      [coachBotContent.menu.conduct, coachBotContent.menu.calendar],
      [coachBotContent.menu.members, coachBotContent.menu.agents],
      [coachBotContent.menu.analytics, coachBotContent.menu.content],
      [coachBotContent.menu.notifications, coachBotContent.menu.payments],
    ])

    const flat = JSON.stringify(payload.reply_markup.keyboard)
    expect(flat).not.toContain('Продовжити')
    expect(flat).not.toContain('План дня')
    expect(flat).not.toContain('ФОКУС')
    expect(flat).not.toContain(coachBotContent.menu.settings)
  })

  it('opens agents menu with authenticated deeplink to admin studio agents tab', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const hearsCall = telegramBot.hears.mock.calls.find(([matcher]) =>
      matcher instanceof RegExp && matcher.test(coachBotContent.menu.agents),
    )
    const handler = hearsCall?.[1] as RegisteredHandler
    const ctx = createCoachCtx()

    await handler(ctx)

    expect(generateCoachAgentsWebDeepLink).toHaveBeenCalledWith('coach-user-id')

    expect(ctx.reply).toHaveBeenCalledWith(
      `${coachBotContent.system.agentsTitle}\n\n${coachBotContent.system.agentsSubtitle}`,
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [[expect.objectContaining({
            text: coachBotContent.system.agentsCta,
            web_app: {
              url: 'https://miniapp.example/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-agents-token',
            },
          })]],
        }),
      }),
    )
  })

  it('opens calendar menu with authenticated deeplink to the staff zoom workspace', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const hearsCall = telegramBot.hears.mock.calls.find(([matcher]) =>
      matcher instanceof RegExp && matcher.test(coachBotContent.menu.calendar),
    )
    const handler = hearsCall?.[1] as RegisteredHandler
    const ctx = createCoachCtx()

    await handler(ctx)

    expect(generateCoachZoomWebDeepLink).toHaveBeenCalledWith('coach-user-id')
    expect(ctx.reply).toHaveBeenCalledWith(
      `${coachBotContent.system.calendarTitle}\n\n${coachBotContent.system.calendarSubtitle}`,
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [[expect.objectContaining({
            text: coachBotContent.system.calendarCta,
            web_app: {
              url: 'https://miniapp.example/app/dashboard/zoom?dl=coach-zoom-token',
            },
          })]],
        }),
      }),
    )
  })

  it('allows configured coach telegram id even when DB role lookup is absent', async () => {
    process.env.COACH_TELEGRAM_ID = '99'
    vi.mocked(prisma.user.findFirst)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        id: 'coach-superadmin-id',
        expertId: null,
      } as never)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        id: 'coach-superadmin-id',
        expertId: null,
      } as never)

    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledTimes(1)
    expect(ctx.reply.mock.calls[0]?.[0]).toContain(coachBotContent.start.title)
  })

  it('shows settings entry only for SUPERADMIN', async () => {
    vi.mocked(prisma.user.findFirst)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        activeRole: 'SUPERADMIN',
        id: 'coach-superadmin-id',
        expertId: null,
      } as never)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        activeRole: 'SUPERADMIN',
        id: 'coach-superadmin-id',
        expertId: null,
      } as never)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        activeRole: 'SUPERADMIN',
        id: 'coach-superadmin-id',
        expertId: null,
      } as never)

    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    const [, payload] = ctx.reply.mock.calls[0]
    expect(JSON.stringify(payload.reply_markup.keyboard)).toContain(
      coachBotContent.menu.settings
    )
  })

  it('registers superadmin settings back callback and returns to the coach workspace', async () => {
    vi.mocked(prisma.user.findFirst)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        activeRole: 'SUPERADMIN',
        id: 'coach-superadmin-id',
        expertId: null,
      } as never)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        activeRole: 'SUPERADMIN',
        id: 'coach-superadmin-id',
        expertId: null,
      } as never)

    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const [, callbackHandler] = telegramBot.action.mock.calls.find(
      ([matcher]) => matcher === 'coach:settings:back'
    ) as [string, RegisteredHandler]
    const ctx = createCoachCtx()

    await callbackHandler(ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining(coachBotContent.start.title),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          keyboard: expect.any(Array),
        }),
      }),
    )
  })

  it('keeps coach callback namespace separate from user callbacks', () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const actionMatchers = telegramBot.action.mock.calls.map(([matcher]) => String(matcher))
    expect(actionMatchers.some((matcher) => matcher.includes('coach:'))).toBe(true)
    expect(actionMatchers.some((matcher) => matcher.includes('user:'))).toBe(false)
  })

  it('routes USER test persona through the existing user /start owner', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      role: 'SUPERADMIN',
      activeRole: 'USER',
      id: 'coach-user-id',
      expertId: null,
    } as never)

    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(handleStart).toHaveBeenCalledWith(ctx)
    expect(ctx.reply).toHaveBeenNthCalledWith(1, '…', {
      reply_markup: {
        remove_keyboard: true,
      },
    })
    expect(ctx.reply).toHaveBeenNthCalledWith(2, 'user-flow')
  })

  it('keeps ADMIN test persona inside coach workspace without superadmin settings', async () => {
    vi.mocked(prisma.user.findFirst)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        activeRole: 'ADMIN',
        id: 'coach-admin-id',
        expertId: null,
      } as never)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        activeRole: 'ADMIN',
        id: 'coach-admin-id',
        expertId: null,
      } as never)
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        activeRole: 'ADMIN',
        id: 'coach-admin-id',
        expertId: null,
      } as never)

    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    const [, payload] = ctx.reply.mock.calls[0]
    const keyboard = JSON.stringify(payload.reply_markup.keyboard)
    expect(keyboard).not.toContain(coachBotContent.menu.settings)
    expect(ctx.reply.mock.calls[0]?.[0]).toContain(coachBotContent.start.title)
  })

  it('shows test-role menu in dev and switches the active persona', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      role: 'SUPERADMIN',
      activeRole: 'EXPERT',
      id: 'coach-user-id',
      expertId: null,
    } as never)

    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const hearsCall = telegramBot.hears.mock.calls.find(([matcher]) =>
      matcher instanceof RegExp && matcher.test('/test-role'),
    )
    const commandHandler = hearsCall?.[1] as RegisteredHandler
    const ctx = createCoachCtx()

    await commandHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      'Test role: EXPERT',
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({ text: 'USER', callback_data: 'coach:test-role:USER' }),
              expect.objectContaining({ text: 'EXPERT', callback_data: 'coach:test-role:EXPERT' }),
            ]),
          ]),
        }),
      }),
    )

    const [, actionHandler] = telegramBot.action.mock.calls.find(
      ([matcher]) => String(matcher) === '/^coach:test-role:(USER|EXPERT|ADMIN|SUPERADMIN)$/u'
    ) as [unknown, RegisteredHandler]
    const callbackCtx = {
      ...createCoachCtx(),
      match: ['coach:test-role:SUPERADMIN', 'SUPERADMIN'],
    }

    await actionHandler(callbackCtx)

    expect(switchLocalTestPersona).toHaveBeenCalledWith({
      telegramId: '99',
      testRole: 'SUPERADMIN',
    })
    expect(callbackCtx.answerCbQuery).toHaveBeenCalledWith('Активна роль: SUPERADMIN')
  })

  it('keeps /test-role available for persisted SUPERADMIN even when activeRole is USER', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      role: 'SUPERADMIN',
      activeRole: 'USER',
      id: 'coach-user-id',
      expertId: null,
    } as never)

    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const hearsCall = telegramBot.hears.mock.calls.find(([matcher]) =>
      matcher instanceof RegExp && matcher.test('/test-role'),
    )
    const commandHandler = hearsCall?.[1] as RegisteredHandler
    const ctx = createCoachCtx()

    await commandHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      'Test role: USER',
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      }),
    )
  })

  it('denies /test-role for persisted ADMIN even in dev', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      role: 'ADMIN',
      activeRole: 'ADMIN',
      id: 'coach-admin-id',
      expertId: null,
    } as never)

    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const hearsCall = telegramBot.hears.mock.calls.find(([matcher]) =>
      matcher instanceof RegExp && matcher.test('/test-role'),
    )
    const commandHandler = hearsCall?.[1] as RegisteredHandler
    const ctx = createCoachCtx()

    await commandHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledWith('Тестова роль недоступна для цього акаунта.')
  })

  it('does not register /test-role in production runtime', async () => {
    process.env.NODE_ENV = 'production'
    vi.resetModules()

    const { registerCoachBotHandlers: registerCoachBotHandlersProd } = await import('../../../../../src/bot/handlers/coach/register.ts')
    const telegramBot = createTelegramBotMock()

    registerCoachBotHandlersProd(telegramBot as never)

    expect(
      telegramBot.hears.mock.calls.some(([matcher]) =>
        matcher instanceof RegExp && matcher.test('/test-role'),
      )
    ).toBe(false)
    expect(
      telegramBot.action.mock.calls.some(([matcher]) =>
        String(matcher) === '/^coach:test-role:(USER|EXPERT|ADMIN|SUPERADMIN)$/u',
      )
    ).toBe(false)
  })

  it('grants focus from the current token-based OPS callback', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    vi.mocked(prisma.checkoutSession.findUnique).mockResolvedValue({
      userId: 'user-1',
      orderReference: 'focus_order_1',
    } as never)

    const [, grantHandler] = telegramBot.action.mock.calls.find(
      ([matcher]) => String(matcher) === '/^admin:grant_focus:/'
    ) as [unknown, RegisteredHandler]

    const ctx = {
      ...createCoachCtx(),
      callbackQuery: { data: 'admin:grant_focus:checkout-token-1' },
    }

    await grantHandler(ctx)

    expect(prisma.checkoutSession.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { token: 'checkout-token-1' },
      select: expect.objectContaining({
        userId: true,
        orderReference: true,
      }),
    }))
    expect(activateProductSubscription).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      orderReference: 'focus_order_1',
      source: 'coach_manual',
    }))
    expect(sendFocusPaymentSuccessTelegramMessageByOrder).toHaveBeenCalledWith({
      userId: 'user-1',
      orderReference: 'focus_order_1',
    })
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
  })

  it('does not resend focus success message when access is already active', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    vi.mocked(prisma.checkoutSession.findUnique).mockResolvedValue({
      userId: 'user-1',
      orderReference: 'focus_order_1',
    } as never)
    vi.mocked(activateProductSubscription).mockResolvedValue({
      success: true,
      message: 'already_active',
    } as never)

    const [, grantHandler] = telegramBot.action.mock.calls.find(
      ([matcher]) => String(matcher) === '/^admin:grant_focus:/'
    ) as [unknown, RegisteredHandler]

    const ctx = {
      ...createCoachCtx(),
      callbackQuery: { data: 'admin:grant_focus:checkout-token-1' },
    }

    await grantHandler(ctx)

    expect(sendFocusPaymentSuccessTelegramMessageByOrder).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(ctx.reply).toHaveBeenCalledWith(
      'Доступ до ФОКУСУ вже був активний.\nuserId: user-1'
    )
  })

  it('grants focus from the legacy userId/orderReference OPS callback', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    vi.mocked(prisma.checkoutSession.findFirst).mockResolvedValue({
      userId: 'legacy-user',
      orderReference: 'focus_legacy_order',
    } as never)

    const [, grantHandler] = telegramBot.action.mock.calls.find(
      ([matcher]) => String(matcher) === '/^admin:grant_focus:/'
    ) as [unknown, RegisteredHandler]

    const ctx = {
      ...createCoachCtx(),
      callbackQuery: { data: 'admin:grant_focus:legacy-user:focus_legacy_order' },
    }

    await grantHandler(ctx)

    expect(prisma.checkoutSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 'legacy-user',
        orderReference: 'focus_legacy_order',
      },
      select: expect.objectContaining({
        userId: true,
        orderReference: true,
      }),
    }))
    expect(activateProductSubscription).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'legacy-user',
      orderReference: 'focus_legacy_order',
      source: 'coach_manual',
    }))
  })

  it('denies focus from the legacy userId-only OPS callback', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const [, denyHandler] = telegramBot.action.mock.calls.find(
      ([matcher]) => String(matcher) === '/^admin:deny_focus:/'
    ) as [unknown, RegisteredHandler]

    const ctx = {
      ...createCoachCtx(),
      callbackQuery: { data: 'admin:deny_focus:legacy-user:focus_legacy_order' },
    }

    await denyHandler(ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(coachBotContent.paymentAdmin.denied)
    expect(ctx.reply).toHaveBeenCalledWith(
      `${coachBotContent.paymentAdmin.manualAccessDenied}\nuserId: legacy-user`
    )
  })

  it('activates only trial zoom from the trial-specific OPS callback', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    vi.mocked(prisma.checkoutSession.findUnique).mockResolvedValue({
      userId: 'user-1',
      orderReference: 'trial_zoom_order_1',
      productCode: 'trial_zoom',
      amount: 1,
      currency: 'UAH',
    } as never)
    vi.mocked(prisma.paymentLog.findUnique).mockResolvedValue({
      id: 'pay-1',
      status: 'SUCCESS',
    } as never)

    const [, grantHandler] = telegramBot.action.mock.calls.find(
      ([matcher]) => String(matcher) === '/^admin:grant_trial_zoom:/'
    ) as [unknown, RegisteredHandler]

    const ctx = {
      ...createCoachCtx(),
      callbackQuery: { data: 'admin:grant_trial_zoom:checkout-token-1' },
    }

    await grantHandler(ctx)

    expect(processEcosystemPayment).toHaveBeenCalledWith(
      'trial_zoom',
      'single',
      'user-1',
      expect.objectContaining({
        amount: 1,
        currency: 'UAH',
        orderReference: 'trial_zoom_order_1',
      }),
    )
    expect(activateProductSubscription).not.toHaveBeenCalled()
    expect(sendTrialZoomPaymentSuccessTelegramMessage).toHaveBeenCalledWith({
      userId: 'user-1',
      orderReference: 'trial_zoom_order_1',
    })
  })
})
