import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/hooks', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => 'idle',
}))

vi.mock('@/features/auth/context/SessionOrchestratorContext', () => ({
  logCoachWebAppTrace: vi.fn(),
  PENDING_DEEPLINK_SESSION_EVENT: 'starway_pending_deeplink_session_event',
  PENDING_DEEPLINK_TOKEN_KEY: 'starway_pending_deeplink_token',
}))

vi.mock('@/features/auth/services/auth.slice', () => ({
  setCredentials: vi.fn(),
}))

vi.mock('@/features/auth/services/deeplinks.api', () => ({
  useRestoreDeepLinkSessionMutation: () => [vi.fn()],
}))

const accessInitiateMock = vi.fn(() => ({
  unwrap: vi.fn(async () => undefined),
}))
const systemInitiateMock = vi.fn(() => ({
  unwrap: vi.fn(async () => undefined),
}))

vi.mock('@/features/auth/services/accessApi', () => ({
  accessApi: {
    endpoints: {
      getMyAccess: {
        initiate: accessInitiateMock,
      },
      getMySystemState: {
        initiate: systemInitiateMock,
      },
    },
  },
}))

vi.mock('@/features/social/utils/telegramWebApp', () => ({
  isTelegramMiniApp: vi.fn(() => false),
}))

vi.mock('@/theme/accent.utils', () => ({
  DEFAULT_ACCENT: '#000000',
  normalizeUiMode: vi.fn((value?: string | null) => value ?? 'dark'),
}))

vi.mock('@/theme/ThemeProvider', () => ({
  useThemeContext: () => ({
    setAccentColor: vi.fn(),
    setMode: vi.fn(),
  }),
}))

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

  it('does not skip deeplink restore when a stale authenticated session is already present on a staff destination', async () => {
    const { shouldSkipDeepLinkRestore } = await import('./DeepLinkAuthBridge')

    expect(shouldSkipDeepLinkRestore('authenticated', '/app/dashboard/admin/studio')).toBe(false)
    expect(shouldSkipDeepLinkRestore('authenticated', '/app/dashboard/zoom')).toBe(false)
  })

  it('forces protected access and system state refresh after deeplink session restore', async () => {
    const dispatch = vi.fn((value: unknown) => value)
    const { refreshDeepLinkProtectedState } = await import('./DeepLinkAuthBridge')

    await refreshDeepLinkProtectedState(dispatch as never)

    expect(accessInitiateMock).toHaveBeenCalledWith(undefined, {
      forceRefetch: true,
      subscribe: false,
    })
    expect(systemInitiateMock).toHaveBeenCalledWith(undefined, {
      forceRefetch: true,
      subscribe: false,
    })
  })

  it('fails a stalled deeplink restore instead of hanging forever', async () => {
    vi.useFakeTimers()
    const { withDeepLinkRestoreTimeout } = await import('./DeepLinkAuthBridge')

    const stalled = withDeepLinkRestoreTimeout(new Promise(() => undefined), 100)
    const assertion = expect(stalled).rejects.toThrow('DEEPLINK_RESTORE_TIMEOUT')
    await vi.advanceTimersByTimeAsync(100)
    await assertion
    vi.useRealTimers()
  })
})
