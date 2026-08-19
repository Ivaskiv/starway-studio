import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSendOpsTelegramMessage = vi.fn()
const mockCoachSendMessage = vi.fn()
const mockSaveAbTestProgress = vi.fn()
const mockLoadAbTestProgress = vi.fn()
const mockUserFindUnique = vi.fn()
const mockScheduleFollowups = vi.fn()
const mockHasTelegramCtaInteraction = vi.fn()
const mockGetUserAccessState = vi.fn()
const mockGetAbTestProfileEmail = vi.fn()
const mockEnsureAbTestEmailCapturedFromProfile = vi.fn()
const mockTrackAbTestEvent = vi.fn()
const mockClearPendingTelegramIdentity = vi.fn()
const mockWithRuntimeAdvisoryLock = vi.fn()
const mockSendTelegramMessage = vi.fn(
  async (
    ctx: { telegram: { sendMessage: (chatId: string | number, text: string, options: Record<string, unknown>) => Promise<unknown> } },
    chatId: string | number,
    payload: { text: string; parseMode?: 'HTML' | 'Markdown' },
    options?: { replyMarkup?: Record<string, unknown> },
  ) =>
    ctx.telegram.sendMessage(chatId, payload.text, {
      parse_mode: payload.parseMode ?? 'HTML',
      reply_markup: options?.replyMarkup,
    }),
)

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    zoomSessionAttendee: {
      count: vi.fn(async ({ where }: { where?: { attended?: boolean } }) =>
        where?.attended ? 1 : 2,
      ),
      findUnique: vi.fn(async () => null),
    },
    subscription: {
      findFirst: vi.fn(async () => null),
    },
  },
}))

vi.mock('../../../../lib/telegram.ts', () => ({
  coachBot: {
    telegram: {
      sendMessage: (...args: unknown[]) => mockCoachSendMessage(...args),
    },
  },
  sendOpsTelegramMessage: (...args: unknown[]) => mockSendOpsTelegramMessage(...args),
}))

vi.mock('../../../../lib/telegram/messageFormatter.ts', () => ({
  blockquote: (value: string) => `<blockquote>${value}</blockquote>`,
  bold: (value: string) => `<b>${value}</b>`,
  escapeTelegramHtml: (value: string) => value,
  joinBlocks: (blocks: Array<string | null | undefined>) => blocks.filter(Boolean).join('\n\n'),
  sendTelegramMessage: (...args: Parameters<typeof mockSendTelegramMessage>) =>
    mockSendTelegramMessage(...args),
}))

vi.mock('../../../../core/orchestrator/testOrchestrator.ts', () => ({
  testOrchestrator: {
    onDojimSequenceComplete: vi.fn(),
  },
}))

vi.mock('../../../../modules/telegram-mentor/conversation/delivery/planDelivery.ts', () => ({
  planMessage: vi.fn(),
}))

vi.mock('../../../../modules/telegram-mentor/services/identity/pending.ts', () => ({
  setPendingTelegramIdentity: vi.fn(),
}))

vi.mock('../analytics.ts', () => ({
  trackAbTestEvent: (...args: unknown[]) => mockTrackAbTestEvent(...args),
}))

vi.mock('../buttons.ts', () => ({
  buildWebAppButton: vi.fn(),
  resolveBrowserTestUrlOrNull: vi.fn(),
}))

vi.mock('../scheduler.ts', () => ({
  scheduleFollowups: (...args: unknown[]) => mockScheduleFollowups(...args),
}))

vi.mock('../progress.ts', () => ({
  buildAbTestEmailGateMessage: vi.fn(),
  getAbTestProfileEmail: (...args: unknown[]) => mockGetAbTestProfileEmail(...args),
  getAbTestProgressFromUiSettings: vi.fn(),
  loadAbTestProgress: (...args: unknown[]) => mockLoadAbTestProgress(...args),
  loadUserUiSettings: vi.fn(),
  saveAbTestProgress: (...args: unknown[]) => mockSaveAbTestProgress(...args),
  ensureAbTestEmailCapturedFromProfile: (...args: unknown[]) => mockEnsureAbTestEmailCapturedFromProfile(...args),
}))

vi.mock('../callback.ts', async () => {
  const actual = await vi.importActual<typeof import('../callback.ts')>('../callback.ts')
  return {
    ...actual,
    deactivateCallbackMarkup: vi.fn(async () => undefined),
    logAbTestStartDebug: vi.fn(),
    formatMobileAnswerButtonText: vi.fn((value: string) => value),
    resolveQuestionLatency: vi.fn(() => 1000),
  }
})

