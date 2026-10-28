import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockTransaction = vi.fn()
const mockSessionFindUnique = vi.fn()
const mockSessionFindUniqueOrThrow = vi.fn()
const mockAttendeeFindUnique = vi.fn()
const mockAttendeeDelete = vi.fn()
const mockAttendeeDeleteMany = vi.fn()
const mockSessionUpdate = vi.fn()
const mockEventCreate = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    zoomSession: {
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockSessionFindUniqueOrThrow(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
    },
    zoomSessionAttendee: {
      findUnique: (...args: unknown[]) => mockAttendeeFindUnique(...args),
      delete: (...args: unknown[]) => mockAttendeeDelete(...args),
      deleteMany: (...args: unknown[]) => mockAttendeeDeleteMany(...args),
    },
    event: { create: (...args: unknown[]) => mockEventCreate(...args) },
  },
}))

vi.mock('../../../../src/lib/telegram.js', () => ({ bot: {} }))
vi.mock('../../../../src/modules/zoom/core/zoom.operations.service.js', () => ({
  afterZoomOperation: vi.fn(async () => undefined),
}))

import { unbookSlot } from '../../../../src/modules/zoom/booking/zoom.slot-booking.service.js'

describe('group booking cancellation history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRaw: vi.fn(),
      zoomSession: {
        findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
        findUniqueOrThrow: (...args: unknown[]) => mockSessionFindUniqueOrThrow(...args),
        update: (...args: unknown[]) => mockSessionUpdate(...args),
      },
      zoomSessionAttendee: {
        findUnique: (...args: unknown[]) => mockAttendeeFindUnique(...args),
        delete: (...args: unknown[]) => mockAttendeeDelete(...args),
        deleteMany: (...args: unknown[]) => mockAttendeeDeleteMany(...args),
      },
      event: { create: (...args: unknown[]) => mockEventCreate(...args) },
    }))
    mockSessionFindUniqueOrThrow.mockResolvedValue({
      id: 'session-1', topic: 'Групова практика', type: 'GROUP',
      status: 'SCHEDULED', scheduledAt: new Date('2026-11-01T17:00:00.000Z'),
      requests: { type: 'group_practice' },
    })
    mockAttendeeFindUnique.mockResolvedValue({ id: 'attendee-1' })
    mockAttendeeDelete.mockResolvedValue({ id: 'attendee-1' })
    mockAttendeeDeleteMany.mockResolvedValue({ count: 1 })
    mockSessionUpdate.mockResolvedValue({})
    mockEventCreate.mockResolvedValue({ id: 'zoom-booking-cancelled:attendee-1' })
  })

  it('persists a user-scoped immutable cancellation fact before removing the attendee', async () => {
    await unbookSlot('session-1', 'user-1')

    expect(mockEventCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        id: 'zoom-booking-cancelled:attendee-1',
        userId: 'user-1',
        type: 'ZOOM_BOOKING_CANCELLED',
      }),
    }))
    expect(mockAttendeeDelete).toHaveBeenCalledWith({ where: { id: 'attendee-1' } })
    expect(mockEventCreate.mock.invocationCallOrder[0]).toBeLessThan(mockAttendeeDelete.mock.invocationCallOrder[0])
  })

  it('does not remove the attendee when cancellation history cannot be persisted', async () => {
    mockEventCreate.mockRejectedValueOnce(new Error('audit_write_failed'))

    await expect(unbookSlot('session-1', 'user-1')).rejects.toThrow('audit_write_failed')

    expect(mockAttendeeDelete).not.toHaveBeenCalled()
    expect(mockSessionUpdate).not.toHaveBeenCalled()
  })
})
