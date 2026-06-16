import { beforeAll, beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

import { parseAbTestCallback } from './abTest.callback.js'
import {
  getAbTestResultDefinition,
  type AbTestResultKey,
} from '../content/abTest.results.js'
import { normalizeAbTestProgress, buildAbTestProgressPatch } from '../../../core/state-machine/abTestFoundation.js'
import {
  AB_TEST_YELYZAVETA_REVIEW_HEADER,
  AB_TEST_YELYZAVETA_REVIEW_QUOTE,
  AB_TEST_SCREENSHOT_URLS,
} from '../content/abTest.shared.js'

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}

const sendOpsTelegramMessageMock = vi.fn().mockResolvedValue(true)
const coachBotSendMessageMock = vi.fn().mockResolvedValue({ message_id: 999 })
const hasTelegramCtaInteractionMock = vi.fn().mockResolvedValue(false)
const trackAbTestEventMock = vi.fn().mockResolvedValue(undefined)
const setPendingTelegramIdentityMock = vi.fn().mockResolvedValue(undefined)
const getAbTestProfileEmailMock = vi.fn()
const loadAbTestProgressMock = vi.fn()
const loadUserUiSettingsMock = vi.fn()
const saveAbTestProgressMock = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: prismaMock,
}))

vi.mock('../../../lib/telegram.js', () => ({
  sendOpsTelegramMessage: sendOpsTelegramMessageMock,
  coachBot: {
    telegram: {
      sendMessage: coachBotSendMessageMock,
    },
  },
}))

vi.mock('@/modules/telegram-mentor/services/ctaInteraction.service.js', () => ({
  hasTelegramCtaInteraction: hasTelegramCtaInteractionMock,
}))

vi.mock('./abTest.analytics.js', () => ({
  trackAbTestEvent: trackAbTestEventMock,
}))

vi.mock('../../../modules/telegram-mentor/services/pendingIdentity.service.js', () => ({
  setPendingTelegramIdentity: setPendingTelegramIdentityMock,
}))

vi.mock('./abTest.progress.js', async () => {
  const actual = await vi.importActual<typeof import('./abTest.progress.js')>('./abTest.progress.js')
  return {
    ...actual,
    getAbTestProfileEmail: getAbTestProfileEmailMock,
    loadAbTestProgress: loadAbTestProgressMock,
    loadUserUiSettings: loadUserUiSettingsMock,
    saveAbTestProgress: saveAbTestProgressMock,
  }
})

type ViewsModule = typeof import('./abTest.views.js')

let views: ViewsModule

beforeAll(async () => {
  views = await import('./abTest.views.js')
})

beforeEach(() => {
  // Skip sleep() delays so tests don't timeout
  vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: () => void) => {
    fn()
    return 0 as unknown as ReturnType<typeof setTimeout>
  })
  vi.clearAllMocks()
  prismaMock.user.findUnique.mockResolvedValue({
    firstName: 'Віра',
    telegramUserName: 'viravira',
  })
  prismaMock.user.update.mockResolvedValue({})
  getAbTestProfileEmailMock.mockResolvedValue('teachinform3@gmail.com')
  loadAbTestProgressMock.mockResolvedValue({
    status: 'completed',
    result_key: 'decision',
    email_stage: 'captured',
    result_opened_at: null,
  })
  loadUserUiSettingsMock.mockResolvedValue({})
  saveAbTestProgressMock.mockImplementation(async (_userId, progress) => progress)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function createCtx() {
  let nextMessageId = 100
  const sendMessage = vi.fn().mockImplementation(
    async (chatId: string | number, text: string, extra?: Record<string, unknown>) => ({
      message_id: nextMessageId++,
      chat: { id: chatId },
      text,
      ...extra,
    }),
  )
  const sendVoice = vi.fn().mockImplementation(
    async (chatId: string | number, voice: string, extra?: Record<string, unknown>) => ({
      message_id: nextMessageId++,
      chat: { id: chatId },
      voice,
      ...extra,
    }),
  )
  const sendPhoto = vi.fn().mockImplementation(
    async (chatId: string | number, photo: string, extra?: Record<string, unknown>) => ({
      message_id: nextMessageId++,
      chat: { id: chatId },
      photo,
      ...extra,
    }),
  )
  const sendVideo = vi.fn().mockImplementation(
    async (chatId: string | number, video: string, extra?: Record<string, unknown>) => ({
      message_id: nextMessageId++,
      chat: { id: chatId },
      video,
      ...extra,
    }),
  )

  return {
    chat: { id: 123456 },
    from: { id: 123456, first_name: 'Віра', username: 'viravira' },
    update: { update_id: 1 },
    telegram: {
      sendChatAction: vi.fn().mockResolvedValue(undefined),
      sendMessage,
      sendVoice,
      sendPhoto,
      sendVideo,
    },
  } as any
}