vi.mock('@/modules/telegram-mentor/services/engagement/cta.js', () => ({
  hasTelegramCtaInteraction: (...args: unknown[]) => mockHasTelegramCtaInteraction(...args),
}))

vi.mock('@/products/ab-system/config/content.js', async () => {
  const actual =
    await vi.importActual<typeof import('@/products/ab-system/config/content.js')>(
      '@/products/ab-system/config/content.js',
    )
  return actual
})

vi.mock('@/modules/zoom/service.js', () => ({
  getUpcomingZoomBookingView: vi.fn(),
}))

vi.mock('@/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('../../../../modules/telegram-mentor/services/identity/pending.ts', () => ({
  clearPendingTelegramIdentity: (...args: unknown[]) => mockClearPendingTelegramIdentity(...args),
  setPendingTelegramIdentity: vi.fn(),
}))

vi.mock('../../../../core/runtime/idempotency.ts', () => ({
  withRuntimeAdvisoryLock: (...args: unknown[]) => mockWithRuntimeAdvisoryLock(...args),
}))

vi.mock('@/modules/zoom/urls.js', () => ({
  buildZoomCalendarUrl: vi.fn(() => 'https://miniapp.example/miniapp/zoom-calendar?intent=booking'),
}))

import {
  AB_TEST_PRACTICE_PREVIEW_PROMPT,
  AB_TEST_SCREENSHOT_URLS,
  telegramBlock,
} from '../../content/abTest.shared.ts'
import {
  dispatchAbTestResultSequence,
  dispatchAbTestPracticeSequence,
  renderAbTestEmailGate,
  renderCurrentView,
  sendTelegramContentChunk,
  sendQuestionDirect,
  sendResultSnapshot,
} from '../views.ts'
import { handleShowResult } from '../handler.ts'
import { handleAbTestCallback } from '../service.ts'
import { getUpcomingZoomBookingView } from '@/modules/zoom/service.js'

function createCtx() {
  return {
    chat: { id: 42 },
    from: { id: 42, first_name: 'Vira' },
    state: { userId: 'user-1' },
    update: { update_id: 4242 },
    callbackQuery: {
      id: 'cb-1',
      data: 'ab_test:show_result',
      message: {
        chat: { id: 42 },
        message_id: 99,
      },
    },
    telegram: {
      sendChatAction: vi.fn(async () => undefined),
      sendMessage: vi.fn(async () => ({ message_id: 99 })),
      sendPhoto: vi.fn(async () => undefined),
      sendVoice: vi.fn(async () => undefined),
      sendVideo: vi.fn(async () => undefined),
    },
    answerCbQuery: vi.fn(async () => undefined),
  }
}

const RESULT_KEYS = ['state', 'goal', 'choice', 'decision', 'action'] as const

