import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ZoomCalendarSession } from '@/features/zoom/zoom.types'

const { useGetCalendarSessionsQuery, openExternalPaymentUrl } = vi.hoisted(() => ({
  useGetCalendarSessionsQuery: vi.fn(() => ({ data: [] })),
  openExternalPaymentUrl: vi.fn(),
}))

vi.mock('@/features/subscription/utils/openExternalPaymentUrl', () => ({
  openExternalPaymentUrl,
}))

vi.mock('../../../../src/features/zoom/zoom.api', () => ({
  useBookPrivateSlotMutation: () => [vi.fn(), { isLoading: false }],
  useCancelZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
  useCreateZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
  useGetAvailablePrivateSlotsQuery: () => ({ data: [] }),
  useGetCalendarSessionsQuery,
  useUpdateZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('../../../../src/features/zoom/services/zoom.api', () => ({
  useGetAttendeesQuery: () => ({ data: [] }),
  useRegisterAttendeeMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitBookingPreparationMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitBookingQuestionMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('@/features/admin/services/ownership.api', () => ({
  useGetUsersQuery: () => ({ data: [] }),
}))

describe('useCalendar', () => {
  it('opens one Kyiv Google Calendar template for a future registered session', async () => {
    const { useCalendar } = await import('../../../../src/features/zoom/hooks/useCalendar')
    let addToCalendar: ((session: ZoomCalendarSession) => void) | undefined
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-24T10:00:00.000Z'))

    try {
      function HookProbe() {
        addToCalendar = useCalendar({ mode: 'user', userId: 'user-1' }).handleAddToCalendar
        return createElement('div')
      }

      renderToStaticMarkup(createElement(HookProbe))
      addToCalendar?.({
        id: 'group-26-oct',
        scheduledAt: '2026-10-26T17:00:00.000Z',
        durationMinutes: 75,
        topic: 'ФОКУС · Zoom-практика',
        status: 'SCHEDULED',
        type: 'group_practice',
        isMyBooking: true,
        zoomLink: 'https://zoom.example/authorized-later',
      })

      expect(openExternalPaymentUrl).toHaveBeenCalledTimes(1)
      const url = new URL(openExternalPaymentUrl.mock.calls[0][0])
      expect(url.origin).toBe('https://calendar.google.com')
      expect(url.searchParams.get('text')).toBe('ФОКУС · Zoom-практика')
      expect(url.searchParams.get('dates')).toBe('20261026T170000Z/20261026T181500Z')
      expect(url.searchParams.get('ctz')).toBe('Europe/Kyiv')
      expect(url.searchParams.get('details')).toBe('час за Києвом: Europe/Kyiv')
      expect(url.searchParams.get('location')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps paid individual details and excludes past, cancelled, or expired bookings', async () => {
    const { buildGoogleCalendarTemplateUrl } = await import('../../../../src/features/zoom/utils/calendar-event')
    const now = new Date('2026-10-24T10:00:00.000Z')
    const base: ZoomCalendarSession = {
      id: 'booking',
      scheduledAt: '2026-10-26T17:00:00.000Z',
      durationMinutes: 60,
      topic: 'Індивідуальна сесія',
      status: 'SCHEDULED',
      type: 'individual',
      isMyBooking: true,
      commerceStatus: 'PAID',
      zoomLink: '',
    }

    expect(buildGoogleCalendarTemplateUrl(base, now)).toContain('calendar.google.com')
    expect(buildGoogleCalendarTemplateUrl({ ...base, scheduledAt: '2026-10-24T09:00:00.000Z' }, now)).toBeNull()
    expect(buildGoogleCalendarTemplateUrl({ ...base, status: 'CANCELLED' }, now)).toBeNull()
    expect(buildGoogleCalendarTemplateUrl({ ...base, commerceStatus: 'EXPIRED' }, now)).toBeNull()

    vi.useFakeTimers()
    vi.setSystemTime(now)
    try {
      const paidUrl = new URL(buildGoogleCalendarTemplateUrl({
        ...base,
        scheduledAt: '2026-10-24T11:00:00.000Z',
        durationMinutes: 45,
        zoomLink: 'https://zoom.example/authorized',
      }, now)!)
      expect(paidUrl.searchParams.get('dates')).toBe('20261024T110000Z/20261024T114500Z')
      expect(paidUrl.searchParams.get('details')).toContain('Zoom: https://zoom.example/authorized')
      expect(paidUrl.searchParams.get('location')).toBe('Zoom')
    } finally {
      vi.useRealTimers()
    }
  })

  it('passes canonical expertId into the shared coach calendar query', async () => {
    useGetCalendarSessionsQuery.mockClear()
    const { useCalendar } = await import('../../../../src/features/zoom/hooks/useCalendar')

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
    const { useCalendar } = await import('../../../../src/features/zoom/hooks/useCalendar')

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
    const { useCalendar } = await import('../../../../src/features/zoom/hooks/useCalendar')
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
