import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    },
  })
})

import { store } from '@/app/store'
import { clearAuth, setCredentials } from '@/features/auth/services/auth.slice'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { SessionOrchestratorProvider } from '@/features/auth/context/SessionOrchestratorContext'
import MiniAppCalendarRoute from '@/features/zoom/routes/MiniAppCalendarRoute'

vi.mock('@/layout/DashboardSideRails', () => ({
  default: () => null,
}))

describe('MiniAppCalendarRoute runtime', () => {
  afterEach(() => {
    store.dispatch(clearAuth())
  })

  it('renders the real unpaid USER week calendar through the Mini App provider chain', () => {
    store.dispatch(setCredentials({
      accessToken: 'telegram-user-token',
      user: {
        id: 'telegram-user',
        email: 'telegram-user@example.com',
        role: 'USER',
        activeRole: 'USER',
        firstName: 'Telegram',
      },
    }))

    const markup = renderToStaticMarkup(
      createElement(
        Provider,
        { store },
        createElement(
          ThemeProvider,
          undefined,
          createElement(
            MemoryRouter,
            { initialEntries: ['/miniapp/zoom-calendar'] },
            createElement(
              SessionOrchestratorProvider,
              undefined,
              createElement(MiniAppCalendarRoute),
            ),
          ),
        ),
      ),
    )

    expect(markup).toContain('data-miniapp-nav-variant="user"')
    expect(markup).toContain('data-zoom-week-view="user-vertical"')
    expect(markup).toContain('Немає запланованих сесій')
    expect(markup).not.toContain('Цілі FOCUS недоступні')
    expect(markup).not.toContain('Персональний календар доступний тільки')
  })
})
