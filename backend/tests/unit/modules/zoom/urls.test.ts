import { afterEach, describe, expect, it } from 'vitest'

import { buildZoomCalendarUrl } from '../../../../src/modules/zoom/urls.js'

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
    expect(localUrl.searchParams.get('zoomRole')).toBe('user')
    expect(prodUrl.searchParams.get('zoomRole')).toBe('user')
  })

  it('preserves an explicit coach role without creating a second route', () => {
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://starway-frontend.vercel.app'

    const url = new URL(buildZoomCalendarUrl({ zoomRole: 'coach' }))

    expect(url.pathname).toBe('/miniapp/zoom-calendar')
    expect(url.searchParams.get('zoomRole')).toBe('coach')
  })

  it('preserves an explicit OPS role on the canonical Mini App route', () => {
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://starway-frontend.vercel.app'

    const url = new URL(buildZoomCalendarUrl({ zoomRole: 'ops' }))

    expect(url.pathname).toBe('/miniapp/zoom-calendar')
    expect(url.searchParams.get('zoomRole')).toBe('ops')
  })
})
