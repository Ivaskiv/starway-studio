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

vi.mock('../../../../../src/modules/zoom/commerce/zoom.commerce-request.service.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../src/modules/zoom/commerce/zoom.commerce-request.service.ts')>()
  return {
    ...actual,
    getCalendarRequests: vi.fn(async () => []),
  }
})

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
import { getCoachWeeklyDiary } from '../../../../../src/modules/zoom/calendar/zoom.calendar.service.ts'
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
    from: { id: 99, first_name: 'Vira' },
    reply: vi.fn(async () => undefined),
    answerCbQuery: vi.fn(async () => undefined),
  }
}

function expectCoachCalendarWebAppButton(
  button: unknown,
  expectedUrl = 'https://miniapp.example/app/dashboard/zoom?dl=coach-zoom-token&zoomRole=coach',
) {
  expect(button).toEqual(expect.objectContaining({
    text: coachBotContent.system.calendarCta,
    web_app: { url: expectedUrl },
  }))
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
    vi.mocked(getCoachWeeklyDiary).mockResolvedValue({
      week: {
        from: '2026-09-07T00:00:00.000Z',
        to: '2026-09-13T20:59:59.999Z',
        timezone: 'Europe/Kyiv',
      },
      sessions: [],
    })
  })

  beforeEach(async () => {
    ;({ coachBotContent } = await import('../../../../../src/bot/content/coachBot.content.ts'))
    ;({ registerCoachBotHandlers } = await import('../../../../../src/bot/handlers/coach/register.ts'))
  })

  it('renders weekly operational diary on /start without generic filler or duplicate reads', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T12:00:00.000Z'))
    vi.mocked(getCoachWeeklyDiary).mockResolvedValue({
      week: {
        from: '2026-09-07T00:00:00.000Z',
        to: '2026-09-13T20:59:59.999Z',
        timezone: 'Europe/Kyiv',
      },
      sessions: [
        {
          id: 'monday-group',
          scheduledAt: '2026-09-07T15:00:00.000Z',
          topic: 'Фокус',
          status: 'COMPLETED',
          type: 'group_practice',
          attendeesCount: 12,
          remainingSlots: 38,
          participantNames: [],
          challengerName: null,
          opponentName: null,
          challengerId: null,
          opponentId: null,
          winnerId: null,
          goalA: null,
          goalB: null,
          progressA: 0,
          progressB: 0,
          battleStatus: null,
          questionPreviews: [],
        },
        {
          id: 'today-individual',
          scheduledAt: '2026-09-08T16:00:00.000Z',
          topic: 'Індивідуальна',
          status: 'SCHEDULED',
          type: 'individual',
          attendeesCount: 1,
          remainingSlots: 0,
          participantNames: ['V3'],
          challengerName: null,
          opponentName: null,
          challengerId: null,
          opponentId: null,
          winnerId: null,
          goalA: null,
          goalB: null,
          progressA: 0,
          progressB: 0,
          battleStatus: null,
          questionPreviews: ['Я готова до змін!'],
        },
        {
          id: 'today-battle',
          scheduledAt: '2026-09-08T17:00:00.000Z',
          topic: 'Перші конвертації',
          status: 'ACTIVE',
          type: 'battle_review',
          attendeesCount: 2,
          remainingSlots: 0,
          participantNames: ['Vira', 'V3'],
          challengerName: 'Vira',
          opponentName: 'V3',
          challengerId: 'coach-user-id',
          opponentId: 'user-v3',
          winnerId: null,
          goalA: 'Перші конвертації',
          goalB: null,
          progressA: 7,
          progressB: 5,
          battleStatus: 'active',
          questionPreviews: [],
        },
        {
          id: 'thursday-group',
          scheduledAt: '2026-09-10T14:00:00.000Z',
          topic: 'Щотижнева сесія балансу',
          status: 'COMPLETED',
          type: 'battle_review',
          attendeesCount: 2,
          remainingSlots: 0,
          participantNames: ['Vira', 'V3'],
          challengerName: 'Vira',
          opponentName: 'V3',
          challengerId: 'coach-user-id',
          opponentId: 'user-v3',
          winnerId: null,
          goalA: null,
          goalB: null,
          progressA: 0,
          progressB: 0,
          battleStatus: 'completed',
          questionPreviews: [],
        },
      ],
    })
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    expect(ctx.reply).toHaveBeenCalledTimes(1)
    const [text, payload] = ctx.reply.mock.calls[0]
    expect(text).toContain('Вітаю, Vira! 👋')
    expect(text).toContain('Твій розклад на цей тиждень')
    expect(text).toContain('<b>7–13 ВЕРЕСЕНЬ</b>')

    expect(text).toContain('<b>ПН · 7.09</b>')
    expect(text).toContain('🟢 18:00 · Групова практика «Фокус» · 12/50 · Завершено')

    expect(text).toContain('<b>ВТ · 8.09 · Сьогодні</b>')
    expect(text).toContain('🔵 19:00 · Індивідуальна сесія · V3 · Індивідуальна · Заплановано')
    expect(text).toContain('🟣 20:00 · Zoom Battle · Vira vs V3 · Перші конвертації · Активний')

    expect(text).not.toContain('СР · 9.09')
    expect(text).not.toContain('— Немає сесій')

    expect(text).toContain('<b>ЧТ · 10.09</b>')
    expect(text).toContain('🟣 17:00 · Zoom Battle · Vira vs V3 · Щотижнева сесія балансу · Завершено')

    expect(text).toContain('<b>Разом: 4 сесії · 1 активний battle</b>')
    expect(text).not.toContain(coachBotContent.start.upcomingTitle)
    expect(text).not.toContain(coachBotContent.start.subtitle)

    expect(
      text.match(/(?:🟢|🔵|🟣) \d{2}:\d{2} · (?:Групова практика|Індивідуальна сесія|Zoom Battle)/g),
    ).toHaveLength(4)
    expect(payload.reply_markup.keyboard).toEqual([
      [expect.objectContaining({ text: coachBotContent.system.calendarCta })],
      [
        coachBotContent.menu.members,
        expect.objectContaining({ text: coachBotContent.menu.battle }),
      ],
      [coachBotContent.menu.analytics, coachBotContent.menu.more],
    ])
    expectCoachCalendarWebAppButton(payload.reply_markup.keyboard[0][0])
    expect(generateCoachZoomWebDeepLink).toHaveBeenCalledWith('coach-user-id')
    expect(getCoachWeeklyDiary).toHaveBeenCalledTimes(1)
    expect(getCoachWeeklyDiary).toHaveBeenCalledWith({
      userId: 'coach-user-id',
      expertId: 'coach-user-id',
    })

    const flat = JSON.stringify(payload.reply_markup.keyboard)
    expect(flat).not.toContain('Продовжити')
    expect(flat).not.toContain('План дня')
    expect(flat).not.toContain('ФОКУС')
    expect(flat).not.toContain(coachBotContent.menu.settings)
    vi.useRealTimers()
  })

  it('renders an empty-week summary without fake day rows', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T12:00:00.000Z'))
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const startHandler = telegramBot.start.mock.calls[0]?.[0] as RegisteredHandler
    const ctx = createCoachCtx()

    await startHandler(ctx)

    const [text] = ctx.reply.mock.calls[0]
    expect(text).toContain('Вітаю, Vira! 👋')
    expect(text).toContain('Твій розклад на цей тиждень')
    expect(text).toContain('<b>7–13 ВЕРЕСЕНЬ</b>')
    expect(text).toContain('<b>Разом: 0 сесій</b>')
    expect(text).not.toContain('— Немає сесій')
    expect(getCoachWeeklyDiary).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
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
      expect.stringContaining(coachBotContent.system.agentsTitle),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [[expect.objectContaining({
            text: coachBotContent.system.agentsCta,
            web_app: expect.objectContaining({
              url: 'https://miniapp.example/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-agents-token',
            }),
          })]],
        }),
      }),
    )
  })

  it('does not register the old text-only calendar menu mediator', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachBotHandlers(telegramBot as never)

    const hearsCall = telegramBot.hears.mock.calls.find(([matcher]) =>
      matcher instanceof RegExp && matcher.test(coachBotContent.menu.calendar),
    )

    expect(hearsCall).toBeUndefined()
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
    expect(ctx.reply.mock.calls[0]?.[0]).toContain('Твій розклад на цей тиждень')
  })

  it('shows the compact more entry for SUPERADMIN', async () => {
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
      coachBotContent.menu.more
    )
    expect(JSON.stringify(payload.reply_markup.keyboard)).not.toContain(
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
      expect.stringContaining('Твій розклад на цей тиждень'),
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
    expect(ctx.reply).toHaveBeenNthCalledWith(1, '\u2060', {
      parse_mode: 'HTML',
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
    expect(ctx.reply.mock.calls[0]?.[0]).toContain('Твій розклад на цей тиждень')
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

    expect(ctx.reply).toHaveBeenCalledWith(
      'Тестова роль недоступна для цього акаунта.',
      expect.objectContaining({ parse_mode: 'HTML' }),
    )
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
      expect.stringContaining('Доступ до ФОКУСУ вже був активний.'),
      expect.objectContaining({ parse_mode: 'HTML' }),
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
      expect.stringContaining(coachBotContent.paymentAdmin.manualAccessDenied),
      expect.objectContaining({ parse_mode: 'HTML' }),
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