describe('dispatchAbTestResultSequence practice preview keyboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockWithRuntimeAdvisoryLock.mockImplementation(async (_input: unknown, task: () => Promise<unknown>) => ({
      acquired: true,
      value: await task(),
    }))
    mockClearPendingTelegramIdentity.mockResolvedValue(undefined)
    mockHasTelegramCtaInteraction.mockResolvedValue(false)
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })
    mockScheduleFollowups.mockImplementation(async (_userId: string, progress: unknown) => progress)
    mockUserFindUnique.mockResolvedValue({
      testResultType: 'decision',
      telegramUserName: 'vira',
      firstName: 'Vira',
      lifecycleState: 'TEST_DONE',
    })
    mockGetAbTestProfileEmail.mockResolvedValue(null)
    mockEnsureAbTestEmailCapturedFromProfile.mockImplementation(async (_userId: string, progress: unknown) => progress)
    mockTrackAbTestEvent.mockResolvedValue(undefined)
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the initial result preview through the canonical inactive keyboard', async () => {
    const ctx = createCtx()

    const promise = dispatchAbTestResultSequence(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey: 'decision',
      firstName: 'Vira',
      deliverySource: 'show_result',
    })

    await vi.runAllTimersAsync()
    await promise

    const sendMessageCalls = vi.mocked(ctx.telegram.sendMessage).mock.calls
    const introTexts = sendMessageCalls
      .map(([, text]) => text)
      .filter((text): text is string => typeof text === 'string')

    expect(
      introTexts.some((text) =>
        text.includes('Ти вже знаєш, яке рішення хочеш прийняти. Але щоразу в останній момент відкладаєш його.'),
      ),
    ).toBe(true)
    expect(
      introTexts.some((text) =>
        text.includes('«Я все розумію, але не роблю» — це була я. Роками.'),
      ),
    ).toBe(true)
    expect(introTexts.some((text) => text.includes('**РІШЕННЯ**'))).toBe(false)

    const lastCall = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)

    expect(lastCall).toEqual([
      '42',
      AB_TEST_PRACTICE_PREVIEW_PROMPT,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'ОБРАТИ ФОРМАТ У ФОКУСІ', callback_data: 'open_focus_payment' }],
            [{ text: 'ПРО ПРОГРАМУ', callback_data: 'show_inside_DECISION' }],
          ],
        },
      },
    ])
    expect(JSON.stringify(lastCall)).not.toContain('ПОКАЗАТИ ПРАКТИКУ')
    expect(JSON.stringify(lastCall)).not.toContain('localhost')
    expect(JSON.stringify(lastCall)).not.toContain('ngrok')
    expect(vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)?.[2]?.reply_markup.inline_keyboard).toHaveLength(2)
    expect(JSON.stringify(lastCall)).not.toContain('zoom-calendar')
    expect(mockSaveAbTestProgress).not.toHaveBeenCalled()
    expect(mockSendOpsTelegramMessage).not.toHaveBeenCalled()
    expect(mockCoachSendMessage).not.toHaveBeenCalled()
  })

  it('routes the email gate through the central telegram formatter', async () => {
    const ctx = createCtx()

    await renderAbTestEmailGate(ctx as never, 'user-1', {
      status: 'completed',
      result_key: 'decision',
      email_stage: 'pending',
    } as never)

    const lastCall = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)
    expect(lastCall?.[2]).toMatchObject({
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: expect.any(Array),
      },
    })
  })

  it('routes question messages through the central telegram formatter', async () => {
    const ctx = createCtx()

    await sendQuestionDirect(ctx as never, 'q1', 7)

    const lastCall = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)
    expect(lastCall?.[2]).toMatchObject({
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: expect.any(Array),
      },
    })
  })

  it('reuses the same canonical inactive keyboard for result replay', async () => {
    const ctx = createCtx()

    await sendResultSnapshot(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey: 'decision',
      firstName: 'Vira',
    })

    const replayCall = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)
    expect(replayCall?.[2]).toMatchObject({
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ОБРАТИ ФОРМАТ У ФОКУСІ', callback_data: 'open_focus_payment' }],
          [{ text: 'ПРО ПРОГРАМУ', callback_data: 'show_inside_DECISION' }],
        ],
      },
    })
    expect(replayCall?.[2]?.reply_markup.inline_keyboard).toHaveLength(2)
    expect(JSON.stringify(replayCall)).not.toContain('ПОКАЗАТИ ПРАКТИКУ')
    expect(JSON.stringify(replayCall)).not.toContain('localhost')
    expect(JSON.stringify(replayCall)).not.toContain('ngrok')
    expect(mockSaveAbTestProgress).not.toHaveBeenCalled()
    expect(mockSendOpsTelegramMessage).not.toHaveBeenCalled()
    expect(mockCoachSendMessage).not.toHaveBeenCalled()
  })

  it('renders booked STAN snapshot with one focus question, one next step, and canonical booking details CTA', async () => {
    const ctx = createCtx()
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    })
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-1',
      scheduledAt: new Date('2026-08-17T16:00:00.000Z'),
      isMyBooking: true,
      myQuestion: {
        text: 'Як не розсипати фокус після Zoom?',
        position: 1,
      },
    } as never)

    await sendResultSnapshot(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey: 'state',
      firstName: 'Vira',
    })

    const replayCall = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)
    const snapshotText = replayCall?.[1]

    expect(snapshotText).toContain('Zoom-практики: ти вже записана на 17 серпня')
    expect(snapshotText).toContain('<b>Поточне питання:</b>')
    expect(snapshotText).toContain('Як не розсипати фокус після Zoom?')
    expect(snapshotText).toContain(
      '<b>Наступний крок:</b> Сформулюй коротку відповідь і візьми її на найближчу Zoom-практику.',
    )
    expect(snapshotText?.match(/Як не розсипати фокус після Zoom\\?/g)).toHaveLength(1)
    expect(snapshotText).not.toContain('підготуй одну конкретну тему')
    expect(replayCall?.[2]).toMatchObject({
      reply_markup: {
        inline_keyboard: [
          [{
            text: 'ДЕТАЛІ ZOOM-ПРАКТИКИ',
            web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?intent=booking' },
          }],
          [{ text: 'ПРО ПРОГРАМУ', callback_data: 'show_inside_STATE' }],
        ],
      },
    })
  })

  it('uses canonical focus access for the result snapshot instead of legacy subscription state', async () => {
    const ctx = createCtx()
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-09T00:00:00.000Z'),
    })

    await sendResultSnapshot(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey: 'decision',
      firstName: 'Vira',
    })

    const snapshotText = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)?.[1]
    expect(snapshotText).toContain('Підписка активна до <b>09.08.2026</b>')
    expect(snapshotText).not.toContain('Підписка неактивна')
  })

  it('shows inactive access in the result snapshot when canonical focus access is absent', async () => {
    const ctx = createCtx()

    await sendResultSnapshot(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey: 'decision',
      firstName: 'Vira',
    })

    const snapshotText = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)?.[1]
    expect(snapshotText).toContain('Підписка неактивна')
  })

  it.each(RESULT_KEYS)('routes inactive %s users only to canonical focus acquisition', async (resultKey) => {
    const ctx = createCtx()

    await sendResultSnapshot(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey,
      firstName: 'Vira',
    })

    const snapshotText = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)?.[1]
    const replyMarkup = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)?.[2]?.reply_markup
    const buttonLabels = JSON.stringify(replyMarkup)
    if (resultKey === 'state') {
      expect(snapshotText).toContain('З поверненням!')
      expect(snapshotText).toContain('Твій поточний фокус за результатом тесту — <b>СТАН</b>.')
      expect(snapshotText).toContain('<b>Твій статус у системі:</b>')
      expect(snapshotText).toContain('• Zoom-практики:')
      expect(snapshotText).toContain('• Підписка: неактивна')
      expect(snapshotText).toContain('Обирай формат участі у «ФОКУСІ» нижче')
    }
    expect(buttonLabels).toContain('ОБРАТИ ФОРМАТ У ФОКУСІ')
    expect(buttonLabels).toContain('ПРО ПРОГРАМУ')
    expect(buttonLabels).toContain('open_focus_payment')
    expect(buttonLabels).toContain(`show_inside_${resultKey.toUpperCase()}`)
    expect(buttonLabels).not.toContain('zoom-calendar')
    expect(replyMarkup).toEqual({
      inline_keyboard: [
        [{ text: 'ОБРАТИ ФОРМАТ У ФОКУСІ', callback_data: 'open_focus_payment' }],
        [{ text: 'ПРО ПРОГРАМУ', callback_data: `show_inside_${resultKey.toUpperCase()}` }],
      ],
    })
    expect(`${snapshotText}${buttonLabels}`).not.toMatch(/[👋📌👇🚀📅❓]/u)
  })

  it.each(RESULT_KEYS)('routes active unbooked %s users to the Zoom calendar exactly once', async (resultKey) => {
    const ctx = createCtx()
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    })

    await sendResultSnapshot(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey,
      firstName: 'Vira',
    })

    const replyMarkup = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)?.[2]?.reply_markup
    const serialized = JSON.stringify(replyMarkup)
    expect(replyMarkup).toEqual({
      inline_keyboard: [
        [{
          text: 'ВІДКРИТИ РОЗКЛАД ZOOM',
          web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?intent=booking' },
        }],
        [{ text: 'ПРО ПРОГРАМУ', callback_data: `show_inside_${resultKey.toUpperCase()}` }],
      ],
    })
    expect(serialized).not.toContain('ОБРАТИ ФОРМАТ У ФОКУСІ')
    expect(serialized.match(/zoom-calendar/g)).toHaveLength(1)
    expect(serialized).not.toMatch(/[🚀📅❓]/u)
  })

  it.each(RESULT_KEYS)('routes active booked %s users to their Zoom booking exactly once', async (resultKey) => {
    const ctx = createCtx()
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    })
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-1',
      scheduledAt: new Date('2026-08-17T16:00:00.000Z'),
      isMyBooking: true,
      myQuestion: null,
    } as never)

    await sendResultSnapshot(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey,
      firstName: 'Vira',
    })

    const replyMarkup = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)?.[2]?.reply_markup
    const serialized = JSON.stringify(replyMarkup)
    const expectedPrimaryLabel =
      resultKey === 'state' ? 'ДЕТАЛІ ZOOM-ПРАКТИКИ' : 'ПЕРЕГЛЯНУТИ ЗАПИС'
    expect(replyMarkup).toEqual({
      inline_keyboard: [
        [{
          text: expectedPrimaryLabel,
          web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?intent=booking' },
        }],
        [{ text: 'ПРО ПРОГРАМУ', callback_data: `show_inside_${resultKey.toUpperCase()}` }],
      ],
    })
    expect(serialized).not.toContain('ОБРАТИ ФОРМАТ У ФОКУСІ')
    expect(serialized.match(/zoom-calendar/g)).toHaveLength(1)
    expect(serialized).not.toMatch(/[🚀📅❓]/u)
  })

  it('sends the step 8 screenshot via sendPhoto exactly once without inlining stale urls into text messages', async () => {
    const ctx = createCtx()

    const promise = dispatchAbTestPracticeSequence(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey: 'state',
      firstName: 'Vira',
    })

    await vi.runAllTimersAsync()
    await promise

    expect(vi.mocked(ctx.telegram.sendPhoto)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ctx.telegram.sendPhoto)).toHaveBeenCalledWith(
      '42',
      AB_TEST_SCREENSHOT_URLS.state_review,
      expect.objectContaining({
        parse_mode: 'HTML',
      }),
    )

    const sentMessages = JSON.stringify(vi.mocked(ctx.telegram.sendMessage).mock.calls)
    expect(sentMessages).not.toContain(AB_TEST_SCREENSHOT_URLS.state_review)
    expect(sentMessages).not.toContain('drive.google.com')
  })

  it('propagates sendPhoto failures instead of marking the review step as delivered', async () => {
    const ctx = createCtx()
    vi.mocked(ctx.telegram.sendPhoto).mockRejectedValueOnce(
      new Error('telegram photo failed'),
    )

    const promise = dispatchAbTestPracticeSequence(ctx as never, {
      chatId: '42',
      userId: 'user-1',
      resultKey: 'state',
      firstName: 'Vira',
    })
    const expectation = expect(promise).rejects.toThrow('telegram photo failed')

    await vi.runAllTimersAsync()

    await expectation
    expect(vi.mocked(ctx.telegram.sendPhoto)).toHaveBeenCalledTimes(1)
  })

  it('recovers legacy show_result state into canonical completed progress and skips duplicate delivery on repeat callback', async () => {
    const ctx = createCtx()
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    let storedProgress = {
      status: 'active',
      stage: 'S2_TEST_QUESTIONS',
      current_question_id: 'q8',
      result_key: null,
      email_stage: null,
      result_opened_at: null,
      started_at: '2026-08-04T09:00:00.000Z',
      answers: [],
    }

    mockLoadAbTestProgress.mockImplementation(async () => storedProgress)
    mockSaveAbTestProgress.mockImplementation(async (_userId: string, progress: typeof storedProgress) => {
      storedProgress = progress
      return progress
    })

    const firstDelivery = handleShowResult(ctx as never, 'user-1')
    await vi.runAllTimersAsync()
    await firstDelivery

    expect(storedProgress.status).toBe('completed')
    expect(storedProgress.stage).toBe('S3_TEST_RESULT')
    expect(storedProgress.result_key).toBe('decision')
    expect(storedProgress.result_opened_at).not.toBeNull()
    const sendMessageCountAfterFirstDelivery = vi.mocked(ctx.telegram.sendMessage).mock.calls.length
    const followupCallsAfterFirstDelivery = mockScheduleFollowups.mock.calls.length

    const repeatedTriggerHandled = await handleShowResult(ctx as never, 'user-1')

    expect(repeatedTriggerHandled).toBe(true)
    expect(vi.mocked(ctx.telegram.sendMessage).mock.calls).toHaveLength(sendMessageCountAfterFirstDelivery)
    expect(mockScheduleFollowups.mock.calls.length).toBe(followupCallsAfterFirstDelivery)

    const s3TraceLogs = consoleInfoSpy.mock.calls
      .filter(([label]) => label === '[AB_TEST_S3_TRACE]')
      .map(([, payload]) => payload)

    expect(s3TraceLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-1',
          dedupeKey: 'user-1:S3_TEST_RESULT:result_sequence',
          trigger: 'ab_test:show_result',
          deliveryResult: 'sent',
        }),
        expect.objectContaining({
          userId: 'user-1',
          dedupeKey: 'user-1:S3_TEST_RESULT:result_sequence',
          trigger: 'ab_test:show_result',
          deliveryResult: 'skipped_duplicate',
        }),
      ]),
    )
    expect(mockLoadAbTestProgress).toHaveBeenLastCalledWith('user-1')

    consoleInfoSpy.mockRestore()
  })
})

