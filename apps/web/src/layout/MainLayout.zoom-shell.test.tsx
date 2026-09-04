import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = {
  auth: {
    user: null as null | { id: string; role: string; activeRole?: string },
    role: null as null | string,
  },
}

const sessionOrchestrator = {
  openAuthModal: vi.fn(),
}

const systemState = {
  state: {
    permissions: {
      role: 'USER',
    },
  } as { permissions?: { role?: string } },
}

vi.mock('@/app/hooks', () => ({
  useAppSelector: (selector: (input: typeof state) => unknown) => selector(state),
}))

vi.mock('@/features/auth/services/auth.slice', () => ({
  selectIsAuthenticated: (input: typeof state) => Boolean(input.auth.user),
  selectUserRole: (input: typeof state) => input.auth.role,
}))

vi.mock('@/features/auth/hooks/useSystemState', () => ({
  useSystemState: () => systemState,
}))

vi.mock('@/features/auth/context/SessionOrchestratorContext', () => ({
  useSessionOrchestrator: () => sessionOrchestrator,
}))

vi.mock('@/features/social/utils/telegramWebApp', () => ({
  isTelegramMiniApp: () => true,
}))

vi.mock('@/hooks/useSmartNavigation', () => ({
  useSmartNavigation: () => ({
    navigateTo: vi.fn(),
  }),
}))

vi.mock('@/config/routes', () => ({
  normalizeDashboardRoutePath: (pathname: string) => pathname.replace(/^\/app/, ''),
}))

vi.mock('@/layout/Breadcrumb', () => ({
  default: () => createElement('div', undefined, 'BREADCRUMB'),
}))

vi.mock('@/layout/Footer', () => ({
  default: () => createElement('div', undefined, 'FOOTER'),
}))

vi.mock('@/layout/Header', () => ({
  default: () => createElement('div', undefined, 'HEADER'),
}))

vi.mock('@/layout/Sidebar', () => ({
  default: () => createElement('div', undefined, 'SIDEBAR'),
}))

vi.mock('@/components/miniapp/BottomNav', () => ({
  default: () => createElement('div', undefined, 'BOTTOM_NAV'),
}))

describe('MainLayout zoom shell ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.auth.user = null
    state.auth.role = null
    systemState.state = {
      permissions: {
        role: 'USER',
      },
    }
  })

  it('hides USER bottom nav for privileged staff on /app/dashboard/zoom', async () => {
    state.auth.user = { id: 'staff-1', role: 'ADMIN' }
    state.auth.role = 'ADMIN'
    systemState.state = {
      permissions: {
        role: 'ADMIN',
      },
    }

    const { default: MainLayout } = await import('./MainLayout')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/app/dashboard/zoom'] },
        createElement(
          Routes,
          undefined,
          createElement(
            Route,
            { element: createElement(MainLayout, { dashboard: true }) },
            createElement(Route, {
              path: '/app/dashboard/zoom',
              element: createElement('div', undefined, 'COACH_ZOOM_PANEL'),
            }),
          ),
        ),
      ),
    )

    expect(markup).toContain('COACH_ZOOM_PANEL')
    expect(markup).not.toContain('BOTTOM_NAV')
  })

  it('hides USER bottom nav for privileged staff on /app/dashboard/admin/studio even if system role is stale USER', async () => {
    state.auth.user = { id: 'staff-1', role: 'ADMIN' }
    state.auth.role = 'ADMIN'
    systemState.state = {
      permissions: {
        role: 'USER',
      },
    }

    const { default: MainLayout } = await import('./MainLayout')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/app/dashboard/admin/studio?tab=agents&item=agents.overview'] },
        createElement(
          Routes,
          undefined,
          createElement(
            Route,
            { element: createElement(MainLayout, { dashboard: true }) },
            createElement(Route, {
              path: '/app/dashboard/admin/studio',
              element: createElement('div', undefined, 'AGENTS_PANEL'),
            }),
          ),
        ),
      ),
    )

    expect(markup).toContain('AGENTS_PANEL')
    expect(markup).not.toContain('BOTTOM_NAV')
  })

  it('keeps USER bottom nav for user shell on /app/dashboard/zoom', async () => {
    state.auth.user = { id: 'user-1', role: 'USER' }
    state.auth.role = 'USER'
    systemState.state = {
      permissions: {
        role: 'USER',
      },
    }

    const { default: MainLayout } = await import('./MainLayout')

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/app/dashboard/zoom'] },
        createElement(
          Routes,
          undefined,
          createElement(
            Route,
            { element: createElement(MainLayout, { dashboard: true }) },
            createElement(Route, {
              path: '/app/dashboard/zoom',
              element: createElement('div', undefined, 'USER_ZOOM_PANEL'),
            }),
          ),
        ),
      ),
    )

    expect(markup).toContain('USER_ZOOM_PANEL')
    expect(markup).toContain('BOTTOM_NAV')
  })
})
