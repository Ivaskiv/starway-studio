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
  useRegisterAttendeeMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitBookingPreparationMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitBookingQuestionMutation: () => [vi.fn(), { isLoading: false }],
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
})
