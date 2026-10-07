import { afterEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  endpointDefinitions: {} as Record<string, { query?: (input: string) => unknown; invalidatesTags?: unknown }>,
}))

vi.mock('@/services/api', () => ({
  api: {
    injectEndpoints: ({ endpoints }: {
      endpoints: (build: {
        query: <T>(definition: T) => T;
        mutation: <T>(definition: T) => T;
      }) => Record<string, unknown>;
    }) => {
      testState.endpointDefinitions = endpoints({
        query: definition => definition,
        mutation: definition => definition,
      }) as typeof testState.endpointDefinitions
      return {}
    },
  },
}))

import { logIndividualAvailabilityQueryFailure } from '../../../src/features/zoom/zoom.api'
import type { ZoomCalendarSession } from '../../../src/features/zoom/zoom.types'

describe('logIndividualAvailabilityQueryFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('records the safe status and provider message when the availability query fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    logIndividualAvailabilityQueryFailure('2026-09-29', {
      error: {
        status: 503,
        data: { message: 'availability_unavailable' },
      },
    })

    expect(warn).toHaveBeenCalledWith(
      '[ZOOM_INDIVIDUAL_AVAILABILITY_REQUEST_FAILED]',
      { date: '2026-09-29', status: 503, message: 'availability_unavailable' },
    )
  })

  it('targets the canonical commerce-request cancellation endpoint', () => {
    const endpoint = testState.endpointDefinitions.cancelZoomCommerceRequest

    expect(endpoint.query?.('commerce-request-1')).toEqual({
      url: '/zoom/commerce/requests/commerce-request-1',
      method: 'DELETE',
    })
    expect(endpoint.invalidatesTags).toEqual(['ZoomSession'])
  })

  it('keeps the distinct booking cancellation endpoints and refreshes Zoom sessions', () => {
    expect(testState.endpointDefinitions.unbookSlot.query?.('group-session-1')).toEqual({
      url: '/zoom/sessions/group-session-1/unbook',
      method: 'POST',
    })
    expect(testState.endpointDefinitions.cancelPrivateBooking.query?.('individual-session-1')).toEqual({
      url: '/zoom/sessions/individual-session-1/book',
      method: 'DELETE',
    })
    expect(testState.endpointDefinitions.cancelZoomSession.query?.('coach-session-1')).toEqual({
      url: '/zoom/sessions/coach-session-1',
      method: 'DELETE',
    })
    expect(testState.endpointDefinitions.unbookSlot.invalidatesTags).toEqual(['ZoomSession'])
    expect(testState.endpointDefinitions.cancelPrivateBooking.invalidatesTags).toEqual(['ZoomSession'])
    expect(testState.endpointDefinitions.cancelZoomSession.invalidatesTags).toEqual(['ZoomSession'])
  })

  it('accepts the optional real coach identity returned by the calendar DTO', () => {
    const session: ZoomCalendarSession = {
      id: 'session-1', coach: { id: 'expert-1', name: 'Надія Старвей' },
      scheduledAt: '2026-09-10T10:00:00.000Z', topic: 'Індивідуальна сесія',
      status: 'SCHEDULED', type: 'individual', zoomLink: '', canEdit: false,
    }

    expect(session.coach).toEqual({ id: 'expert-1', name: 'Надія Старвей' })
  })
})