describe('canonical telegram formatter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formats accent markdown in text blocks without leaking raw **', async () => {
    const ctx = createCtx()

    await sendTelegramContentChunk(
      ctx as never,
      '42',
      '',
      [telegramBlock.text('**Акцентна фраза**')],
      { parseMode: 'HTML' },
    )

    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith(
      '42',
      '<b>Акцентна фраза</b>',
      expect.objectContaining({ parse_mode: 'HTML' }),
    )
    expect(JSON.stringify(ctx.telegram.sendMessage.mock.calls[0])).not.toContain('**Акцентна фраза**')
  })

  it('formats quote blocks through canonical blockquote rendering', async () => {
    const ctx = createCtx()

    await sendTelegramContentChunk(
      ctx as never,
      '42',
      '',
      [telegramBlock.quote('Це цитата')],
      { parseMode: 'HTML' },
    )

    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith(
      '42',
      '<blockquote>Це цитата</blockquote>',
      expect.objectContaining({ parse_mode: 'HTML' }),
    )
  })

  it('formats image captions through the same formatter instead of sending raw markdown', async () => {
    const ctx = createCtx()

    await sendTelegramContentChunk(
      ctx as never,
      '42',
      '',
      [telegramBlock.image(AB_TEST_SCREENSHOT_URLS.state_review, '**Хочу показати тобі повідомлення**')],
      { parseMode: 'HTML' },
    )

    expect(ctx.telegram.sendPhoto).toHaveBeenCalledWith(
      '42',
      AB_TEST_SCREENSHOT_URLS.state_review,
      expect.objectContaining({
        caption: '<b>Хочу показати тобі повідомлення</b>',
        parse_mode: 'HTML',
      }),
    )
    expect(JSON.stringify(ctx.telegram.sendPhoto.mock.calls[0])).not.toContain('**Хочу показати тобі повідомлення**')
  })

  it('preserves pricing block formatting contract', async () => {
    const ctx = createCtx()

    await sendTelegramContentChunk(
      ctx as never,
      '42',
      '',
      [telegramBlock.pricing('1 місяць — 33 €')],
      { parseMode: 'HTML' },
    )

    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith(
      '42',
      '<b>1 місяць — 33 €</b>',
      expect.objectContaining({ parse_mode: 'HTML' }),
    )
  })
})

