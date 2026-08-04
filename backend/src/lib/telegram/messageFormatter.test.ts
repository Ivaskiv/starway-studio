import { describe, expect, it, vi } from 'vitest'

import {
  blockquote,
  bold,
  escapeTelegramHtml,
  formatTelegramMessage,
  joinBlocks,
  sendTelegramMessage,
} from './messageFormatter.js'

describe('messageFormatter', () => {
  it('bold escapes dynamic values', () => {
    expect(bold('<script>')).toBe('<b>&lt;script&gt;</b>')
  })

  it('blockquote escapes dynamic values', () => {
    expect(blockquote('<b>x</b> & y')).toBe('<blockquote>&lt;b&gt;x&lt;/b&gt; &amp; y</blockquote>')
  })

  it('joinBlocks removes empty blocks', () => {
    expect(joinBlocks(['Перше', '', null, 'Друге', false, ''])).toBe('Перше\n\nДруге')
  })

  it('unsupported raw tags from dynamic input become text', () => {
    expect(formatTelegramMessage('<u>unsafe</u>').text).toBe('&lt;u&gt;unsafe&lt;/u&gt;')
  })

  it('unicode and ukrainian text are preserved', () => {
    expect(formatTelegramMessage('РІШЕННЯ — це твій фокус').text).toBe('РІШЕННЯ — це твій фокус')
  })

  it('escapes ampersand, angle brackets and quotes', () => {
    expect(escapeTelegramHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;')
  })

  it('does not double escape existing entities', () => {
    expect(escapeTelegramHtml('&lt;script&gt; &amp;')).toBe('&lt;script&gt; &amp;')
  })

  it('sendTelegramMessage uses HTML parse mode', async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 1 }))

    await sendTelegramMessage(
      { sendMessage },
      '42',
      { text: bold('Результат'), parseMode: 'HTML' },
    )

    expect(sendMessage).toHaveBeenCalledWith(
      '42',
      '<b>Результат</b>',
      expect.objectContaining({ parse_mode: 'HTML' }),
    )
  })

  it('falls back to escaped plaintext on parse entity error', async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("can't parse entities"))
      .mockResolvedValueOnce({ message_id: 2 })

    await sendTelegramMessage(
      { sendMessage },
      '42',
      { text: '<b>Title</b>\n\n<blockquote>Quote</blockquote>', parseMode: 'HTML' },
      { replyMarkup: { inline_keyboard: [[{ text: 'CTA', callback_data: 'x' }]] } },
    )

    expect(sendMessage).toHaveBeenCalledTimes(2)
    expect(sendMessage.mock.calls[1]?.[1]).toBe('Title\n\nQuote')
    expect(sendMessage.mock.calls[1]?.[2]).toEqual(
      expect.objectContaining({
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: 'CTA', callback_data: 'x' }]] },
      }),
    )
  })

  it('does not send fallback when primary send succeeds', async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 3 }))

    await sendTelegramMessage({ sendMessage }, '42', { text: '<b>OK</b>', parseMode: 'HTML' })

    expect(sendMessage).toHaveBeenCalledTimes(1)
  })
})
