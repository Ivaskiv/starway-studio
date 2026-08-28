import { afterEach, describe, expect, it } from 'vitest'

import { resolveCoachWebAppBaseUrl } from '../../../src/config/webapp.js'

const originalNodeEnv = process.env.NODE_ENV
const originalTelegramWebappBaseUrl = process.env.TELEGRAM_WEBAPP_BASE_URL

describe('resolveCoachWebAppBaseUrl', () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    process.env.TELEGRAM_WEBAPP_BASE_URL = originalTelegramWebappBaseUrl
  })

  it('uses the current HTTPS dev tunnel URL in development', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://fresh-coach-dev.trycloudflare.com/'

    expect(resolveCoachWebAppBaseUrl()).toBe('https://fresh-coach-dev.trycloudflare.com')
  })

  it('fails explicitly when the dev tunnel URL is missing', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.TELEGRAM_WEBAPP_BASE_URL

    expect(() => resolveCoachWebAppBaseUrl()).toThrowError('COACH_WEBAPP_DEV_URL_MISSING')
  })

  it('never falls back to localhost for telegram web_app URLs', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'http://localhost:5173'

    expect(() => resolveCoachWebAppBaseUrl()).toThrowError('COACH_WEBAPP_DEV_URL_MISSING')
  })

  it('uses the canonical production frontend for coach bot web_app URLs', () => {
    process.env.NODE_ENV = 'production'
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://ignored-dev.trycloudflare.com'

    expect(resolveCoachWebAppBaseUrl()).toBe('https://starway-frontend.vercel.app')
  })
})