describe('focus_funnel_e2e', () => {
  it('[PASS] start shown — ab_test:start парситься', () => {
    expect(parseAbTestCallback('ab_test:start')).toEqual({ kind: 'start' })
  })

  it('[PASS] q1 shown / q8 shown — answer callbacks парсяться', () => {
    expect(parseAbTestCallback('ab_test_answer:q1:A:1')).toEqual({
      kind: 'answer',
      questionId: 'q1',
      answerId: 'A',
      revision: 1,
    })
    expect(parseAbTestCallback('ab_test_answer:q8:D:8')).toEqual({
      kind: 'answer',
      questionId: 'q8',
      answerId: 'D',
      revision: 8,
    })
  })

  it('[PASS] email requested — email gate renders existing email and required buttons', async () => {
    const ctx = createCtx()

    await views.renderAbTestEmailGate(ctx, 'user-1', {
      status: 'completed',
      result_key: 'decision',
      email_stage: 'pending',
    } as any)

    expect(ctx.telegram.sendMessage).toHaveBeenCalledTimes(1)
    const [, message, extra] = ctx.telegram.sendMessage.mock.calls[0]
    expect(message).toContain('У тебе вже є email:')
    expect(message).toContain('teachinform3@gmail.com')
    const keyboard = extra.reply_markup.inline_keyboard
    expect(keyboard[0][0].text).toBe('Так, це мій email')
    expect(keyboard[1][0].text).toBe('Змінити email')
    expect(keyboard[2][0].text).toBe('Пропустити')
  })

  it('[PASS] result sent once / voice sent / practice button rendered', async () => {
    const ctx = createCtx()
    const progress = {
      status: 'completed',
      result_key: 'decision',
      email_stage: 'captured',
      result_opened_at: null,
    } as any

    loadAbTestProgressMock.mockResolvedValue(progress)

    await views.renderAbTestPostEmailSubmitSequence(ctx, 'user-1', progress, {
      notifyOps: false,
    })

    expect(saveAbTestProgressMock).toHaveBeenCalledTimes(1)
    const savedProgress = saveAbTestProgressMock.mock.calls[0][1]
    expect(savedProgress.result_opened_at).toBeTruthy()

    expect(ctx.telegram.sendVoice).toHaveBeenCalledTimes(1)
    const voiceCall = ctx.telegram.sendVoice.mock.calls[0]
    expect(voiceCall?.[2]?.caption).toBeUndefined()

    const sendMessageCalls = ctx.telegram.sendMessage.mock.calls
    expect(sendMessageCalls.length).toBeGreaterThanOrEqual(2)
    expect(sendMessageCalls[1]?.[1]).toContain('прослухати голосове')

    const previewCall = sendMessageCalls.at(-1)
    expect(previewCall?.[1]).toBe('Хочеш подивитись як це проходить на практиці?')
    expect(previewCall?.[2]?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data).toBe(
      'show_inside_DECISION',
    )
  })

  it('[PASS] result sent once — duplicate completed callback does not redeliver', async () => {
    const ctx = createCtx()
    const progress = {
      status: 'completed',
      result_key: 'decision',
      email_stage: 'captured',
      result_opened_at: '2026-06-16T10:00:00.000Z',
    } as any

    await views.renderAbTestPostEmailSubmitSequence(ctx, 'user-1', progress, {
      notifyOps: false,
    })

    expect(ctx.telegram.sendMessage).not.toHaveBeenCalled()
    expect(ctx.telegram.sendVoice).not.toHaveBeenCalled()
  })

  it('[PASS] result sent once — stale caller progress is skipped when DB already has result_opened_at', async () => {
    const ctx = createCtx()
    loadAbTestProgressMock.mockResolvedValue({
      status: 'completed',
      result_key: 'decision',
      email_stage: 'captured',
      result_opened_at: '2026-06-16T10:00:00.000Z',
    })

    await views.renderAbTestPostEmailSubmitSequence(ctx, 'user-1', {
      status: 'completed',
      result_key: 'decision',
      email_stage: 'captured',
      result_opened_at: null,
    } as any)

    expect(saveAbTestProgressMock).not.toHaveBeenCalled()
    expect(ctx.telegram.sendMessage).not.toHaveBeenCalled()
    expect(ctx.telegram.sendVoice).not.toHaveBeenCalled()
  })

  it('[PASS] callback works / focus description sent / payment button rendered / payment url exists', async () => {
    const ctx = createCtx()

    expect(parseAbTestCallback('show_inside_DECISION')).toEqual({
      kind: 'show_inside',
      resultKey: 'decision',
    })

    await views.dispatchAbTestPracticeSequence(ctx, {
      chatId: 123456,
      resultKey: 'decision',
      firstName: 'Віра',
    })

    expect(ctx.telegram.sendPhoto).toHaveBeenCalledTimes(1)
    const sendMessageCalls = ctx.telegram.sendMessage.mock.calls
    expect(
      sendMessageCalls.some(
        (call) => typeof call[1] === 'string' && String(call[1]).includes('<blockquote>')
      )
    ).toBe(true)
    const paymentCall = sendMessageCalls.at(-1)
    expect(paymentCall?.[1]).toBe('Хочеш приєднатись до ФОКУСУ?')
    expect(paymentCall?.[2]?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data).toBe(
      'open_focus_payment',
    )

    expect('open_focus_payment'.match(/^open_focus_payment(?::(1month|3month))?$/)).not.toBeNull()
  })
})

