import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'

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

vi.mock('@/features/zoom/zoom.api', () => ({
  useGetTelegramAvailableSlotsQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useBookTelegramSlotMutation: () => [vi.fn()],
}))

vi.mock('@/features/social/utils/telegramWebApp', () => ({
  isTelegramMiniApp: () => false,
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
})
