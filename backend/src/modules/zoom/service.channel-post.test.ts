import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionFindMany = vi.fn()
const mockZoomChannelPostFindFirst = vi.fn()
const mockZoomChannelPostCreate = vi.fn()
const mockZoomChannelPostUpdate = vi.fn()
const mockZoomChannelPostDelete = vi.fn()
const mockZoomChannelPostDeleteMany = vi.fn()
const mockGetBotLink = vi.fn()
const mockSendTelegramMessage = vi.fn()
const mockPinChatMessage = vi.fn()
const mockEditMessageText = vi.fn()

vi.mock('../../db/client.js', () => ({
  prisma: {
    zoomSession: {
      findMany: (...args: unknown[]) => mockZoomSessionFindMany(...args),
    },
    zoomChannelPost: {
      findFirst: (...args: unknown[]) => mockZoomChannelPostFindFirst(...args),
      create: (...args: unknown[]) => mockZoomChannelPostCreate(...args),
      update: (...args: unknown[]) => mockZoomChannelPostUpdate(...args),
      delete: (...args: unknown[]) => mockZoomChannelPostDelete(...args),
      deleteMany: (...args: unknown[]) => mockZoomChannelPostDeleteMany(...args),
    },
  },
}))

vi.mock('../../lib/db/weeklyReportCache.js', () => ({
  getCachedLatestWeeklyReport: vi.fn(),
}))

vi.mock('../../lib/telegram.js', () => ({
  bot: {},
  getBotLink: (...args: unknown[]) => mockGetBotLink(...args),
  sendDedupedTelegramMessage: vi.fn(),
  sendOpsTelegramMessage: vi.fn(),
}))

vi.mock('../../lib/telegram/messageFormatter.js', () => ({
  sendTelegramMessage: (...args: unknown[]) => mockSendTelegramMessage(...args),
}))

import { formatChannelPost, syncChannelPost } from './service.js'

describe('focus channel post contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FOCUS_TELEGRAM_CHANNEL_ID = '@focus_channel'
    mockGetBotLink.mockReturnValue('https://t.me/Test_ABsystem_bot')
    mockZoomChannelPostFindFirst.mockResolvedValue(null)
    mockZoomChannelPostCreate.mockResolvedValue({ id: 'post-1', messageId: 321, chatId: '@focus_channel' })
    mockZoomChannelPostUpdate.mockResolvedValue({ id: 'post-1', messageId: 321, chatId: '@focus_channel' })
    mockZoomChannelPostDelete.mockResolvedValue(undefined)
    mockZoomChannelPostDeleteMany.mockResolvedValue({ count: 0 })
    mockSendTelegramMessage.mockResolvedValue({ message_id: 321 })
    mockPinChatMessage.mockResolvedValue(true)
  })

  it('renders exact next session date and removes welcome funnel copy when live session exists', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      {
        scheduledAt: new Date('2026-08-17T16:00:00.000Z'),
        requests: { type: 'group_practice' },
      },
    ])

    const text = await formatChannelPost()

    expect(text).toContain('ФОКУС')
    expect(text).toContain('Наступна Zoom-практика:')
    expect(text).toContain('Понеділок, 17 серпня · 19:00')
    expect(text).toContain('Повернися в чат-бот та обери найближчу практику і забронюй місце.')
    expect(text).not.toContain('Вітаю, ти всередині ФОКУСУ.')
    expect(text).not.toContain('Що далі:')
    expect(text).not.toContain('Що зробити зараз:')
    expect(text).not.toContain('Записатись на Zoom')
    expect(text).not.toContain('Відкрити чат-бот')
  })

  it('falls back to recurring Monday 19:00 copy only when no exact next session exists', async () => {
    mockZoomSessionFindMany.mockResolvedValue([])

    const text = await formatChannelPost()

    expect(text).toContain('ФОКУС')
    expect(text).toContain('Щопонеділка Zoom-практика · 19:00')
    expect(text).not.toContain('Наступна Zoom-практика:')
  })

  it('sends exactly one return CTA pointing to the canonical bot link', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      {
        scheduledAt: new Date('2026-08-17T16:00:00.000Z'),
        requests: { type: 'group_practice' },
      },
    ])

    const telegramBot = {
      telegram: {
        pinChatMessage: mockPinChatMessage,
        editMessageText: mockEditMessageText,
      },
    }

    await syncChannelPost(telegramBot as never)

    expect(mockSendTelegramMessage).toHaveBeenCalledWith(
      telegramBot,
      '@focus_channel',
      expect.stringContaining('Повернися в чат-бот'),
      expect.objectContaining({
        replyMarkup: {
          inline_keyboard: [[{ text: 'ПОВЕРНУТИСЯ', url: 'https://t.me/Test_ABsystem_bot' }]],
        },
      }),
    )
    const payload = mockSendTelegramMessage.mock.calls[0]?.[3]?.replyMarkup?.inline_keyboard ?? []
    expect(payload).toHaveLength(1)
    expect(payload[0]).toEqual([{ text: 'ПОВЕРНУТИСЯ', url: 'https://t.me/Test_ABsystem_bot' }])
    expect(JSON.stringify(payload)).not.toContain('Записатись на Zoom')
    expect(JSON.stringify(payload)).not.toContain('/miniapp/')
    expect(JSON.stringify(payload)).not.toContain('startapp=zoom_booking')
  })
})
