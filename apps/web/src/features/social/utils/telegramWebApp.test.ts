import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('signalTelegramWebAppReady', () => {
  it('signals Telegram once independently of session or role state', async () => {
    const ready = vi.fn()
    const expand = vi.fn()
    vi.stubGlobal('window', {
      Telegram: { WebApp: { ready, expand, initData: '' } },
    })

    const { signalTelegramWebAppReady } = await import('./telegramWebApp')

    expect(signalTelegramWebAppReady()).toBe(true)
    expect(signalTelegramWebAppReady()).toBe(false)
    expect(ready).toHaveBeenCalledTimes(1)
    expect(expand).toHaveBeenCalledTimes(1)
  })
})
