import { afterEach, describe, expect, it } from 'vitest'

import { buildZoomCalendarUrl } from './urls.js'

const ORIGINAL_ENV = {
  TELEGRAM_WEBAPP_BASE_URL: process.env.TELEGRAM_WEBAPP_BASE_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
}

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe('buildZoomCalendarUrl', () => {
  it('keeps the canonical pathname and booking query across environment origins', () => {
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'http://127.0.0.1:5173'
    const localUrl = new URL(buildZoomCalendarUrl({ intent: 'booking' }))

    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://starway-frontend.vercel.app'
    const prodUrl = new URL(buildZoomCalendarUrl({ intent: 'booking' }))

    expect(localUrl.pathname).toBe('/miniapp/zoom-calendar')
    expect(prodUrl.pathname).toBe('/miniapp/zoom-calendar')
    expect(localUrl.searchParams.get('intent')).toBe('booking')
    expect(prodUrl.searchParams.get('intent')).toBe('booking')
  })
})
