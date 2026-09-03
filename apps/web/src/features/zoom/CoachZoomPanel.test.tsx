import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./zoom.api', () => ({
  useGetCalendarSessionsQuery: () => ({ data: [] }),
  useGetLeaderboardQuery: () => ({ data: [] }),
  useFinalizeBattleMutation: () => [vi.fn()],
  useCreateZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('./services/zoom.api', () => ({
  useGetAttendeesQuery: () => ({ data: [], isFetching: false, refetch: vi.fn() }),
  useMarkAttendedMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('./components/calendar/Calendar', () => ({
  default: ({ mode }: { mode: string }) => createElement('div', undefined, `CALENDAR:${mode}`),
}))

vi.mock('./ZoomAvailabilityEditor', () => ({
  ZoomAvailabilityEditor: () => createElement('div', undefined, 'AVAILABILITY_EDITOR'),
}))

vi.mock('@/app/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { user: { role: string } } }) => unknown) =>
    selector({ auth: { user: { role: 'EXPERT' } } }),
}))

describe('CoachZoomPanel', () => {
  it('uses the existing empty states instead of mock sessions when calendar data is empty', async () => {
    const { CoachZoomPanel } = await import('./CoachZoomPanel')
    const markup = renderToStaticMarkup(createElement(CoachZoomPanel, { expertId: 'expert-1' }))

    expect(markup).toContain('CALENDAR:coach')
    expect(markup).toContain('Немає запланованих сесій')
    expect(markup).not.toContain('ФОКУС · Zoom-практика')
    expect(markup).not.toContain('демо')
  })
})
