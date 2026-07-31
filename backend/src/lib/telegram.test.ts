import { describe, expect, it } from 'vitest'

import { normalizeTelegramChatIdForBotApi, normalizeTelegramWebhookUrl } from './telegram.js'

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
