import { beforeEach, describe, expect, it, vi } from 'vitest'

import { coachBotContent } from '../../content/coachBot.content.js'
import { registerCoachBotHandlers } from './coachStart.handler.js'

vi.mock('../../../db/client.js', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    checkoutSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('../../../modules/subscriptions/payments/paymentActivation.service.js', () => ({
  activateProductSubscription: vi.fn(),
}))

vi.mock('../../../modules/subscriptions/payments/callback.notifications.js', () => ({
  sendAbTestBlock12Welcome: vi.fn(),
}))

vi.mock('../coachContent.handler.js', () => ({
  handleCoachAudioCommand: vi.fn(),
  handleCoachNotifyCommand: vi.fn(),
  handleCoachUsersCommand: vi.fn(),
  validateCoachContentCatalog: vi.fn(),
}))

vi.mock('./analytics.handler.js', () => ({
  analyticsHandler: vi.fn(),
}))

vi.mock('./schedule.handler.js', () => ({
  hoursMenuHandler: vi.fn(),
  nextWeekDoneHandler: vi.fn(),
  nextWeekMenuHandler: vi.fn(),
  nextWeekNoopHandler: vi.fn(),
  scheduleMenuHandler: vi.fn(),
  scheduleToggleHandler: vi.fn(),
  toggleDayHandler: vi.fn(),
  toggleHourHandler: vi.fn(),
}))

vi.mock('../../../config/webapp.js', () => ({
  resolveTelegramWebappBaseUrl: vi.fn(() => 'https://miniapp.example'),
}))

vi.mock('../../../modules/ai-operator/operator.service.js', () => ({
  AI_OPERATOR_ACTIONS: {},
  isCoachDialogueAwaiting: vi.fn(async () => false),
  isCoachPostEditingActive: vi.fn(async () => false),
  runCoachOperatorAction: vi.fn(),
  runCoachStartDay: vi.fn(),
  submitCoachDialogues: vi.fn(),
  submitCoachEditedPost: vi.fn(),
}))

import { prisma } from '../../../db/client.js'
import { activateProductSubscription } from '../../../modules/subscriptions/payments/paymentActivation.service.js'
import { sendAbTestBlock12Welcome } from '../../../modules/subscriptions/payments/callback.notifications.js'

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

describe('registerCoachBotHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ role: 'EXPERT', id: 'coach-user-id' } as never)
    vi.mocked(prisma.checkoutSession.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.checkoutSession.findFirst).mockResolvedValue(null as never)
    vi.mocked(activateProductSubscription).mockResolvedValue({ success: true } as never)
    vi.mocked(sendAbTestBlock12Welcome).mockResolvedValue(undefined as never)
  })

  it('renders the coach-only main menu on /start with six short items', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledTimes(1)
    const [, payload] = ctx.reply.mock.calls[0]
    expect(payload.reply_markup.keyboard).toEqual([
      [expect.objectContaining({ text: coachBotContent.menu.calendar }), expect.objectContaining({ text: coachBotContent.menu.conduct })],
      [expect.objectContaining({ text: coachBotContent.menu.members }), expect.objectContaining({ text: coachBotContent.menu.analytics })],
      [expect.objectContaining({ text: coachBotContent.menu.library }), expect.objectContaining({ text: coachBotContent.menu.settings })],
    ])

    const flat = JSON.stringify(payload.reply_markup.keyboard)
    expect(flat).not.toContain('Продовжити')
    expect(flat).not.toContain('План дня')
    expect(flat).not.toContain('ФОКУС')
  })

  it('keeps coach callback namespace separate from user callbacks', () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const actionMatchers = telegramBot.action.mock.calls.map(([matcher]) => String(matcher))
    expect(actionMatchers.some((matcher) => matcher.includes('coach:'))).toBe(true)
    expect(actionMatchers.some((matcher) => matcher.includes('user:'))).toBe(false)
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

    expect(prisma.checkoutSession.findUnique).toHaveBeenCalledWith({
      where: { token: 'checkout-token-1' },
      select: {
        userId: true,
        orderReference: true,
      },
    })
    expect(activateProductSubscription).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      orderReference: 'focus_order_1',
      source: 'coach_manual',
    }))
    expect(sendAbTestBlock12Welcome).toHaveBeenCalledWith('user-1')
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

    expect(prisma.checkoutSession.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'legacy-user',
        orderReference: 'focus_legacy_order',
      },
      select: {
        userId: true,
        orderReference: true,
      },
    })
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
})
