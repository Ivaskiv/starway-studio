import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const authState = {
  auth: {
    user: null as
      | null
      | {
          id: string
          role: 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN'
          expertId?: string | null
          access?: { isPaid?: boolean }
          subscriptionStatus?: string | null
        },
    status: 'authenticated' as 'authenticated' | 'loading' | 'guest',
  },
}

const telegramRuntime = {
  miniApp: false,
  initData: '',
}

vi.mock('@/app/hooks', () => ({
  useAppSelector: (
    selector: (state: typeof authState) => unknown
  ) => selector(authState),
}))

vi.mock('@/features/zoom/CoachZoomPanel', () => ({
  CoachZoomPanel: ({ expertId }: { expertId: string | null }) =>
    createElement('div', undefined, `COACH_PANEL:${expertId ?? 'null'}`),
}))

vi.mock('@/features/zoom/UserZoomPanel', () => ({
  UserZoomPanel: ({ userId }: { userId: string }) =>
    createElement('div', undefined, `USER_PANEL:${userId}`),
}))

vi.mock('@/features/social/utils/telegramWebApp', () => ({
  isTelegramMiniApp: () => telegramRuntime.miniApp,
}))

vi.mock('@/shared/telegram/telegramDeepLinks', () => ({
  buildTelegramDeepLink: () => 'https://t.me/test',
}))

describe('ZoomCalendarPage', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  afterEach(() => {
    telegramRuntime.miniApp = false
    telegramRuntime.initData = ''
    vi.unstubAllGlobals()
  })

  it.each(['ADMIN', 'EXPERT', 'SUPERADMIN'] as const)(
    'routes %s to the existing coach panel',
    async (role) => {
      authState.auth.user = {
        id: 'staff-user',
        role,
        expertId: 'expert-1',
        access: { isPaid: false },
        subscriptionStatus: null,
      }

      const { default: ZoomCalendarPage } = await import('./ZoomCalendarPage')
      const markup = renderToStaticMarkup(createElement(ZoomCalendarPage))

      expect(markup).toContain('COACH_PANEL:expert-1')
      expect(markup).not.toContain('USER_PANEL:')
      expect(markup).not.toContain('Активувати ФОКУС')
    },
  )

  it('keeps privileged staff on coach panel even without expertId', async () => {
    authState.auth.user = {
      id: 'staff-user',
      role: 'ADMIN',
      expertId: null,
      access: { isPaid: false },
      subscriptionStatus: null,
    }

    const { default: ZoomCalendarPage } = await import('./ZoomCalendarPage')
    const markup = renderToStaticMarkup(createElement(ZoomCalendarPage))

    expect(markup).toContain('COACH_PANEL:null')
    expect(markup).not.toContain('USER_PANEL:')
  })

  it('routes paid USER to the existing user panel', async () => {
    authState.auth.user = {
      id: 'user-1',
      role: 'USER',
      expertId: null,
      access: { isPaid: true },
      subscriptionStatus: null,
    }

    const { default: ZoomCalendarPage } = await import('./ZoomCalendarPage')
    const markup = renderToStaticMarkup(createElement(ZoomCalendarPage))

    expect(markup).toContain('USER_PANEL:user-1')
    expect(markup).not.toContain('COACH_PANEL:')
  })

  it('keeps Telegram Mini App booking entry on the existing user panel', async () => {
    telegramRuntime.miniApp = true
    telegramRuntime.initData = 'telegram-init-data'
    vi.stubGlobal('window', {
      location: { pathname: '/miniapp/zoom-calendar' },
      Telegram: {
        WebApp: {
          initData: telegramRuntime.initData,
        },
      },
    })

    authState.auth.user = {
      id: 'focus-user',
      role: 'USER',
      expertId: null,
      access: { isPaid: true },
      subscriptionStatus: null,
    }

    const { default: ZoomCalendarPage } = await import('./ZoomCalendarPage')
    const markup = renderToStaticMarkup(createElement(ZoomCalendarPage))

    expect(markup).toContain('USER_PANEL:focus-user')
    expect(markup).not.toContain('Записатись на Zoom')
    expect(markup).not.toContain('Завантажуємо доступні Zoom-слоти')
  })
})