describe('handleAbTestCallback show_inside direct route live regression', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockWithRuntimeAdvisoryLock.mockImplementation(async (_input: unknown, task: () => Promise<unknown>) => ({
      acquired: true,
      value: await task(),
    }))
    mockHasTelegramCtaInteraction.mockResolvedValue(false)
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })
    mockUserFindUnique.mockResolvedValue({
      testResultType: 'state',
      telegramUserName: 'vira',
      firstName: 'Vira',
      lifecycleState: 'TEST_DONE',
    })
    mockScheduleFollowups.mockResolvedValue(undefined)
    mockTrackAbTestEvent.mockResolvedValue(undefined)
    mockGetAbTestProfileEmail.mockResolvedValue(null)
    mockEnsureAbTestEmailCapturedFromProfile.mockImplementation(async (_userId: string, progress: unknown) => progress)
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders show_inside_STATE directly from callback data even when stored progress is stale idle q1', async () => {
    const ctx = createCtx()
    ctx.callbackQuery.data = 'show_inside_STATE'

    mockLoadAbTestProgress.mockResolvedValue({
      status: 'idle',
      stage: 'S2_TEST_QUESTIONS',
      current_question_id: 'q1',
      answers: [],
      result_key: null,
      revision: 0,
      started_at: null,
      email_stage: null,
      email_captured_at: null,
      result_opened_at: null,
    })

    const callback = handleAbTestCallback(ctx as never, 'show_inside_STATE')
    await vi.runAllTimersAsync()
    const handled = await callback

    expect(handled).toBe(true)
    expect(mockSaveAbTestProgress).not.toHaveBeenCalled()
    expect(mockLoadAbTestProgress).not.toHaveBeenCalled()
    expect(vi.mocked(ctx.telegram.sendMessage).mock.calls.some(([, text]) =>
      typeof text === 'string' && text.includes('Питання 1 з 8'),
    )).toBe(false)
    expect(vi.mocked(ctx.telegram.sendMessage).mock.calls.length).toBeGreaterThan(0)
    expect(vi.mocked(ctx.answerCbQuery)).toHaveBeenCalled()
  })
})

