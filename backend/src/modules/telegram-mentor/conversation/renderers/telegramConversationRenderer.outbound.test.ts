import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendDedupedTelegramMessage: vi.fn(),
  sendPhoto: vi.fn(),
}))

vi.mock('../../../../lib/telegram.js', () => ({
  bot: {
    telegram: {
      sendPhoto: mocks.sendPhoto,
      sendVoice: vi.fn(),
      sendVideo: vi.fn(),
      sendDocument: vi.fn(),
      sendChatAction: vi.fn(),
    },
  },
  sendDedupedTelegramMessage: mocks.sendDedupedTelegramMessage,
}))

import { TelegramConversationRenderer } from './telegramConversationRenderer.js'
import { TelegramDeliveryAdapter } from '../../../../services/notifications/delivery/TelegramDeliveryAdapter.js'

describe('TelegramConversationRenderer outbound', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendDedupedTelegramMessage.mockResolvedValue(true)
    mocks.sendPhoto.mockResolvedValue({ message_id: 1 })
  })

  it('renders outbound text through deduped shared transport', async () => {
    const renderer = new TelegramConversationRenderer()

    const sent = await renderer.renderOutbound({ chatId: '123' }, {
      text: 'Привіт',
      buttons: [{ kind: 'url', label: 'Open', value: 'https://example.com' }],
      cards: [],
      media: [],
      nextActions: [],
      telemetry: {},
      analytics: {},
    })

    expect(sent).toBe(true)
    expect(mocks.sendDedupedTelegramMessage).toHaveBeenCalledWith(
      '123',
      'Привіт',
      {
        link_preview_options: {
          is_disabled: true,
        },
        reply_markup: {
          inline_keyboard: [[{ text: 'Open', url: 'https://example.com' }]],
        },
      },
      expect.anything(),
    )
  })

  it('renders outbound media through the shared renderer', async () => {
    const renderer = new TelegramConversationRenderer()

    const sent = await renderer.renderOutbound({ chatId: '321' }, {
      text: null,
      buttons: [],
      cards: [],
      media: [{
        kind: 'photo',
        assetKey: 'asset-key',
        caption: 'Caption',
        parseMode: 'HTML',
        buttons: [{ kind: 'callback', label: 'Confirm', value: 'ok' }],
      }],
      nextActions: [],
      telemetry: {},
      analytics: {},
    })

    expect(sent).toBe(true)
    expect(mocks.sendPhoto).toHaveBeenCalledWith('321', 'asset-key', {
      caption: 'Caption',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: 'Confirm', callback_data: 'ok' }]],
      },
    })
  })
})

describe('TelegramDeliveryAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendDedupedTelegramMessage.mockResolvedValue(true)
  })

  it('converts delivery messages to conversation cards and uses the shared renderer', async () => {
    const adapter = new TelegramDeliveryAdapter()

    const sent = await adapter.send({
      id: 'user-1',
      firstName: 'Vira',
      email: null,
      telegramChatId: '777',
      telegramUserId: null,
      telegramLinks: [],
    }, {
      title: 'Заголовок',
      body: 'Тіло',
      ctaText: 'Відкрити',
      ctaUrl: 'https://example.com/app',
      ctaMode: 'url',
    })

    expect(sent).toBe(true)
    expect(mocks.sendDedupedTelegramMessage).toHaveBeenCalledWith(
      '777',
      '<b>Заголовок</b>\n\nТіло',
      {
        link_preview_options: {
          is_disabled: true,
        },
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Відкрити', url: 'https://example.com/app' }]],
        },
      },
      expect.anything(),
    )
  })
})
