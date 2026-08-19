import { describe, expect, it, vi } from 'vitest'

import {
  blockquote,
  bold,
  escapeTelegramHtml,
  formatTelegramCaption,
  formatTelegramMessage,
  joinBlocks,
  sendTelegramDocument,
    sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramVoice,
} from '../messageFormatter.ts'

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

  it('formats accent markdown into bold html', () => {
    expect(formatTelegramMessage('**Акцентна фраза**').text).toBe('<b>Акцентна фраза</b>')
  })

  it('formats legacy unmatched opening markdown marker as bold for the full line', () => {
    expect(formatTelegramMessage('**Хочу показати тобі повідомлення від Неоніли.**').text).toBe(
      '<b>Хочу показати тобі повідомлення від Неоніли.</b>',
    )
  })

  it('formats quote markers into telegram blockquotes', () => {
    expect(formatTelegramMessage('QUOTE: Це цитата').text).toBe('<blockquote>Це цитата</blockquote>')
    expect(formatTelegramMessage('> Це теж цитата').text).toBe('<blockquote>Це теж цитата</blockquote>')
  })

  it('preserves preformatted block semantics for pricing and testimonials', () => {
    expect(
      formatTelegramMessage({
        blocks: [bold('12 000 грн'), blockquote('Відгук після практики')],
        preformatted: true,
      }).text,
    ).toBe('<b>12 000 грн</b>\n\n<blockquote>Відгук після практики</blockquote>')
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

  it('formats image captions through the canonical formatter', async () => {
    const sendPhoto = vi.fn(async () => ({ message_id: 4 }))

    await sendTelegramPhoto({ sendMessage: vi.fn(), sendPhoto }, '42', 'asset-key', {
      caption: '**Хочу показати тобі повідомлення**',
    })

    expect(sendPhoto).toHaveBeenCalledWith(
      '42',
      'asset-key',
      expect.objectContaining({
        caption: '<b>Хочу показати тобі повідомлення</b>',
        parse_mode: 'HTML',
      }),
    )
  })

  it('formats audio captions through the canonical formatter', async () => {
    const sendVoice = vi.fn(async () => ({ message_id: 5 }))

    await sendTelegramVoice({ sendMessage: vi.fn(), sendVoice }, '42', 'voice-key', {
      caption: '[ЦИТАТА] Важливий інсайт',
    })

    expect(sendVoice).toHaveBeenCalledWith(
      '42',
      'voice-key',
      expect.objectContaining({
        caption: '<blockquote>Важливий інсайт</blockquote>',
        parse_mode: 'HTML',
      }),
    )
  })

  it('formats document captions through the canonical formatter', async () => {
    const sendDocument = vi.fn(async () => ({ message_id: 6 }))

    await sendTelegramDocument({ sendMessage: vi.fn(), sendDocument }, '42', 'doc-key', {
      caption: 'Тариф: **3 місяці**',
    })

    expect(sendDocument).toHaveBeenCalledWith(
      '42',
      'doc-key',
      expect.objectContaining({
        caption: 'Тариф: <b>3 місяці</b>',
        parse_mode: 'HTML',
      }),
    )
  })

  it('formats standalone captions without leaking raw markers', () => {
    expect(formatTelegramCaption('**ТВОЄ ПИТАННЯ**')?.text).toBe('<b>ТВОЄ ПИТАННЯ</b>')
    expect(formatTelegramCaption('QUOTE: Цитата')?.text).toBe('<blockquote>Цитата</blockquote>')
  })
})
