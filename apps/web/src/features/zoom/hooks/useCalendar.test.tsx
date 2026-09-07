import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { useGetCalendarSessionsQuery } = vi.hoisted(() => ({
  useGetCalendarSessionsQuery: vi.fn(() => ({ data: [] })),
}))

vi.mock('../zoom.api', () => ({
  useBookPrivateSlotMutation: () => [vi.fn(), { isLoading: false }],
  useCancelZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
  useCreateZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
  useGetAvailablePrivateSlotsQuery: () => ({ data: [] }),
  useGetCalendarSessionsQuery,
  useUpdateZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('../services/zoom.api', () => ({
  useGetAttendeesQuery: () => ({ data: [] }),
  useRegisterAttendeeMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitBookingPreparationMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitBookingQuestionMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('@/features/admin/services/ownership.api', () => ({
  useGetUsersQuery: () => ({ data: [] }),
}))

describe('useCalendar', () => {
  it('passes canonical expertId into the shared coach calendar query', async () => {
    useGetCalendarSessionsQuery.mockClear()
    const { useCalendar } = await import('./useCalendar')

    function HookProbe(props: { mode: 'coach' | 'user'; userId: string; expertId?: string }) {
      useCalendar(props)
      return createElement('div')
    }

    renderToStaticMarkup(
      createElement(HookProbe, { mode: 'coach', userId: 'expert-1', expertId: 'expert-1' }),
    )

    expect(useGetCalendarSessionsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'coach',
        userId: 'expert-1',
        expertId: 'expert-1',
      }),
      expect.any(Object),
    )
  })

  it('keeps user mode on the same shared owner without forcing expertId', async () => {
    useGetCalendarSessionsQuery.mockClear()
    const { useCalendar } = await import('./useCalendar')

    function HookProbe(props: { mode: 'coach' | 'user'; userId: string; expertId?: string }) {
      useCalendar(props)
      return createElement('div')
    }

    renderToStaticMarkup(
      createElement(HookProbe, { mode: 'user', userId: 'user-1' }),
    )

    expect(useGetCalendarSessionsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        userId: 'user-1',
        expertId: undefined,
      }),
      expect.any(Object),
    )
  })

  it('filters returned sessions to the selected week range before rendering', async () => {
    const currentDay = new Date()
    const currentDayOfWeek = currentDay.getDay()
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
    const weekDay = new Date(currentDay)
    weekDay.setDate(currentDay.getDate() + mondayOffset + 1)
    weekDay.setHours(18, 0, 0, 0)
    const nextWeekDay = new Date(weekDay)
    nextWeekDay.setDate(weekDay.getDate() + 7)
    useGetCalendarSessionsQuery.mockReturnValueOnce({
      data: [
        {
          id: 'in-week',
          scheduledAt: weekDay.toISOString(),
          topic: 'Selected week',
          status: 'SCHEDULED',
          type: 'group_practice',
          zoomLink: '',
        },
        {
          id: 'next-week',
          scheduledAt: nextWeekDay.toISOString(),
          topic: 'Next week',
          status: 'SCHEDULED',
          type: 'group_practice',
          zoomLink: '',
        },
      ] as never,
    })
    const { useCalendar } = await import('./useCalendar')
    let renderedSessionIds: string[] = []
    let renderedDaySessionIds: string[] = []

    function HookProbe() {
      const calendar = useCalendar({
        mode: 'coach',
        userId: 'expert-1',
        expertId: 'expert-1',
      })
      renderedSessionIds = calendar.sessions.map((session) => session.id)
      renderedDaySessionIds = calendar
        .sessionsOnDay(weekDay)
        .map((session) => session.id)
      return createElement('div')
    }

    renderToStaticMarkup(createElement(HookProbe))

    expect(renderedSessionIds).toEqual(['in-week'])
    expect(renderedDaySessionIds).toEqual(['in-week'])
  })
})
