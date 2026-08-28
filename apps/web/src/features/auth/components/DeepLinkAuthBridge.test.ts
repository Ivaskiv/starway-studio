import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('DeepLinkAuthBridge pending deeplink ownership', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the pending telegram success token readable while auth status is still resolving', async () => {
    const { readPendingDeepLinkToken } = await import('./DeepLinkAuthBridge')
    const getItem = vi.fn((key: string) => key === 'starway_pending_deeplink_token' ? 'coach-token' : null)
    const removeItem = vi.fn()

    vi.stubGlobal('window', {
      sessionStorage: {
        getItem,
        removeItem,
      },
    })

    expect(readPendingDeepLinkToken('/auth/telegram/success', '')).toBe('coach-token')
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('prefers the deeplink token from the current URL when it is present', async () => {
    const { readPendingDeepLinkToken } = await import('./DeepLinkAuthBridge')
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: vi.fn(() => 'stale-token'),
      },
    })

    expect(
      readPendingDeepLinkToken(
        '/app/dashboard/admin/studio',
        '?tab=agents&item=agents.overview&dl=fresh-token',
      ),
    ).toBe('fresh-token')
  })

  it('redirects Telegram runtime only for real miniapp routes', async () => {
    const { shouldRedirectTelegramRuntimeToMiniApp } = await import('./DeepLinkAuthBridge')

    expect(shouldRedirectTelegramRuntimeToMiniApp('/miniapp/zoom-calendar')).toBe(true)
    expect(shouldRedirectTelegramRuntimeToMiniApp('/miniapp')).toBe(true)
    expect(shouldRedirectTelegramRuntimeToMiniApp('/app/dashboard/admin/studio')).toBe(false)
  })
})