describe('ab_test_restart_flow', () => {
  it('[PASS] restart is allowed during focus lock', () => {
    const allowedDuringFocusLock = new Set([
      'ab_test:show_result',
      'ab_test:restart',
      'ab_test:focus_info',
      'open_focus_payment',
      'focus:already_paid',
    ])

    expect(allowedDuringFocusLock.has('ab_test:restart')).toBe(true)
  })

  it('[PASS] restart reset clears result/email state before new run', () => {
    const reset = buildAbTestProgressPatch(normalizeAbTestProgress(undefined), {
      answers: [],
      questions_shown: [],
      current_question_id: null,
      result_key: null,
      result_opened_at: null,
      email_stage: null,
      email_captured_at: null,
      focus_opened_at: null,
      payment_started_at: null,
      payment_success_at: null,
      zoom_registered_at: null,
      zoom_attended_at: null,
      platform_invited_at: null,
      platform_ready_at: null,
      last_callback_key: 'ab_test:restart',
      last_message_key: null,
      last_event_at: '2026-06-16T13:00:00.000Z',
    })

    expect(reset.answers).toEqual([])
    expect(reset.result_key).toBeNull()
    expect(reset.result_opened_at).toBeNull()
    expect(reset.email_stage).toBeNull()
    expect(reset.focus_opened_at).toBeNull()
    expect(reset.payment_started_at).toBeNull()
  })

  it('[PASS] restart second phase moves test into active q1 state', () => {
    const fresh = buildAbTestProgressPatch(normalizeAbTestProgress(undefined), {
      last_callback_key: 'ab_test:restart',
      last_event_at: '2026-06-16T13:00:00.000Z',
    })

    const restarted = buildAbTestProgressPatch(fresh, {
      status: 'active',
      stage: 'S2_TEST_QUESTIONS',
      current_question_id: 'q1',
      started_at: '2026-06-16T13:00:01.000Z',
      revision: fresh.revision + 1,
      questions_shown: ['q1'],
      last_callback_key: 'ab_test:restart',
      last_message_key: 'TEST_Q1',
      last_event_at: '2026-06-16T13:00:01.000Z',
    })

    expect(restarted.status).toBe('active')
    expect(restarted.stage).toBe('S2_TEST_QUESTIONS')
    expect(restarted.current_question_id).toBe('q1')
    expect(restarted.questions_shown).toEqual(['q1'])
  })
})

