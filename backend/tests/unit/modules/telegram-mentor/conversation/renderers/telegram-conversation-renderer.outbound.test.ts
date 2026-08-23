import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendDedupedTelegramMessage: vi.fn(),
  sendPhoto: vi.fn(),
  renderOutbound: vi.fn(),
}))

vi.mock('../../../../../../src/lib/telegram.ts', () => ({
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

import { TelegramConversationRenderer } from '../../../../../../src/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.ts'

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

  it('applies top-level outbound buttons to card delivery when response text is null', async () => {
    const renderer = new TelegramConversationRenderer()

    const sent = await renderer.renderOutbound({ chatId: '555' }, {
      text: null,
      buttons: [{ kind: 'web_app', label: 'ОБРАТИ ZOOM-ПРАКТИКУ', value: 'https://example.com/miniapp/zoom-calendar' }],
      cards: [{
        kind: 'message',
        text: '✅ Оплату підтверджено',
        parseMode: 'HTML',
      }],
      media: [],
      nextActions: [],
      telemetry: {},
      analytics: {},
    })

    expect(sent).toBe(true)
    expect(mocks.sendDedupedTelegramMessage).toHaveBeenCalledWith(
      '555',
      '✅ Оплату підтверджено',
      {
        link_preview_options: {
          is_disabled: true,
        },
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'ОБРАТИ ZOOM-ПРАКТИКУ', web_app: { url: 'https://example.com/miniapp/zoom-calendar' } }]],
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
    mocks.renderOutbound.mockResolvedValue(true)
  })

  it('converts delivery messages to conversation cards and uses the shared renderer', async () => {
    vi.resetModules()
    const renderOutboundMock = vi.fn().mockResolvedValue(true)
    vi.doMock('../../../../../../src/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.ts', () => ({
      TelegramConversationRenderer: class {
        renderOutbound = renderOutboundMock
      },
    }))
    vi.doMock('../../../../../../src/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js', () => ({
      TelegramConversationRenderer: class {
        renderOutbound = renderOutboundMock
      },
    }))

    const { TelegramDeliveryAdapter } = await import('../../../../../../src/services/notifications/delivery/TelegramDeliveryAdapter.ts')
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
    expect(renderOutboundMock).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: '777' }),
      expect.objectContaining({
        text: null,
        buttons: [{ kind: 'url', label: 'Відкрити', value: 'https://example.com/app' }],
        cards: [
          expect.objectContaining({
            kind: 'message',
            text: '<b>Заголовок</b>\n\nТіло',
            parseMode: 'HTML',
          }),
        ],
      }),
    )
  })
})
