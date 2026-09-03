import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/hooks', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => null,
}))

vi.mock('@/config/routes', () => ({
  ROUTE_METADATA: {},
  normalizeDashboardRoutePath: (value: string) => value,
}))

vi.mock('@/features/auth/components/AuthModal', () => ({
  default: () => null,
}))

vi.mock('@/features/auth/services/accessApi', () => ({
  useGetMyAccessQuery: () => ({ isSuccess: false, isError: false, data: undefined }),
  useGetMySystemStateQuery: () => ({ isSuccess: false, isError: false, data: undefined }),
}))

vi.mock('@/features/auth/services/auth.slice', () => ({
  selectCurrentUser: () => null,
  selectIsAuthenticated: () => false,
}))

vi.mock('@/features/auth/services/token', () => ({
  getRefreshToken: () => null,
  getToken: () => null,
  hasKnownUser: () => false,
  hasSessionHint: () => false,
  resolvePreferredAuthMode: () => 'login',
}))

vi.mock('@/features/auth/utils/sessionSync', () => ({
  isTelegramMiniAppAuthContext: () => false,
  shouldAllowSessionProbeWithoutHint: () => false,
  syncAuthSession: vi.fn(async () => false),
}))

vi.mock('@/features/social/utils/telegramWebApp', () => ({
  isTelegramMiniApp: () => false,
}))

vi.mock('@/features/modals/BaseModal', () => ({
  BaseModal: ({ children }: { children?: unknown }) => children ?? null,
}))

vi.mock('@/features/user/userMenu/LoadingFallback', () => ({
  default: () => null,
}))

vi.mock('@/theme/ThemeProvider', () => ({
  useThemeContext: () => ({
    setAccent: vi.fn(),
    setBgColor: vi.fn(),
    setMode: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useLocation: () => ({ pathname: '/', search: '', hash: '' }),
    useNavigate: () => vi.fn(),
  }
})

describe('SessionOrchestratorContext deeplink handoff ownership', () => {
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

  it('treats protected routes with dl query as pending auth handoff', async () => {
    const { hasPendingDeepLinkSessionHandoff } = await import('./SessionOrchestratorContext')

    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: vi.fn(() => null),
      },
    })

    expect(
      hasPendingDeepLinkSessionHandoff(
        '/app/dashboard/admin/studio',
        '?tab=agents&item=agents.overview&dl=coach-token',
      ),
    ).toBe(true)
  })

  it('keeps sanitized protected routes pending while deeplink restore is still in flight', async () => {
    const {
      PENDING_DEEPLINK_TOKEN_KEY,
      hasPendingDeepLinkSessionHandoff,
    } = await import('./SessionOrchestratorContext')

    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: vi.fn((key: string) => key === PENDING_DEEPLINK_TOKEN_KEY ? 'coach-token' : null),
      },
    })

    expect(
      hasPendingDeepLinkSessionHandoff(
        '/app/dashboard/admin/studio',
        '?tab=agents&item=agents.overview',
      ),
    ).toBe(true)
  })

  it('stops blocking protected routes after the deeplink handoff token is gone', async () => {
    const { hasPendingDeepLinkSessionHandoff } = await import('./SessionOrchestratorContext')

    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: vi.fn(() => null),
      },
    })

    expect(
      hasPendingDeepLinkSessionHandoff(
        '/app/dashboard/admin/studio',
        '?tab=agents&item=agents.overview',
      ),
    ).toBe(false)
  })

  it('suppresses the auth modal in Telegram only while session restore is still pending', async () => {
    const { shouldSuppressMiniAppAuthModal } = await import('./SessionOrchestratorContext')

    expect(shouldSuppressMiniAppAuthModal(true, 'auth_restoring')).toBe(true)
    expect(shouldSuppressMiniAppAuthModal(true, 'guest')).toBe(false)
    expect(shouldSuppressMiniAppAuthModal(true, 'recovery_required')).toBe(false)
    expect(shouldSuppressMiniAppAuthModal(false, 'auth_restoring')).toBe(false)
  })

  it('keeps protected access queries blocked while a staff deeplink handoff is pending over an authenticated user session', async () => {
    const { shouldSkipProtectedSessionQueries } = await import('./SessionOrchestratorContext')

    expect(
      shouldSkipProtectedSessionQueries({
        isAuthenticated: true,
        authRestoreStatus: 'ready',
        hasPendingDeepLinkSession: true,
      }),
    ).toBe(true)
  })

  it('keeps protected routes locked until the pending staff deeplink handoff finishes', async () => {
    const { shouldReleaseProtectedRoute } = await import('./SessionOrchestratorContext')

    expect(
      shouldReleaseProtectedRoute({
        isProtectedRoute: true,
        isAuthenticated: true,
        authRestoreStatus: 'ready',
        isAccessReady: true,
        isSystemReady: true,
        hasPendingDeepLinkSession: true,
        routeTransitionTarget: null,
      }),
    ).toBe(false)
  })

  it('does not start generic bootstrap restore after a navigation entered with a deeplink handoff', async () => {
    const { shouldRunBootstrapRestore } = await import('./SessionOrchestratorContext')

    expect(
      shouldRunBootstrapRestore({
        hadPendingDeepLinkSessionOnEntry: true,
        authRestoreStatus: 'idle',
      }),
    ).toBe(false)
  })

  it('keeps normal user bootstrap restore for entries without a deeplink handoff', async () => {
    const { shouldRunBootstrapRestore } = await import('./SessionOrchestratorContext')

    expect(
      shouldRunBootstrapRestore({
        hadPendingDeepLinkSessionOnEntry: false,
        authRestoreStatus: 'idle',
      }),
    ).toBe(true)
  })

  it('does not defer session resolution when deeplink auth already restored an authenticated staff session', async () => {
    const { shouldDeferSessionResolution } = await import('./SessionOrchestratorContext')

    expect(
      shouldDeferSessionResolution({
        restoreAttempted: false,
        authRestoreStatus: 'idle',
        isAuthenticated: true,
      }),
    ).toBe(false)
  })

  it('still defers guest resolution until the orchestrator attempts its own restore', async () => {
    const { shouldDeferSessionResolution } = await import('./SessionOrchestratorContext')

    expect(
      shouldDeferSessionResolution({
        restoreAttempted: false,
        authRestoreStatus: 'idle',
        isAuthenticated: false,
      }),
    ).toBe(true)
  })
})
