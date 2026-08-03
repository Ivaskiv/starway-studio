import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSendOpsTelegramMessage = vi.fn()
const mockCoachSendMessage = vi.fn()
const mockSaveAbTestProgress = vi.fn()
const mockHasTelegramCtaInteraction = vi.fn()
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

vi.mock('../../../db/client.js', () => ({
  prisma: {
    user: { update: vi.fn() },
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

vi.mock('../../../lib/telegram.js', () => ({
  coachBot: {
    telegram: {
      sendMessage: (...args: unknown[]) => mockCoachSendMessage(...args),
    },
  },
  sendOpsTelegramMessage: (...args: unknown[]) => mockSendOpsTelegramMessage(...args),
}))

vi.mock('../../../lib/telegram/messageFormatter.js', () => ({
  blockquote: (value: string) => `<blockquote>${value}</blockquote>`,
  bold: (value: string) => `<b>${value}</b>`,
  escapeTelegramHtml: (value: string) => value,
  joinBlocks: (blocks: Array<string | null | undefined>) => blocks.filter(Boolean).join('\n\n'),
  sendTelegramMessage: (...args: Parameters<typeof mockSendTelegramMessage>) =>
    mockSendTelegramMessage(...args),
}))

vi.mock('../../../core/orchestrator/testOrchestrator.js', () => ({
  testOrchestrator: {
    onDojimSequenceComplete: vi.fn(),
  },
}))

vi.mock('../../../modules/telegram-mentor/conversation/delivery/planDelivery.js', () => ({
  planMessage: vi.fn(),
}))

vi.mock('../../../modules/telegram-mentor/services/pendingIdentity.service.js', () => ({
  setPendingTelegramIdentity: vi.fn(),
}))

vi.mock('./abTest.analytics.js', () => ({
  trackAbTestEvent: vi.fn(),
}))

vi.mock('./abTest.buttons.js', () => ({
  buildWebAppButton: vi.fn(),
  resolveBrowserTestUrlOrNull: vi.fn(),
}))

vi.mock('./abTest.scheduler.js', () => ({
  scheduleFollowups: vi.fn(),
}))

vi.mock('./abTest.progress.js', () => ({
  buildAbTestEmailGateMessage: vi.fn(),
  getAbTestProfileEmail: vi.fn(),
  getAbTestProgressFromUiSettings: vi.fn(),
  loadAbTestProgress: vi.fn(),
  loadUserUiSettings: vi.fn(),
  saveAbTestProgress: (...args: unknown[]) => mockSaveAbTestProgress(...args),
}))

vi.mock('@/modules/telegram-mentor/services/ctaInteraction.service.js', () => ({
  hasTelegramCtaInteraction: (...args: unknown[]) => mockHasTelegramCtaInteraction(...args),
}))

vi.mock('@/products/absystem/config/absystem.content.js', async () => {
  const actual =
    await vi.importActual<typeof import('@/products/absystem/config/absystem.content.js')>(
      '@/products/absystem/config/absystem.content.js',
    )
  return actual
})

vi.mock('@/modules/zoom/service.js', () => ({
  getUpcomingZoom: vi.fn(),
}))

vi.mock('@/modules/zoom/urls.js', () => ({
  buildZoomCalendarUrl: vi.fn(() => 'https://miniapp.example/miniapp/zoom-calendar?intent=booking'),
}))

import {
  AB_TEST_BOOK_ZOOM_CTA_TEXT,
  AB_TEST_PRACTICE_PREVIEW_PROMPT,
  AB_TEST_SHOW_INSIDE_CTA_TEXT,
} from '../content/abTest.shared.js'
import {
  dispatchAbTestResultSequence,
  sendResultSnapshot,
} from './abTest.views.js'

function createCtx() {
  return {
    from: { id: 42, first_name: 'Vira' },
    telegram: {
      sendChatAction: vi.fn(async () => undefined),
      sendMessage: vi.fn(async () => ({ message_id: 99 })),
      sendPhoto: vi.fn(async () => undefined),
      sendVoice: vi.fn(async () => undefined),
      sendVideo: vi.fn(async () => undefined),
    },
  }
}

describe('dispatchAbTestResultSequence practice preview keyboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockHasTelegramCtaInteraction.mockResolvedValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders practice preview with show-practice and canonical zoom buttons in one row without side effects', async () => {
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

    expect(introTexts.some((text) => text.includes('<b>Твій результат: РІШЕННЯ</b>'))).toBe(true)
    expect(introTexts.some((text) => text.trim() === '<b>РІШЕННЯ</b>')).toBe(false)
    expect(
      introTexts.some((text) =>
        text.includes('«Я все розумію але не роблю» — це була я. Роками.'),
      ),
    ).toBe(false)
    expect(introTexts.some((text) => text.includes('**РІШЕННЯ**'))).toBe(false)

    const lastCall = vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)

    expect(lastCall).toEqual([
      '42',
      AB_TEST_PRACTICE_PREVIEW_PROMPT,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: AB_TEST_SHOW_INSIDE_CTA_TEXT,
                callback_data: 'show_inside_DECISION',
              },
              {
                text: AB_TEST_BOOK_ZOOM_CTA_TEXT,
                web_app: {
                url: 'https://miniapp.example/miniapp/zoom-calendar?intent=booking',
                },
              },
            ],
          ],
        },
      },
    ])
    expect(JSON.stringify(lastCall)).not.toContain('ПОКАЗАТИ ПРАКТИКУ')
    expect(JSON.stringify(lastCall)).not.toContain('localhost')
    expect(JSON.stringify(lastCall)).not.toContain('ngrok')
    expect(vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)?.[2]?.reply_markup.inline_keyboard).toHaveLength(1)
    expect(vi.mocked(ctx.telegram.sendMessage).mock.calls.at(-1)?.[2]?.reply_markup.inline_keyboard[0]).toHaveLength(2)
    expect(mockSaveAbTestProgress).not.toHaveBeenCalled()
    expect(mockSendOpsTelegramMessage).not.toHaveBeenCalled()
    expect(mockCoachSendMessage).not.toHaveBeenCalled()
  })

  it('reuses the same canonical keyboard for result replay without triggering booking side effects', async () => {
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
          [
            {
              text: AB_TEST_SHOW_INSIDE_CTA_TEXT,
              callback_data: 'show_inside_DECISION',
            },
            {
              text: AB_TEST_BOOK_ZOOM_CTA_TEXT,
              web_app: {
                url: 'https://miniapp.example/miniapp/zoom-calendar?intent=booking',
              },
            },
          ],
        ],
      },
    })
    expect(replayCall?.[2]?.reply_markup.inline_keyboard).toHaveLength(1)
    expect(replayCall?.[2]?.reply_markup.inline_keyboard[0]).toHaveLength(2)
    expect(JSON.stringify(replayCall)).not.toContain('ПОКАЗАТИ ПРАКТИКУ')
    expect(JSON.stringify(replayCall)).not.toContain('localhost')
    expect(JSON.stringify(replayCall)).not.toContain('ngrok')
    expect(mockSaveAbTestProgress).not.toHaveBeenCalled()
    expect(mockSendOpsTelegramMessage).not.toHaveBeenCalled()
    expect(mockCoachSendMessage).not.toHaveBeenCalled()
  })
})
