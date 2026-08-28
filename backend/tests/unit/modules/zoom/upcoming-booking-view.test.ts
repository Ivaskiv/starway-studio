import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionFindFirst = vi.fn()
const mockZoomSessionAttendeeFindUnique = vi.fn()
const mockEventFindMany = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    zoomSession: {
      findFirst: (...args: unknown[]) => mockZoomSessionFindFirst(...args),
    },
    zoomSessionAttendee: {
      findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
    },
    event: {
      findMany: (...args: unknown[]) => mockEventFindMany(...args),
    },
  },
}))

import { getUpcomingZoomBookingView } from '@/modules/zoom/booking/zoom.booking.service.js'

describe('getUpcomingZoomBookingView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEventFindMany.mockResolvedValue([])
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)
  })

  it('reads only the next group practice session from the canonical ZoomSession owner', async () => {
    mockZoomSessionFindFirst.mockResolvedValue({
      id: 'session-group',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-17T16:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      topic: 'ФОКУС · Zoom-практика',
      requests: { type: 'group_practice', zoomLink: 'https://zoom.example/group' },
      _count: { attendees: 5 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue({ id: 'attendee-1' })

    const session = await getUpcomingZoomBookingView('user-1')

    expect(mockZoomSessionFindFirst).toHaveBeenCalledWith({
      where: {
        scheduledAt: { gte: expect.any(Date) },
        status: 'SCHEDULED',
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: 'GROUP' },
        ],
      },
      include: {
        _count: { select: { attendees: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })
    expect(session).toMatchObject({
      id: 'session-group',
      attendeesCount: 5,
      isMyBooking: true,
    })
  })
})
