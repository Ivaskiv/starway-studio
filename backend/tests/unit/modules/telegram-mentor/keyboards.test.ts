import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = {
  TELEGRAM_WEBAPP_BASE_URL: process.env.TELEGRAM_WEBAPP_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  MINIAPP_VERSION: process.env.MINIAPP_VERSION,
}

async function importKeyboardsModule() {
  vi.resetModules()
  return import('../keyboards.ts')
}

describe('getTelegramAppUrl', () => {
  afterEach(() => {
    process.env.TELEGRAM_WEBAPP_BASE_URL = ORIGINAL_ENV.TELEGRAM_WEBAPP_BASE_URL
    process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV
    process.env.MINIAPP_VERSION = ORIGINAL_ENV.MINIAPP_VERSION
    vi.resetModules()
  })

  it('normalizes legacy ai miniapp entry to the canonical zoom calendar route', async () => {
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://miniapp.example'
    process.env.NODE_ENV = 'development'
    process.env.MINIAPP_VERSION = 'test'

    const { getTelegramAppUrl } = await importKeyboardsModule()

    expect(getTelegramAppUrl('/miniapp?startapp=ai')).toBe(
      'https://miniapp.example/miniapp/zoom-calendar?v=test',
    )
  })

  it('keeps explicit miniapp subroutes intact', async () => {
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://miniapp.example'
    process.env.NODE_ENV = 'development'
    process.env.MINIAPP_VERSION = 'test'

    const { getTelegramAppUrl } = await importKeyboardsModule()

    expect(getTelegramAppUrl('/miniapp/library')).toBe(
      'https://miniapp.example/miniapp/library?v=test',
    )
  })
})
