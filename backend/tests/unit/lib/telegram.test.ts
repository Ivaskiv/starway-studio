import { describe, expect, it, vi } from 'vitest'

import {
  normalizeTelegramChatIdForBotApi,
  normalizeTelegramWebhookUrl,
  patchTelegramTransportFormatting,
} from '../telegram.ts'

describe('normalizeTelegramWebhookUrl', () => {
  it('appends the Telegram webhook path to a base origin', () => {
    expect(normalizeTelegramWebhookUrl('https://example.com')).toBe(
      'https://example.com/api/telegram/webhook',
    )
  })

  it('preserves an origin that already ends with /api', () => {
    expect(normalizeTelegramWebhookUrl('https://example.com/api')).toBe(
      'https://example.com/api/telegram/webhook',
    )
  })

  it('keeps a full webhook URL unchanged', () => {
    expect(
      normalizeTelegramWebhookUrl('https://example.com/api/telegram/webhook'),
    ).toBe('https://example.com/api/telegram/webhook')
  })

  it('returns an empty string for blank input', () => {
    expect(normalizeTelegramWebhookUrl('   ')).toBe('')
  })
})

describe('normalizeTelegramChatIdForBotApi', () => {
  it('keeps an existing Bot API supergroup id unchanged', () => {
    expect(normalizeTelegramChatIdForBotApi('-1003829747010')).toBe('-1003829747010')
  })

  it('converts a raw peer id into a Bot API supergroup id', () => {
    expect(normalizeTelegramChatIdForBotApi('3829747010')).toBe('-1003829747010')
  })

  it('keeps short numeric ids unchanged', () => {
    expect(normalizeTelegramChatIdForBotApi('123456789')).toBe('123456789')
  })
})

function createFakeBot() {
  const telegram = {
    sendMessage: vi.fn(async () => ({ message_id: 1 })),
    editMessageText: vi.fn(async () => ({ message_id: 2 })),
    sendPhoto: vi.fn(async () => ({ message_id: 3 })),
    sendVideo: vi.fn(async () => ({ message_id: 4 })),
    sendDocument: vi.fn(async () => ({ message_id: 5 })),
    sendAudio: vi.fn(async () => ({ message_id: 6 })),
    sendVoice: vi.fn(async () => ({ message_id: 7 })),
    editMessageCaption: vi.fn(async () => ({ message_id: 8 })),
  }

  return {
    original: telegram,
    telegram: {
      ...telegram,
    },
  } as any
}

describe('patchTelegramTransportFormatting', () => {
  it('formats accent markdown, blockquotes and escaping for outbound text', async () => {
    const bot = createFakeBot()
    patchTelegramTransportFormatting(bot)

    await bot.telegram.sendMessage('42', '**акцент**\n> цитата\nplain <>&')

    expect(bot.original.sendMessage).toHaveBeenCalledWith('42', '<b>акцент</b>\n<blockquote>цитата</blockquote>\nplain &lt;&gt;&amp;', {
      parse_mode: 'HTML',
    })
  })

  it('preserves existing valid HTML markup', async () => {
    const bot = createFakeBot()
    patchTelegramTransportFormatting(bot)

    await bot.telegram.sendMessage('42', '<b>готово</b>', { parse_mode: 'HTML' })

    expect(bot.original.sendMessage).toHaveBeenCalledWith('42', '<b>готово</b>', {
      parse_mode: 'HTML',
    })
  })

  it('does not force parse_mode when text entities are provided', async () => {
    const bot = createFakeBot()
    patchTelegramTransportFormatting(bot)
    const entities = [{ offset: 0, length: 6, type: 'bold' as const }]

    await bot.telegram.sendMessage('42', '**акцент**', { entities })
    await bot.telegram.editMessageText('42', 10, undefined, '**акцент**', { entities })

    expect(bot.original.sendMessage).toHaveBeenCalledWith('42', '**акцент**', { entities })
    expect(bot.original.editMessageText).toHaveBeenCalledWith('42', 10, undefined, '**акцент**', {
      entities,
    })
  })

  it('formats text edits through the same canonical owner', async () => {
    const bot = createFakeBot()
    patchTelegramTransportFormatting(bot)

    await bot.telegram.editMessageText('42', 10, undefined, '> цитата')

    expect(bot.original.editMessageText).toHaveBeenCalledWith(
      '42',
      10,
      undefined,
      '<blockquote>цитата</blockquote>',
      { parse_mode: 'HTML' },
    )
  })

  it('formats media captions and preserves caption_entities contract', async () => {
    const bot = createFakeBot()
    patchTelegramTransportFormatting(bot)
    const captionEntities = [{ offset: 0, length: 4, type: 'bold' as const }]

    await bot.telegram.sendAudio('42', 'audio-key', { caption: '**акцент**' })
    await bot.telegram.editMessageCaption('42', 11, undefined, '> цитата')
    await bot.telegram.sendDocument('42', 'doc-key', {
      caption: '**акцент**',
      caption_entities: captionEntities,
    })

    expect(bot.original.sendAudio).toHaveBeenCalledWith('42', 'audio-key', {
      caption: '<b>акцент</b>',
      parse_mode: 'HTML',
    })
    expect(bot.original.editMessageCaption).toHaveBeenCalledWith(
      '42',
      11,
      undefined,
      '<blockquote>цитата</blockquote>',
      { parse_mode: 'HTML' },
    )
    expect(bot.original.sendDocument).toHaveBeenCalledWith('42', 'doc-key', {
      caption: '**акцент**',
      caption_entities: captionEntities,
    })
  })

  it('reuses one shared patch owner for main, coach and content transports', async () => {
    const mainBot = createFakeBot()
    const coachBot = createFakeBot()
    const contentBot = createFakeBot()
    patchTelegramTransportFormatting(mainBot)
    patchTelegramTransportFormatting(coachBot)
    patchTelegramTransportFormatting(contentBot)

    await mainBot.telegram.sendMessage('1', '**main**')
    await coachBot.telegram.sendMessage('2', '**coach**')
    await contentBot.telegram.sendMessage('3', '**content**')

    expect(mainBot.original.sendMessage).toHaveBeenCalledWith('1', '<b>main</b>', {
      parse_mode: 'HTML',
    })
    expect(coachBot.original.sendMessage).toHaveBeenCalledWith('2', '<b>coach</b>', {
      parse_mode: 'HTML',
    })
    expect(contentBot.original.sendMessage).toHaveBeenCalledWith('3', '<b>content</b>', {
      parse_mode: 'HTML',
    })
  })
})
