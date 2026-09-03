import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('./zoom.api', () => ({
  useGetCalendarSessionsQuery: () => ({ data: [] }),
  useGetLeaderboardQuery: () => ({ data: [] }),
  useInitiateBattleMutation: () => [vi.fn(), { isLoading: false }],
  useLogBattleProgressMutation: () => [vi.fn()],
  useGetEligibleOpponentsQuery: () => ({ data: [] }),
  useGetPendingSwapsQuery: () => ({ data: [] }),
  useAcceptSwapMutation: () => [vi.fn()],
  useDeclineSwapMutation: () => [vi.fn()],
}))

vi.mock('./components/calendar/Calendar', () => ({
  default: ({ mode }: { mode: string }) => createElement('div', undefined, `CALENDAR:${mode}`),
}))

describe('UserZoomPanel', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  it('uses the existing empty states instead of mock sessions when user calendar data is empty', async () => {
    const { UserZoomPanel } = await import('./UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))

    expect(markup).toContain('CALENDAR:user')
    expect(markup).toContain('Ти ще не зареєструвалась на жодну сесію')
    expect(markup).not.toContain('Чому ти відкладаєш важливе?')
    expect(markup).not.toContain('демо')
  })
})