describe('handleAbTestCallback skip_email_before_result canonical dedupe', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockHasTelegramCtaInteraction.mockResolvedValue(false)
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })
    mockUserFindUnique.mockResolvedValue({
      firstName: 'Vira',
      telegramUserName: 'vira',
      testResultType: 'decision',
      lifecycleState: 'TEST_DONE',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delivers S3 once across concurrent and repeated skip-email callbacks', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    let storedProgress = {
      status: 'completed',
      stage: 'S3_TEST_RESULT',
      result_key: 'decision',
      email_stage: 'pending',
      result_opened_at: null,
      answers: [],
    }

    let lockHeld = false
    let firstSavePending = true
    let resolveSaveGate: (() => void) | null = null
    const saveGate = new Promise<void>((resolve) => {
      resolveSaveGate = resolve
    })
    let resolveFirstSaveEntered: (() => void) | null = null
    const firstSaveEntered = new Promise<void>((resolve) => {
      resolveFirstSaveEntered = resolve
    })

    mockLoadAbTestProgress.mockImplementation(async () => storedProgress)
    mockSaveAbTestProgress.mockImplementation(async (_userId: string, progress: typeof storedProgress) => {
      if (firstSavePending && progress.result_opened_at) {
        firstSavePending = false
        resolveFirstSaveEntered?.()
        await saveGate
      }
      storedProgress = progress
      return progress
    })
    mockScheduleFollowups.mockImplementation(async (_userId: string, progress: typeof storedProgress) => progress)
    mockWithRuntimeAdvisoryLock.mockImplementation(async (_input: unknown, task: () => Promise<unknown>) => {
      if (lockHeld) {
        return { acquired: false, value: null }
      }
      lockHeld = true
      try {
        const value = await task()
        return { acquired: true, value }
      } finally {
        lockHeld = false
      }
    })

    const firstCtx = createCtx()
    firstCtx.callbackQuery.data = 'skip_email_before_result'
    const secondCtx = createCtx()
    secondCtx.callbackQuery.id = 'cb-2'
    secondCtx.callbackQuery.data = 'skip_email_before_result'
    const thirdCtx = createCtx()
    thirdCtx.callbackQuery.id = 'cb-3'
    thirdCtx.callbackQuery.data = 'skip_email_before_result'

    const firstCallback = handleAbTestCallback(firstCtx as never, 'skip_email_before_result')
    await firstSaveEntered

    const secondHandled = await handleAbTestCallback(secondCtx as never, 'skip_email_before_result')
    resolveSaveGate?.()
    await vi.runAllTimersAsync()
    const firstHandled = await firstCallback
    const sendMessageCountAfterFirstDelivery = vi.mocked(firstCtx.telegram.sendMessage).mock.calls.length
    const thirdHandled = await handleAbTestCallback(thirdCtx as never, 'skip_email_before_result')

    expect(firstHandled).toBe(true)
    expect(secondHandled).toBe(true)
    expect(thirdHandled).toBe(true)
    expect(storedProgress.email_stage).toBe('skipped')
    expect(storedProgress.result_opened_at).not.toBeNull()
    expect(mockScheduleFollowups).toHaveBeenCalledTimes(1)
    expect(vi.mocked(firstCtx.telegram.sendMessage).mock.calls.length).toBe(sendMessageCountAfterFirstDelivery)
    expect(vi.mocked(secondCtx.telegram.sendMessage).mock.calls.length).toBe(0)
    expect(vi.mocked(thirdCtx.telegram.sendMessage).mock.calls.length).toBe(0)
    expect(mockLoadAbTestProgress.mock.calls.map(([userId]) => userId)).toEqual(
      expect.arrayContaining(['user-1']),
    )

    const s3TraceLogs = consoleInfoSpy.mock.calls
      .filter(([label]) => label === '[AB_TEST_S3_TRACE]')
      .map(([, payload]) => payload)

    expect(s3TraceLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-1',
          trigger: 'skip_email_before_result',
          dedupeKey: 'user-1:S3_TEST_RESULT:result_sequence',
          deliveryResult: 'sent',
        }),
        expect.objectContaining({
          userId: 'user-1',
          trigger: 'skip_email_before_result',
          dedupeKey: 'user-1:S3_TEST_RESULT:result_sequence',
          deliveryResult: 'dispatching',
        }),
      ]),
    )

    consoleInfoSpy.mockRestore()
  })
})

