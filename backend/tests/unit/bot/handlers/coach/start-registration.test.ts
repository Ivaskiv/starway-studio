import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(async () => ({ role: 'EXPERT', id: 'coach-user-id' })),
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
  })
})
