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
} from '@/lib/telegram/messageFormatter.js'
import { resolveAbTestFollowupCopy } from '@/products/ab-system/content/abTest.followups.js'
import {
  compactFocusDojimBlocks,
  renderFocusDojimBlock,
} from '@/services/notifications/NotificationService.telegram.js'

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

  it('adds a single blank line between logical paragraphs', () => {
    expect(formatTelegramMessage('Заголовок\nАбзац 1\nАбзац 2').text).toBe(
      'Заголовок\n\nАбзац 1\n\nАбзац 2',
    )
  })

  it('keeps existing paragraph spacing idempotent', () => {
    expect(formatTelegramMessage('Заголовок\n\nАбзац 1\n\nАбзац 2').text).toBe(
      'Заголовок\n\nАбзац 1\n\nАбзац 2',
    )
  })

  it('adds a blank line before bullet items while keeping list rows compact', () => {
    expect(formatTelegramMessage('Список:\n• один\n• два').text).toBe(
      'Список:\n\n• один\n• два',
    )
  })

  it('adds a blank line after bullet lists before the next prose paragraph', () => {
    expect(formatTelegramMessage('Список:\n• один\n• два\nФінальний абзац').text).toBe(
      'Список:\n\n• один\n• два\n\nФінальний абзац',
    )
  })

  it('keeps bold bullet rows compact in final html payloads', async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 9 }))

    await sendTelegramMessage(
      { sendMessage },
      '42',
      {
        text: '<b>У ФОКУС ти отримуєш:</b>\n<b>• item 1</b>\n<b>• item 2</b>\nФінальний абзац',
        parseMode: 'HTML',
      },
    )

    expect(sendMessage).toHaveBeenCalledWith(
      '42',
      '<b>У ФОКУС ти отримуєш:</b>\n\n<b>• item 1</b>\n<b>• item 2</b>\n\nФінальний абзац',
      expect.objectContaining({ parse_mode: 'HTML' }),
    )
  })

  it('keeps bold pricing rows compact in final html payloads', async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 10 }))

    await sendTelegramMessage(
      { sendMessage },
      '42',
      {
        text: '<b>1 місяць — 33 €</b>\n<b>3 місяці — 69 € (23 € на місяць)</b>\n<b>1 рік — 229 € (19 € на місяць)</b>',
        parseMode: 'HTML',
      },
    )

    expect(sendMessage).toHaveBeenCalledWith(
      '42',
      '<b>1 місяць — 33 €</b>\n<b>3 місяці — 69 € (23 € на місяць)</b>\n<b>1 рік — 229 € (19 € на місяць)</b>',
      expect.objectContaining({ parse_mode: 'HTML' }),
    )
  })

  it('normalizes spacing for safe html input without breaking tags', () => {
    expect(formatTelegramCaption('<b>Заголовок</b>\nРядок 1\n<blockquote>Цитата</blockquote>', 'HTML')?.text).toBe(
      '<b>Заголовок</b>\n\nРядок 1\n\n<blockquote>Цитата</blockquote>',
    )
  })

  it('preserves preformatted block semantics for pricing and testimonials', () => {
    expect(
      formatTelegramMessage({
        blocks: [bold('12 000 грн'), blockquote('Відгук після практики')],
        preformatted: true,
      }).text,
    ).toBe('<b>12 000 грн</b>\n\n<blockquote>Відгук після практики</blockquote>')
  })

  it('normalizes preformatted semantic paragraphs with exactly one blank line', () => {
    expect(
      formatTelegramMessage({
        text: 'Абзац 1.\nАбзац 2.',
        preformatted: true,
      }).text,
    ).toBe('Абзац 1.\n\nАбзац 2.')
  })

  it('keeps pricing lines compact while separating body and offer blocks', () => {
    expect(
      formatTelegramMessage({
        text: [
          'Основний текст.',
          'ФОКУС | живі Zoom-розбори AB System.',
          '1 місяць — 33 €.',
          '3 місяці — 69 € (23 € на місяць).',
          '1 рік — 229 € (19 € на місяць).',
        ].join('\n'),
        preformatted: true,
      }).text,
    ).toBe(
      [
        'Основний текст.',
        '',
        'ФОКУС | живі Zoom-розбори AB System.',
        '',
        '1 місяць — 33 €.',
        '3 місяці — 69 € (23 € на місяць).',
        '1 рік — 229 € (19 € на місяць).',
      ].join('\n'),
    )
  })

  it('is idempotent for preformatted telegram text', () => {
    const first = formatTelegramMessage({
      text: 'Абзац 1.\nАбзац 2.\n1 місяць — 33 €.\n3 місяці — 69 € (23 € на місяць).',
      preformatted: true,
    })
    const second = formatTelegramMessage({
      text: first.text,
      preformatted: true,
    })

    expect(second).toEqual(first)
  })

  it('renders the final STATE dojim 24h payload with paragraph and pricing separators', () => {
    const copy = resolveAbTestFollowupCopy('RESULT_DOJIM_24H', 'state', 'v2', {})
    const block = compactFocusDojimBlocks((copy.blocks ?? []).filter((candidate) => candidate.type !== 'cta'))[0]

    expect(block?.type).toBe('text')

    const rendered = renderFocusDojimBlock(block!)
    const formatted = formatTelegramMessage({
      text: rendered ?? '',
      preformatted: true,
    })

    expect(formatted.text).toContain('ти вже побачила свій результат у тесті.\n\nТи впізнала цей стан')
    expect(formatted.text).toContain('що забирає сили без результату.\n\nФОКУС | живі Zoom-розбори AB System.')
    expect(formatted.text).toContain('ФОКУС | живі Zoom-розбори AB System.\n\n1 місяць — 33 €.\n3 місяці — 69 € (23 € на місяць).\n1 рік — 229 € (19 € на місяць).')
  })

  it('removes an unwanted leading dot from GOAL dojim payloads', () => {
    const copy = resolveAbTestFollowupCopy('RESULT_DOJIM_24H', 'goal', 'v2', {})
    const block = compactFocusDojimBlocks((copy.blocks ?? []).filter((candidate) => candidate.type !== 'cta'))[0]
    const rendered = renderFocusDojimBlock(block!)
    const formatted = formatTelegramMessage({
      text: rendered ?? '',
      preformatted: true,
    })

    expect(copy.body.startsWith('. ')).toBe(false)
    expect(block?.type).toBe('text')
    expect(block?.text.startsWith('. ')).toBe(false)
    expect(formatted.text.startsWith('. ')).toBe(false)
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

  it('normalizes final outbound html payload for semantic paragraphs', async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 7 }))

    await sendTelegramMessage(
      { sendMessage },
      '42',
      {
        text: 'Абзац 1\nАбзац 2\nАбзац 3',
        parseMode: 'HTML',
      },
    )

    expect(sendMessage).toHaveBeenCalledWith(
      '42',
      'Абзац 1\n\nАбзац 2\n\nАбзац 3',
      expect.objectContaining({ parse_mode: 'HTML' }),
    )
  })

  it('normalizes final outbound html payload for headings, bullets and trailing prose', async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 8 }))

    await sendTelegramMessage(
      { sendMessage },
      '42',
      {
        text: 'Заголовок\n• item 1\n• item 2\nФінальний абзац',
        parseMode: 'HTML',
      },
    )

    expect(sendMessage).toHaveBeenCalledWith(
      '42',
      'Заголовок\n\n• item 1\n• item 2\n\nФінальний абзац',
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
