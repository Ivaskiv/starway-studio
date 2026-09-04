import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUserAccessState = vi.fn()
const mockZoomSessionFindUnique = vi.fn()
const mockZoomSessionAttendeeFindUnique = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    zoomSession: {
      findUnique: (...args: unknown[]) => mockZoomSessionFindUnique(...args),
    },
    zoomSessionAttendee: {
      findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
    },
  },
}))

vi.mock('@/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

import { assertCanBookGroupPracticeSession } from '@/modules/zoom/booking/zoom.booking.service.js'

describe('assertCanBookGroupPracticeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects NO_ACCESS before creating a new group booking', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).rejects.toThrow('NO_ACTIVE_SUBSCRIPTION')

    expect(mockZoomSessionFindUnique).not.toHaveBeenCalled()
    expect(mockZoomSessionAttendeeFindUnique).not.toHaveBeenCalled()
  })

  it('keeps FOCUS_ACTIVE users on the existing booking path', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-09-30T00:00:00.000Z'),
    })
    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      status: 'SCHEDULED',
      capacity: 10,
      _count: { attendees: 2 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).resolves.toBeUndefined()

    expect(mockZoomSessionFindUnique).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      include: { _count: { select: { attendees: true } } },
    })
  })
})
