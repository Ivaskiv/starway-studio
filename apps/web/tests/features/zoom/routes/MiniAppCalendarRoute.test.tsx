import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

const routeState = {
  auth: {
    user: null as
      | null
      | {
          id: string
          role: 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN'
          activeRole: 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN'
          expertId?: string | null
        },
    role: null as null | 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN',
  },
}

const userCalendarController = {
  calls: 0,
}

const sessionOrchestrator = {
  authRestoreStatus: 'ready' as 'idle' | 'restoring' | 'ready' | 'failed',
  restoreSession: vi.fn(),
}

vi.mock('@/app/hooks', () => ({
  useAppSelector: (
    selector: (state: typeof routeState) => unknown
  ) => selector(routeState),
}))

vi.mock('@/features/auth/services/auth.slice', () => ({
  selectCurrentUser: (state: typeof routeState) => state.auth.user,
  selectUserRole: (state: typeof routeState) => state.auth.role,
}))

vi.mock('@/features/auth/context/SessionOrchestratorContext', () => ({
  useSessionOrchestrator: () => sessionOrchestrator,
}))

vi.mock('@/features/auth/hooks/useSystemState', () => ({
  useSystemState: () => ({
    getModuleAccess: () => ({ isLocked: true }),
    hasCoreAccess: false,
  }),
}))

vi.mock('@/features/zoom/CoachZoomPanel', () => ({
  CoachZoomPanel: ({ expertId }: { expertId: string | null }) =>
    createElement('section', undefined, `COACH_ZOOM_PANEL:${expertId ?? 'null'}`),
}))

vi.mock('@/features/zoom/UserZoomPanel', () => ({
  UserZoomPanel: ({ userId }: { userId: string }) =>
    createElement('section', undefined, `USER_ZOOM_PANEL:${userId}`),
}))

vi.mock('@/features/zoom/hooks/useMiniAppCalendar', () => ({
  useMiniAppCalendar: () => {
    userCalendarController.calls += 1

    return {}
  },
}))

vi.mock('@/features/zoom/components/mini-app/CalendarView', () => ({
  CalendarView: () =>
    createElement('section', undefined, 'Доступ до Zoom ще не підтверджено'),
}))

vi.mock('@/layout/DashboardSideRails', () => ({
  default: () => createElement('aside', undefined, 'SIDE_RAILS'),
}))

async function renderMiniAppCalendarRoute(initialEntry = '/miniapp/zoom-calendar') {
  const { default: MiniAppCalendarRoute } = await import('@/features/zoom/routes/MiniAppCalendarRoute')

  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [initialEntry] },
      createElement(MiniAppCalendarRoute),
    ),
  )
}

