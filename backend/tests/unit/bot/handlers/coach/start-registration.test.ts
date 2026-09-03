import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(async () => ({ role: 'EXPERT', id: 'coach-user-id' })),
    },
    zoomSession: {
      findFirst: vi.fn(async () => null),
    },
    checkoutSession: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
    },
    paymentLog: {
      findUnique: vi.fn(async () => null),
    },
    productSubscription: {
      findFirst: vi.fn(async () => null),
    },
  },
}))

vi.mock('../../../../../src/modules/subscriptions/payments/activation.ts', () => ({
  activateProductSubscription: vi.fn(async () => ({ success: true })),
}))

vi.mock('../../../../../src/modules/subscriptions/payments/business/processing.ts', () => ({
  processEcosystemPayment: vi.fn(async () => ({ status: 'approved' })),
}))

vi.mock('../../../../../src/modules/subscriptions/payments/callback/notifications.ts', () => ({
  sendAbTestBlock12Welcome: vi.fn(async () => undefined),
  sendFocusPaymentSuccessTelegramMessageByOrder: vi.fn(async () => true),
  notifyUserFocusPaymentIssueDenied: vi.fn(async () => true),
  sendTrialZoomPaymentSuccessTelegramMessage: vi.fn(async () => true),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/index.js', () => ({
  handleCoachAudioCommand: vi.fn(),
  handleCoachNotifyCommand: vi.fn(),
  handleCoachUsersCommand: vi.fn(),
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

vi.mock('../../../../../src/modules/ai-operator/operator.service.ts', () => ({
  AI_OPERATOR_ACTIONS: {},
  isCoachDialogueAwaiting: vi.fn(async () => false),
  isCoachPostEditingActive: vi.fn(async () => false),
  runCoachOperatorAction: vi.fn(),
  runCoachStartDay: vi.fn(),
  submitCoachDialogues: vi.fn(),
  submitCoachEditedPost: vi.fn(),
}))

vi.mock('../../../../../src/modules/deeplinks/service.ts', () => ({
  generateCoachZoomWebDeepLink: vi.fn(async () => 'https://miniapp.example/app/dashboard/zoom?dl=coach-zoom-token'),
  generateCoachAgentsWebDeepLink: vi.fn(async () => 'https://miniapp.example/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-agents-token'),
  COACH_AGENTS_RETURN_TARGET: '/app/dashboard/admin/studio?tab=agents&item=agents.overview',
}))

type RegisteredHandler = (ctx: any) => Promise<unknown> | unknown

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

describe('registerCoachBotHandlers /start', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.COACH_TELEGRAM_ID
    delete process.env.TEST_COACH_MENTOR_TELEGRAM_ID
    process.env.JWT_ACCESS_SECRET = 'test-access-secret'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  })

  it('keeps a single /start entrypoint and does not register duplicate command:start handler', async () => {
    const { registerCoachBotHandlers } = await import(
      '../../../../../src/bot/handlers/coach/register.ts'
    )
    const telegramBot = createTelegramBotMock()

    registerCoachBotHandlers(telegramBot as never)

    expect(telegramBot.start).toHaveBeenCalledTimes(1)
    expect(telegramBot.command).not.toHaveBeenCalledWith('start', expect.any(Function))

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledTimes(1)
  }, 10000)

  it('routes privileged coach /start into the existing staff system menu', async () => {
    const { coachBotContent } = await import(
      '../../../../../src/bot/content/coachBot.content.ts'
    )
    const { registerCoachBotHandlers } = await import(
      '../../../../../src/bot/handlers/coach/register.ts'
    )
    const telegramBot = createTelegramBotMock()

    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining(coachBotContent.start.title),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          keyboard: [
            [coachBotContent.menu.conduct, coachBotContent.menu.calendar],
            [coachBotContent.menu.members, coachBotContent.menu.agents],
            [coachBotContent.menu.analytics, coachBotContent.menu.content],
            [coachBotContent.menu.notifications, coachBotContent.menu.payments],
          ],
        }),
      }),
    )
  })

  it('allows ADMIN to pass the existing coach access gate without exposing superadmin settings', async () => {
    vi.mocked((await import('../../../../../src/db/client.ts')).prisma.user.findFirst).mockResolvedValueOnce({
      role: 'ADMIN',
      id: 'coach-admin-id',
    } as never)
    const { coachBotContent } = await import(
      '../../../../../src/bot/content/coachBot.content.ts'
    )
    const { registerCoachBotHandlers } = await import(
      '../../../../../src/bot/handlers/coach/register.ts'
    )
    const telegramBot = createTelegramBotMock()

    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    const [, payload] = ctx.reply.mock.calls[0]
    expect(JSON.stringify(payload.reply_markup.keyboard)).not.toContain(
      coachBotContent.menu.settings
    )
  })
})
