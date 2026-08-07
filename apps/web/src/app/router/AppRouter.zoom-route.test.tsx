import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'

const authState = {
  auth: {
    user: null as null | { id: string; role: string },
  },
}

const mockSessionOrchestrator = {
  authRestoreStatus: 'ready' as 'idle' | 'restoring' | 'ready' | 'failed',
  canRunProtectedQueries: false,
}

const mockWithGuard = vi.fn((route: { path: string }) =>
  createElement('div', undefined, `GUARDED:${route.path}`),
)

vi.mock('@/app/hooks', () => ({
  useAppSelector: (selector: (state: typeof authState) => unknown) => selector(authState),
}))

vi.mock('@/features/auth/context/SessionOrchestratorContext', () => ({
  useSessionOrchestrator: () => mockSessionOrchestrator,
}))

vi.mock('@/app/router/routeConfig', () => ({
  ADMIN_ROUTES: [
    {
      path: '/admin/ai-assistant',
      element: createElement('div', undefined, 'ADMIN_ROUTE'),
    },
  ],
  DASHBOARD_ROUTES: [
    {
      path: '/dashboard/vision',
      element: createElement('div', undefined, 'DASHBOARD_VISION'),
    },
  ],
  PROTECTED_ALIASES: [],
  devMode: true,
  toLegacyRouteRedirect: () => null,
  withGuard: (route: { path: string }) => mockWithGuard(route),
}))

vi.mock('@/app/router/routePages', () => ({
  AbTestLandingRouteView: () => createElement('div', undefined, 'AB_TEST_LANDING'),
  AbTestPage: () => createElement('div', undefined, 'AB_TEST_PAGE'),
  FocusRouteView: () => createElement('div', undefined, 'FOCUS_ROUTE'),
  MiniAppPage: () => createElement('div', undefined, 'MINIAPP_PAGE'),
}))

vi.mock('@/features/social/utils/telegramWebApp', () => ({
  isTelegramMiniApp: (pathname?: string) => Boolean(pathname?.startsWith('/miniapp')),
}))

vi.mock('@/features/landings/focus/content/constants', () => ({
  FOCUS_ALIAS_ROUTE: '/focus',
  FOCUS_ROUTE: '/focus',
}))

vi.mock('@/features/user/userMenu/LoadingFallback', () => ({
  default: () => createElement('div', undefined, 'LOADING_FALLBACK'),
}))

vi.mock('@/layout/MainLayout', async () => {
  const React = await import('react')
  const { Outlet } = await import('react-router-dom')
  return {
    default: () => React.createElement(Outlet),
  }
})

vi.mock('@/features/zoom/routes/CleanMiniAppZoomCalendar', async () => {
  const React = await import('react')
  const { useLocation } = await import('react-router-dom')

  return {
    default: () => {
      const location = useLocation()
      return React.createElement(
        'div',
        undefined,
        `CLEAN_ZOOM_ROUTE:${location.pathname}${location.search}`,
      )
    },
  }
})

describe('AppRouter route access boundary', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  it('/ab-test renders publicly without authentication', async () => {
    authState.auth.user = null
    mockSessionOrchestrator.authRestoreStatus = 'ready'
    const { default: AppRouter } = await import('./AppRouter')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/ab-test'] },
        createElement(AppRouter),
      ),
    )

    expect(markup).toContain('AB_TEST_LANDING')
    expect(markup).not.toContain('FOCUS_ROUTE')
  })

  it('/focus renders publicly without authentication', async () => {
    authState.auth.user = null
    mockSessionOrchestrator.authRestoreStatus = 'ready'
    const { default: AppRouter } = await import('./AppRouter')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/focus'] },
        createElement(AppRouter),
      ),
    )

    expect(markup).toContain('FOCUS_ROUTE')
  })

  it('/miniapp/zoom-calendar without Telegram auth stays blocked and does not render protected content', async () => {
    authState.auth.user = null
    mockSessionOrchestrator.authRestoreStatus = 'failed'
    const { default: AppRouter } = await import('./AppRouter')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/miniapp/zoom-calendar'] },
        createElement(AppRouter),
      ),
    )

    expect(markup).toContain('FOCUS_ROUTE')
    expect(markup).not.toContain('CLEAN_ZOOM_ROUTE')
    expect(markup).not.toContain('MINIAPP_PAGE')
  })

  it('/miniapp/zoom-calendar?intent=booking preserves pathname and search for a valid Telegram session', async () => {
    authState.auth.user = { id: 'user-1', role: 'USER' }
    mockSessionOrchestrator.authRestoreStatus = 'ready'
    mockSessionOrchestrator.canRunProtectedQueries = true
    const { default: AppRouter } = await import('./AppRouter')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/miniapp/zoom-calendar?intent=booking'] },
        createElement(AppRouter),
      ),
    )

    expect(markup).toContain('CLEAN_ZOOM_ROUTE:/miniapp/zoom-calendar?intent=booking')
  })

  it('unknown non-public website routes redirect safely to /focus', async () => {
    authState.auth.user = null
    mockSessionOrchestrator.authRestoreStatus = 'ready'
    const { default: AppRouter } = await import('./AppRouter')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/products/demo-course'] },
        createElement(AppRouter),
      ),
    )

    expect(markup).toContain('FOCUS_ROUTE')
    expect(markup).not.toContain('AB_TEST_LANDING')
  })

  it('admin routes still go through the existing guarded branch', async () => {
    authState.auth.user = null
    mockSessionOrchestrator.authRestoreStatus = 'ready'
    mockWithGuard.mockClear()
    const { default: AppRouter } = await import('./AppRouter')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/admin/ai-assistant'] },
        createElement(AppRouter),
      ),
    )

    expect(markup).toContain('GUARDED:/admin/ai-assistant')
    expect(mockWithGuard).toHaveBeenCalled()
  })

  it('authentication restoring does not redirect miniapp routes prematurely', async () => {
    authState.auth.user = null
    mockSessionOrchestrator.authRestoreStatus = 'restoring'
    mockSessionOrchestrator.canRunProtectedQueries = false
    const { default: AppRouter } = await import('./AppRouter')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/miniapp/zoom-calendar?intent=booking'] },
        createElement(AppRouter),
      ),
    )

    expect(markup).toContain('LOADING_FALLBACK')
    expect(markup).not.toContain('FOCUS_ROUTE')
    expect(markup).not.toContain('CLEAN_ZOOM_ROUTE')
  })

  it('/ab-test child routes remain public under the same namespace contract', async () => {
    authState.auth.user = null
    mockSessionOrchestrator.authRestoreStatus = 'ready'
    const { default: AppRouter } = await import('./AppRouter')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/ab-test/result'] },
        createElement(AppRouter),
      ),
    )

    expect(markup).toContain('AB_TEST_PAGE')
  })
})
