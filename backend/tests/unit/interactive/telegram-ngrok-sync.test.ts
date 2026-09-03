import { describe, expect, it } from 'vitest'

import {
  buildLocalTunnelEnvUpdates,
  resolveLocalTelegramDeliveryMode,
} from '../../../../scripts/dev/sync-ngrok.ts'
import {
  buildCloudflareDevChildEnv,
  buildCloudflareDevEnvUpdates,
  classifyCloudflareProcessExit,
} from '../../../../scripts/dev/cloudflare-dev.mjs'

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

  it('forces the current cloudflare tunnel into the spawned dev runtime env', async () => {
    const nextEnv = buildCloudflareDevChildEnv('https://fresh-cloudflare.trycloudflare.com', {
      TELEGRAM_WEBAPP_BASE_URL: 'https://stale-cloudflare.trycloudflare.com',
      TELEGRAM_PUBLIC_FRONTEND_URL: 'https://stale-cloudflare.trycloudflare.com',
      PUBLIC_FRONTEND_URL: 'https://stale-cloudflare.trycloudflare.com',
      PUBLIC_API_URL: 'https://stale-cloudflare.trycloudflare.com',
      WAYFORPAY_CALLBACK_URL:
        'https://stale-cloudflare.trycloudflare.com/api/subscriptions/payments/wayforpay/callback',
      KEEP_ME: '1',
    })

    expect(nextEnv).toMatchObject({
      TELEGRAM_WEBAPP_BASE_URL: 'https://fresh-cloudflare.trycloudflare.com',
      PUBLIC_FRONTEND_URL: 'https://fresh-cloudflare.trycloudflare.com',
      PUBLIC_API_URL: 'https://fresh-cloudflare.trycloudflare.com',
      WAYFORPAY_CALLBACK_URL:
        'https://fresh-cloudflare.trycloudflare.com/api/subscriptions/payments/wayforpay/callback',
      KEEP_ME: '1',
    })
    expect(nextEnv).not.toHaveProperty('TELEGRAM_PUBLIC_FRONTEND_URL')
  })

  it('writes one canonical local URL set for the cloudflare dev runtime', () => {
    expect(
      buildCloudflareDevEnvUpdates('https://fresh-cloudflare.trycloudflare.com/'),
    ).toEqual({
      PUBLIC_API_URL: 'https://fresh-cloudflare.trycloudflare.com',
      PUBLIC_FRONTEND_URL: 'https://fresh-cloudflare.trycloudflare.com',
      TELEGRAM_WEBAPP_BASE_URL: 'https://fresh-cloudflare.trycloudflare.com',
      WAYFORPAY_CALLBACK_URL:
        'https://fresh-cloudflare.trycloudflare.com/api/subscriptions/payments/wayforpay/callback',
    })
  })

  it('does not let a post-readiness cloudflared exit terminate healthy backend/web runtime', () => {
    expect(
      classifyCloudflareProcessExit({
        stopping: false,
        readyPublished: true,
      }),
    ).toBe('preserve-dev-runtime')
  })

  it('still fails fast when cloudflared exits before startup readiness', () => {
    expect(
      classifyCloudflareProcessExit({
        stopping: false,
        readyPublished: false,
      }),
    ).toBe('shutdown')
  })

  it('treats explicit parent shutdown as the only unconditional whole-stack stop', () => {
    expect(
      classifyCloudflareProcessExit({
        stopping: true,
        readyPublished: true,
      }),
    ).toBe('ignore')
  })
})
