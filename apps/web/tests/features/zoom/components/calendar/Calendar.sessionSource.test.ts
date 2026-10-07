import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { ZoomCalendarSession } from '@/features/zoom/zoom.types'

const calendarQuery = vi.fn()

vi.mock('@/features/zoom/zoom.api', () => ({
  useGetCalendarSessionsQuery: (...args: unknown[]) => {
    calendarQuery(...args)
    return { data: [] }
  },
  useGetAvailablePrivateSlotsQuery: () => ({ data: [] }),
  useBookPrivateSlotMutation: () => [vi.fn(), { isLoading: false }],
  useCancelZoomSessionMutation: () => [vi.fn()],
  useCreateZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateZoomSessionMutation: () => [vi.fn()],
}))
vi.mock('@/features/zoom/services/zoom.api', () => ({
  useGetAttendeesQuery: () => ({ data: [] }),
  useRegisterAttendeeMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitBookingPreparationMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitBookingQuestionMutation: () => [vi.fn(), { isLoading: false }],
}))
vi.mock('@/features/admin/services/ownership.api', () => ({
  useGetUsersQuery: () => ({ data: [] }),
}))

describe('Calendar sessionSource rendering', () => {
  it('renders only the explicit USER source and never falls back to the hook query', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const sourceRange = {
      from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      to: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    }
    const group = {
      id: 'group', scheduledAt: startsAt, topic: 'GROUP_RENDER', status: 'SCHEDULED',
      type: 'GROUP', zoomLink: '', attendeesCount: 0, remainingSlots: 10, canEdit: false,
    } as ZoomCalendarSession
    const individual = {
      id: 'individual', scheduledAt: startsAt, topic: 'INDIVIDUAL_RENDER', status: 'SCHEDULED',
      type: 'PRIVATE', zoomLink: '', attendeesCount: 0, remainingSlots: 1, canEdit: false,
    } as ZoomCalendarSession
    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')

    const groupMarkup = renderToStaticMarkup(createElement(Calendar, {
      mode: 'user', userId: 'user-1', sessionSource: { ...sourceRange, sessions: [group] },
    }))
    const individualMarkup = renderToStaticMarkup(createElement(Calendar, {
      mode: 'user', userId: 'user-1', sessionSource: { ...sourceRange, sessions: [individual] },
    }))

    expect(groupMarkup).toContain('GROUP_RENDER')
    expect(groupMarkup).not.toContain('INDIVIDUAL_RENDER')
    expect(individualMarkup).toContain('INDIVIDUAL_RENDER')
    expect(individualMarkup).not.toContain('GROUP_RENDER')
    expect(calendarQuery).toHaveBeenLastCalledWith(
      expect.any(Object),
      { skip: true },
    )
  })
})
