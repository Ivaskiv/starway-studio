import { describe, expect, it } from 'vitest'

import { normalizeTelegramWebhookUrl } from './telegram.js'

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