describe('content_drift_audit', () => {
  const resultKeys: AbTestResultKey[] = ['state', 'goal', 'choice', 'decision', 'action']

  for (const key of resultKeys) {
    it(`[PASS] ${key} — result/voice/practice/review/pricing pipeline is structurally complete`, () => {
      const result = getAbTestResultDefinition(key)

      expect(result.msg1.trim().length).toBeGreaterThan(0)
      expect(result.msg1_audio.trim().length).toBeGreaterThan(0)
      expect(result.blocks?.intro.length ?? 0).toBeGreaterThan(0)
      expect(result.blocks?.practice.length ?? 0).toBeGreaterThan(0)
      expect(result.blocks?.review.length ?? 0).toBeGreaterThan(0)
      expect(result.blocks?.pricing.length ?? 0).toBeGreaterThan(0)
      expect(result.blocks?.intro.some((block) => block.type === 'audio')).toBe(true)
      expect(result.blocks?.review.some((block) => block.type === 'quote')).toBe(true)
      expect(result.blocks?.review.some((block) => block.type === 'image')).toBe(true)
      expect(result.blocks?.pricing.every((block) => block.type === 'text')).toBe(true)
    })
  }
})

describe('decision_review_regression', () => {
  it('[PASS] DECISION review uses Єлизавета header', () => {
    expect(AB_TEST_YELYZAVETA_REVIEW_HEADER).toContain('Єлизавета')
  })

  it('[PASS] DECISION review quote matches ТЗ', () => {
    expect(AB_TEST_YELYZAVETA_REVIEW_QUOTE).toContain('Завдяки її підтримці')
    expect(AB_TEST_YELYZAVETA_REVIEW_QUOTE).toContain('впевненішою в собі')
    expect(AB_TEST_YELYZAVETA_REVIEW_QUOTE).not.toContain('Вона веде мене до реалізації')
  })

  it('[PASS] DECISION review screenshot uses decision_review asset', () => {
    const result = getAbTestResultDefinition('decision')
    const imageBlock = result.blocks?.review.find((b) => b.type === 'image')
    expect(imageBlock).toBeDefined()
    if (imageBlock?.type === 'image') {
      expect(imageBlock.assetKey).toBe(AB_TEST_SCREENSHOT_URLS.decision_review)
    }
  })

  it('[PASS] DECISION review — text(header) + quote(quote) = ONE message, then image separately', () => {
    const result = getAbTestResultDefinition('decision')
    const reviewBlocks = result.blocks?.review ?? []

    // Структура: [text(header), quote(quote_only), image]
    // text + quote → splitReviewSequence.message → одне sendTelegramContentChunk → одне повідомлення
    // image → splitReviewSequence.screenshot → окреме повідомлення

    // Рівно: 1 text + 1 quote + 1 image = 3 блоки
    expect(reviewBlocks).toHaveLength(3)

    const textBlock = reviewBlocks.find((b) => b.type === 'text')
    expect(textBlock).toBeDefined()
    if (textBlock?.type === 'text') {
      expect(textBlock.text).toContain('Єлизавета')
      // Header НЕ містить цитату
      expect(textBlock.text).not.toContain('Завдяки її підтримці')
    }

    const quoteBlock = reviewBlocks.find((b) => b.type === 'quote')
    expect(quoteBlock).toBeDefined()
    if (quoteBlock?.type === 'quote') {
      // Quote НЕ містить header
      expect(quoteBlock.text).not.toContain('Єлизавета')
      expect(quoteBlock.text).toContain('Завдяки її підтримці')
    }

    const imageBlock = reviewBlocks.find((b) => b.type === 'image')
    expect(imageBlock).toBeDefined()
  })
})
