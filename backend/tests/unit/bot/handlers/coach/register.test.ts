import { beforeEach, describe, expect, it, vi } from 'vitest'

import { coachBotContent } from '../../../content/coachBot.content.ts'
import { registerCoachBotHandlers } from '../register.ts'

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    user: {
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

vi.mock('../../../../modules/subscriptions/payments/activation.ts', () => ({
  activateProductSubscription: vi.fn(),
}))

vi.mock('../../../../modules/subscriptions/payments/business/processing.ts', () => ({
  processEcosystemPayment: vi.fn(),
}))

vi.mock('../../../../modules/subscriptions/payments/callback/notifications.ts', () => ({
  sendAbTestBlock12Welcome: vi.fn(),
  sendFocusPaymentSuccessTelegramMessageByOrder: vi.fn(),
  notifyUserFocusPaymentIssueDenied: vi.fn(),
  sendTrialZoomPaymentSuccessTelegramMessage: vi.fn(),
}))

vi.mock('../../coach-content/index.js', () => ({
  handleCoachAudioCommand: vi.fn(),
  handleCoachNotifyCommand: vi.fn(),
  handleCoachUsersCommand: vi.fn(),
  validateCoachContentCatalog: vi.fn(),
}))

vi.mock('../analytics.ts', () => ({
  analyticsHandler: vi.fn(),
}))

vi.mock('../schedule.ts', () => ({
  hoursMenuHandler: vi.fn(),
  nextWeekDoneHandler: vi.fn(),
  nextWeekMenuHandler: vi.fn(),
  nextWeekNoopHandler: vi.fn(),
  scheduleMenuHandler: vi.fn(),
  scheduleToggleHandler: vi.fn(),
  toggleDayHandler: vi.fn(),
  toggleHourHandler: vi.fn(),
}))

vi.mock('../../../../config/webapp.ts', () => ({
  resolveTelegramWebappBaseUrl: vi.fn(() => 'https://miniapp.example'),
}))

vi.mock('../../../../modules/deeplinks/service.ts', () => ({
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

vi.mock('../../../../modules/ai-operator/operator.service.ts', () => ({
  AI_OPERATOR_ACTIONS: {},
  isCoachDialogueAwaiting: vi.fn(async () => false),
  isCoachPostEditingActive: vi.fn(async () => false),
  runCoachOperatorAction: vi.fn(),
  runCoachStartDay: vi.fn(),
  submitCoachDialogues: vi.fn(),
  submitCoachEditedPost: vi.fn(),
}))

import { prisma } from '../../../../db/client.ts'
import { processEcosystemPayment } from '../../../../modules/subscriptions/payments/business/processing.ts'
import { activateProductSubscription } from '../../../../modules/subscriptions/payments/activation.ts'
import {
  notifyUserFocusPaymentIssueDenied,
  sendAbTestBlock12Welcome,
  sendFocusPaymentSuccessTelegramMessageByOrder,
  sendTrialZoomPaymentSuccessTelegramMessage,
} from '../../../../modules/subscriptions/payments/callback/notifications.ts'
import { generateDeepLink } from '../../../../modules/deeplinks/service.ts'

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
    delete process.env.COACH_TELEGRAM_ID
    delete process.env.TEST_COACH_MENTOR_TELEGRAM_ID
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ role: 'EXPERT', id: 'coach-user-id' } as never)
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

  it('renders the coach-only main menu on /start with agents entry in the main keyboard', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledTimes(1)
    const [, payload] = ctx.reply.mock.calls[0]
    expect(payload.reply_markup.keyboard).toEqual([
      [coachBotContent.menu.conduct, coachBotContent.menu.library],
      [coachBotContent.menu.analytics, coachBotContent.menu.content],
      [coachBotContent.menu.settings, coachBotContent.menu.agents],
    ])

    const flat = JSON.stringify(payload.reply_markup.keyboard)
    expect(flat).not.toContain('Продовжити')
    expect(flat).not.toContain('План дня')
    expect(flat).not.toContain('ФОКУС')
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

    expect(generateDeepLink).toHaveBeenCalledWith({
      userId: 'coach-user-id',
      action: 'open_web',
      source: 'telegram',
      target: 'web',
      path: '/app/dashboard/admin/studio?tab=agents&item=agents.overview',
    })

    expect(ctx.reply).toHaveBeenCalledWith(
      `${coachBotContent.system.agentsTitle}\n\n${coachBotContent.system.agentsSubtitle}`,
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [[expect.objectContaining({
            text: coachBotContent.system.agentsCta,
            url: 'https://miniapp.example/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-agents-token',
          })]],
        }),
      }),
    )
  })

  it('allows configured coach telegram id even when DB role lookup is absent', async () => {
    process.env.COACH_TELEGRAM_ID = '99'
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null as never)

    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledTimes(1)
    expect(ctx.reply.mock.calls[0]?.[0]).toContain(coachBotContent.start.title)
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
