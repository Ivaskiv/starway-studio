import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(async () => ({ role: 'EXPERT', id: 'coach-user-id' })),
      create: vi.fn(),
      update: vi.fn(),
    },
    zoomSession: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(),
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

vi.mock('../../../../../src/modules/zoom/calendar/zoom.calendar.service.ts', () => ({
  getCoachWeeklyDiary: vi.fn(async () => ({
    week: {
      from: '2026-09-07T00:00:00.000Z',
      to: '2026-09-13T20:59:59.999Z',
      timezone: 'Europe/Kyiv',
    },
    sessions: [],
  })),
}))

import { prisma } from '../../../../../src/db/client.ts'
import { getCoachWeeklyDiary } from '../../../../../src/modules/zoom/calendar/zoom.calendar.service.ts'

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
    from: { id: 99, first_name: 'Vira' },
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
      expect.stringContaining('Твій розклад на цей тиждень'),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          keyboard: [
            [
              coachBotContent.menu.members,
              expect.objectContaining({
                text: coachBotContent.menu.battle,
                web_app: {
                  url: 'https://miniapp.example/app/dashboard/zoom?dl=coach-zoom-token&zoomRole=coach#battle',
                },
              }),
            ],
            [coachBotContent.menu.analytics, coachBotContent.menu.more],
          ],
        }),
      }),
    )
  })

  it('renders the weekly schedule on repeated /start without persisting duplicate data', async () => {
    const { registerCoachBotHandlers } = await import(
      '../../../../../src/bot/handlers/coach/register.ts'
    )
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)
    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)
    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledTimes(2)
    expect(ctx.reply).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Твій розклад на цей тиждень'),
      expect.any(Object),
    )
    expect(ctx.reply).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Твій розклад на цей тиждень'),
      expect.any(Object),
    )
    expect(vi.mocked(getCoachWeeklyDiary)).toHaveBeenCalledTimes(2)
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.zoomSession.create).not.toHaveBeenCalled()
  })

  it('keeps genuine schedule-read failures on the existing runtime error path', async () => {
    vi.mocked(getCoachWeeklyDiary).mockRejectedValueOnce(new Error('SCHEDULE_READ_FAILED'))
    const { registerCoachBotHandlers } = await import(
      '../../../../../src/bot/handlers/coach/register.ts'
    )
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)
    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledWith('❌ Сталася помилка. Спробуй ще раз.', {
      parse_mode: 'HTML',
    })
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
