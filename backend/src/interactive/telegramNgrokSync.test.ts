import { describe, expect, it } from 'vitest'

import {
  buildLocalTunnelEnvUpdates,
  resolveLocalTelegramDeliveryMode,
} from '../../../scripts/dev/sync-ngrok'

describe('sync-ngrok local telegram mode recovery', () => {
  it('preserves explicit polling mode without forcing webhook settings', () => {
    const updates = buildLocalTunnelEnvUpdates(
      { TELEGRAM_DELIVERY_MODE: 'polling' },
      'https://example.ngrok-free.dev',
    )

    expect(resolveLocalTelegramDeliveryMode({ TELEGRAM_DELIVERY_MODE: 'polling' })).toBe('polling')
    expect(updates).toEqual({
      PUBLIC_API_URL: 'https://example.ngrok-free.dev',
      TELEGRAM_WEBAPP_BASE_URL: 'https://example.ngrok-free.dev',
      WAYFORPAY_CALLBACK_URL:
        'https://example.ngrok-free.dev/api/subscriptions/payments/wayforpay/callback',
    })
    expect(updates).not.toHaveProperty('TELEGRAM_WEBHOOK_URL')
    expect(updates).not.toHaveProperty('TELEGRAM_DELIVERY_MODE')
  })

  it('keeps webhook sync enabled when local mode is not polling', () => {
    const updates = buildLocalTunnelEnvUpdates(
      {},
      'https://example.ngrok-free.dev',
    )

    expect(resolveLocalTelegramDeliveryMode({})).toBe('webhook')
    expect(updates).toMatchObject({
      PUBLIC_API_URL: 'https://example.ngrok-free.dev',
      TELEGRAM_WEBHOOK_URL: 'https://example.ngrok-free.dev',
      TELEGRAM_DELIVERY_MODE: 'webhook',
      TELEGRAM_WEBAPP_BASE_URL: 'https://example.ngrok-free.dev',
      WAYFORPAY_CALLBACK_URL:
        'https://example.ngrok-free.dev/api/subscriptions/payments/wayforpay/callback',
    })
  })
})
