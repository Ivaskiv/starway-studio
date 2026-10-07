import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it } from 'vitest'

import { resolveTelegramWebappBaseUrl } from '../../../src/config/webapp.js'

const ENV_KEYS = [
  'NODE_ENV',
  'TELEGRAM_WEBAPP_BASE_URL',
  'PUBLIC_FRONTEND_URL',
] as const
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('OPS panel URL routing', () => {
  it('uses the current canonical WebApp origin instead of a stale PUBLIC_FRONTEND_URL tunnel', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://current.starway.test'
    process.env.PUBLIC_FRONTEND_URL = 'https://dead.trycloudflare.com'

    expect(`${resolveTelegramWebappBaseUrl()}/app/dashboard/zoom`)
      .toBe('https://current.starway.test/app/dashboard/zoom')
  })

  it('keeps all OPS schedule-panel CTA owners on the canonical resolver', () => {
    const owners = [
      'src/modules/zoom/api/zoom.admin.handler.ts',
      'src/modules/telegram-mentor/bot/zoom-admin.ts',
      'src/modules/zoom/core/zoom.operations.service.ts',
    ]

    for (const owner of owners) {
      const source = readFileSync(new URL(`../../../${owner}`, import.meta.url), 'utf8')
      expect(source).toContain('resolveTelegramWebappBaseUrl()')
      expect(source).not.toContain('process.env.PUBLIC_FRONTEND_URL?.trim()')
    }
  })
})
