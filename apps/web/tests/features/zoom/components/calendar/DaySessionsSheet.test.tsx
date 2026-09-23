import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ZoomCalendarSession } from '../../zoom.types'

vi.mock('../../zoom.api', () => ({
  useCancelPrivateBookingMutation: () => [vi.fn(), { isLoading: false }],
  useUnbookSlotMutation: () => [vi.fn(), { isLoading: false }],
}))

describe('DaySessionsSheet', () => {
  it('renders the unbook action for booked sessions in the day sheet', async () => {
    const { DaySessionsSheet } = await import('./DaySessionsSheet')
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
    expect(markup).toContain('Скасувати запис')
  })
})