describe('MiniAppCalendarRoute', () => {
  afterEach(() => {
    routeState.auth.user = null
    routeState.auth.role = null
    userCalendarController.calls = 0
    sessionOrchestrator.authRestoreStatus = 'ready'
    sessionOrchestrator.restoreSession.mockReset()
  })

  it('routes EXPERT without FOCUS subscription to coach calendar management with coach bottom nav', async () => {
    routeState.auth.user = {
      id: 'expert-user',
      role: 'EXPERT',
      activeRole: 'EXPERT',
      expertId: 'expert-1',
    }
    routeState.auth.role = 'EXPERT'

    const markup = await renderMiniAppCalendarRoute()

    expect(markup).toContain('COACH_ZOOM_PANEL:expert-1')
    expect(markup).toContain('data-miniapp-nav-variant="coach"')
    expect(markup).toContain('aria-label="Coach Mini App navigation"')
    expect(markup).toContain('Календар')
    expect(markup).toContain('Учасники')
    expect(markup).toContain('Battle')
    expect(markup).toContain('Аналітика')
    expect(markup).toContain('Ще')
    const nav = markup.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/g) ?? []
    expect(nav).toHaveLength(1)
    const buttons = nav[0].match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []
    expect(buttons.map((button) => button.replace(/<[^>]*>/g, ''))).toEqual([
      'Календар', 'Учасники', 'Battle', 'Аналітика', 'Ще',
    ])
    expect(buttons[0]).toContain('aria-current="page"')
    expect(markup).not.toContain('data-miniapp-nav-variant="user"')
    expect(markup.match(/miniapp-bottomnav-shell/g)).toHaveLength(1)
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
    expect(markup).toMatch(/aria-current="page"[\s\S]*Календар/)
    expect(markup).toContain('pb-32')
    expect(markup).toContain('pb-28')
    expect(markup).not.toContain('Starway / Навчання')
    expect(markup).not.toContain('Навчання')
    expect(markup).not.toContain('Інструменти')
    expect(markup).not.toContain('Компанія')
    expect(markup).not.toContain('Підтримка')
    expect(markup).not.toContain('Privacy')
    expect(markup).not.toContain('Terms')
    expect(markup).not.toContain('Cookies')
    expect(markup).not.toContain('Доступ до Zoom ще не підтверджено')
    expect(userCalendarController.calls).toBe(0)
  })

  it('routes SUPERADMIN in coach context to coach calendar management', async () => {
    routeState.auth.user = {
      id: 'superadmin-user',
      role: 'SUPERADMIN',
      activeRole: 'SUPERADMIN',
      expertId: null,
    }
    routeState.auth.role = 'SUPERADMIN'

    const markup = await renderMiniAppCalendarRoute()

    expect(markup).toContain('COACH_ZOOM_PANEL:null')
    expect(markup).toContain('data-miniapp-nav-variant="coach"')
    expect(markup).not.toContain('Доступ до Zoom ще не підтверджено')
    expect(userCalendarController.calls).toBe(0)
  })

  it('derives the active Battle tab from the existing coach section URL', async () => {
    routeState.auth.user = {
      id: 'expert-user',
      role: 'EXPERT',
      activeRole: 'EXPERT',
      expertId: 'expert-1',
    }
    routeState.auth.role = 'EXPERT'

    const markup = await renderMiniAppCalendarRoute('/miniapp/zoom-calendar#battle')
    const nav = markup.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? ''
    const buttons = nav.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []

    expect(buttons[2]).toContain('aria-current="page"')
    expect(buttons[2]).toContain('Battle')
    expect(buttons[0]).not.toContain('aria-current="page"')
  })

  it('does not keep dead hash navigation for coach tabs without destination owners', () => {
    const source = readFileSync(
      new URL('../../../../src/components/miniapp/MiniAppLayout.tsx', import.meta.url),
      'utf8',
    )

    expect(source).not.toContain('#participants')
    expect(source).not.toContain('#analytics')
    expect(source).not.toContain('#more')
    expect(source).toContain("navigate('/miniapp/zoom-calendar#battle')")
  })

  it('renders the existing USER calendar owner for an authenticated user', async () => {
    routeState.auth.user = {
      id: 'focus-user',
      role: 'USER',
      activeRole: 'USER',
      expertId: null,
    }
    routeState.auth.role = 'USER'

    const markup = await renderMiniAppCalendarRoute()

    expect(markup).toContain('USER_ZOOM_PANEL:focus-user')
    expect(markup).not.toContain('COACH_ZOOM_PANEL:')
    expect(markup).not.toContain('data-miniapp-nav-variant="coach"')
    expect(userCalendarController.calls).toBe(0)
  })

  it('does not leave the Mini App on a permanent loading state after auth restore fails', async () => {
    sessionOrchestrator.authRestoreStatus = 'failed'
    const markup = await renderMiniAppCalendarRoute()

    expect(markup).toContain('Не вдалося відкрити календар')
    expect(markup).toContain('Спробувати ще раз')
    expect(markup).not.toContain('Завантаження…')
    expect(markup).toContain('data-miniapp-nav-variant="user"')
    expect(markup.match(/miniapp-bottomnav-shell/g)).toHaveLength(1)
    expect(markup).not.toContain('data-miniapp-nav-variant="coach"')
    expect(userCalendarController.calls).toBe(0)
  })

  it('shows loading only while the canonical auth restore is active', async () => {
    sessionOrchestrator.authRestoreStatus = 'restoring'
    const markup = await renderMiniAppCalendarRoute()

    expect(markup).toContain('Завантаження…')
    expect(markup).not.toContain('Спробувати ще раз')
  })
})
