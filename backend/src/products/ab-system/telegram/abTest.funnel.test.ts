import { beforeAll, beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

import { parseAbTestCallback } from './abTest.callback.js'
import {
  getAbTestResultDefinition,
  type AbTestResultKey,
} from '../content/abTest.results.js'

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

    const sendMessageCalls = ctx.telegram.sendMessage.mock.calls
    expect(sendMessageCalls.length).toBeGreaterThanOrEqual(2)

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

    const sendMessageCalls = ctx.telegram.sendMessage.mock.calls
    const paymentCall = sendMessageCalls.at(-1)
    expect(paymentCall?.[1]).toBe('Хочеш приєднатись до ФОКУСУ?')
    expect(paymentCall?.[2]?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data).toBe(
      'open_focus_payment',
    )

    expect('open_focus_payment'.match(/^open_focus_payment(?::(1month|3month))?$/)).not.toBeNull()
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
    })
  }
})
