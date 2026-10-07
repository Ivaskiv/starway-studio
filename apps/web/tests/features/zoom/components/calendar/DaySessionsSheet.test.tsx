import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ZoomCalendarSession } from '../../zoom.types'

vi.mock('@/features/zoom/zoom.api', () => ({
  useCancelPrivateBookingMutation: () => [vi.fn(), { isLoading: false }],
  useUnbookSlotMutation: () => [vi.fn(), { isLoading: false }],
}))

describe('DaySessionsSheet', () => {
  it('renders the unbook action for booked sessions in the day sheet', async () => {
    const { DaySessionsSheet } = await import('@/features/zoom/components/calendar/DaySessionsSheet')
    const session: ZoomCalendarSession = {
      id: 'session-1',
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      topic: 'Focus group practice',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: '',
      attendeesCount: 4,
      canEdit: false,
      isMyBooking: true,
      remainingSlots: 6,
    }

    const markup = renderToStaticMarkup(
      createElement(DaySessionsSheet, {
        selectedDate: new Date(),
        selectedSessions: [session],
        onClose: vi.fn(),
        onRequestBooking: vi.fn(),
        onAddToCalendar: vi.fn(),
      }),
    )

    expect(markup).toContain('Ти записана')
    expect(markup).toContain('СКАСУВАТИ ЗАПИС')
  })

  it('offers the same cancellation action for a future booked Individual session', async () => {
    const { DaySessionsSheet } = await import('@/features/zoom/components/calendar/DaySessionsSheet')
    const markup = renderToStaticMarkup(createElement(DaySessionsSheet, {
      selectedDate: new Date(),
      selectedSessions: [{
        id: 'individual-1', scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        topic: 'Індивідуальна сесія', status: 'SCHEDULED', type: 'individual', zoomLink: '',
        attendeesCount: 1, canEdit: false, isMyBooking: true, remainingSlots: 0,
      }],
      onClose: vi.fn(), onRequestBooking: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('СКАСУВАТИ ЗАПИС')
  })
})