describe('handleAbTestCallback confirm_profile_email_for_result canonical dedupe', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockHasTelegramCtaInteraction.mockResolvedValue(false)
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })
    mockUserFindUnique.mockResolvedValue({
      firstName: 'Vira',
      telegramUserName: 'vira',
      testResultType: 'decision',
      lifecycleState: 'TEST_DONE',
    })
    mockGetAbTestProfileEmail.mockResolvedValue('vira@example.com')
    mockTrackAbTestEvent.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps confirm-email callbacks on one canonical S3 delivery path', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    let storedProgress = {
      status: 'completed',
      stage: 'S3_TEST_RESULT',
      result_key: 'decision',
      email_stage: 'pending',
      email_captured_at: null,
      result_opened_at: null,
      started_at: '2026-08-04T09:00:00.000Z',
      answers: [],
    }

    let lockHeld = false
    let firstResultSavePending = true
    let resolveSaveGate: (() => void) | null = null
    const saveGate = new Promise<void>((resolve) => {
      resolveSaveGate = resolve
    })
    let resolveFirstResultSaveEntered: (() => void) | null = null
    const firstResultSaveEntered = new Promise<void>((resolve) => {
      resolveFirstResultSaveEntered = resolve
    })

    mockLoadAbTestProgress.mockImplementation(async () => storedProgress)
    mockSaveAbTestProgress.mockImplementation(async (_userId: string, progress: typeof storedProgress) => {
      if (firstResultSavePending && progress.result_opened_at) {
        firstResultSavePending = false
        resolveFirstResultSaveEntered?.()
        await saveGate
      }
      storedProgress = progress
      return progress
    })
    mockEnsureAbTestEmailCapturedFromProfile.mockImplementation(async (userId: string, progress: typeof storedProgress) => {
      const nextProgress = {
        ...progress,
        email_stage: 'captured',
        email_captured_at: progress.email_captured_at ?? '2026-08-05T10:00:00.000Z',
      }
      return mockSaveAbTestProgress(userId, nextProgress)
    })
    mockScheduleFollowups.mockImplementation(async (_userId: string, progress: typeof storedProgress) => progress)
    mockWithRuntimeAdvisoryLock.mockImplementation(async (_input: unknown, task: () => Promise<unknown>) => {
      if (lockHeld) {
        return { acquired: false, value: null }
      }
      lockHeld = true
      try {
        const value = await task()
        return { acquired: true, value }
      } finally {
        lockHeld = false
      }
    })

    const ctxA = createCtx()
    ctxA.callbackQuery.data = 'confirm_profile_email_for_result'
    const ctxB = createCtx()
    ctxB.callbackQuery.id = 'cb-confirm-2'
    ctxB.callbackQuery.data = 'confirm_profile_email_for_result'
    const ctxC = createCtx()
    ctxC.callbackQuery.id = 'cb-confirm-3'
    ctxC.callbackQuery.data = 'confirm_profile_email_for_result'

    const firstCallback = handleAbTestCallback(ctxA as never, 'confirm_profile_email_for_result')
    const secondCallback = handleAbTestCallback(ctxB as never, 'confirm_profile_email_for_result')
    await firstResultSaveEntered
    resolveSaveGate?.()
    await vi.runAllTimersAsync()

    const [firstHandled, secondHandled] = await Promise.all([firstCallback, secondCallback])
    const sendMessageCountAfterFirstDelivery = vi.mocked(ctxA.telegram.sendMessage).mock.calls.length
    const thirdHandled = await handleAbTestCallback(ctxC as never, 'confirm_profile_email_for_result')

    expect(firstHandled).toBe(true)
    expect(secondHandled).toBe(true)
    expect(thirdHandled).toBe(true)
    expect(storedProgress.email_stage).toBe('captured')
    expect(storedProgress.email_captured_at).toBe('2026-08-05T10:00:00.000Z')
    expect(storedProgress.result_opened_at).not.toBeNull()
    expect(mockEnsureAbTestEmailCapturedFromProfile).toHaveBeenCalled()
    expect(mockScheduleFollowups).toHaveBeenCalledTimes(1)
    expect(mockTrackAbTestEvent).toHaveBeenCalledTimes(1)
    expect(ctxA.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(ctxB.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(ctxC.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ctxA.telegram.sendMessage).mock.calls.length).toBe(sendMessageCountAfterFirstDelivery)
    expect(vi.mocked(ctxB.telegram.sendMessage).mock.calls.length).toBe(0)
    expect(vi.mocked(ctxC.telegram.sendMessage).mock.calls.length).toBe(0)

    const resultSentLogs = consoleInfoSpy.mock.calls.filter(([label]) => label === '[RESULT_SENT]')
    const practiceButtonLogs = consoleInfoSpy.mock.calls.filter(([label]) => label === '[PRACTICE_BUTTON_RENDERED]')
    const s3TraceLogs = consoleInfoSpy.mock.calls
      .filter(([label]) => label === '[AB_TEST_S3_TRACE]')
      .map(([, payload]) => payload)

    expect(resultSentLogs).toHaveLength(1)
    expect(practiceButtonLogs).toHaveLength(1)
    expect(s3TraceLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-1',
          trigger: 'confirm_profile_email_for_result',
          dedupeKey: 'user-1:S3_TEST_RESULT:result_sequence',
          deliveryResult: 'sent',
        }),
        expect.objectContaining({
          userId: 'user-1',
          trigger: 'confirm_profile_email_for_result',
          dedupeKey: 'user-1:S3_TEST_RESULT:result_sequence',
          deliveryResult: 'dispatching',
        }),
      ]),
    )
    expect(
      s3TraceLogs
        .filter((payload) => payload && typeof payload === 'object')
        .map((payload) => (payload as { dedupeKey?: string }).dedupeKey),
    ).toEqual(expect.arrayContaining([
      'user-1:S3_TEST_RESULT:result_sequence',
    ]))

    consoleInfoSpy.mockRestore()
  })
})
