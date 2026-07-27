import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionAttendeeUpsert = vi.fn()
const mockZoomSessionAttendeeFindUnique = vi.fn()
const mockEventCreate = vi.fn()

vi.mock('../../db/client.js', () => ({
  prisma: {
    zoomSessionAttendee: {
      upsert: (...args: unknown[]) => mockZoomSessionAttendeeUpsert(...args),
      findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
    },
    event: {
      create: (...args: unknown[]) => mockEventCreate(...args),
    },
  },
}))

vi.mock('../../lib/telegram.js', () => ({
  bot: {},
  getBotLink: vi.fn(),
  sendDedupedTelegramMessage: vi.fn(),
  sendOpsTelegramMessage: vi.fn(),
}))

import {
  registerAttendee,
  saveBookingQuestionForAttendee,
} from './service.js'

describe('zoom booking service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registerAttendee uses idempotent upsert for repeated booking clicks', async () => {
    mockZoomSessionAttendeeUpsert.mockResolvedValue({
      id: 'att-1',
      sessionId: 'session-1',
      userId: 'user-1',
      attended: false,
      createdAt: new Date('2026-07-27T10:00:00.000Z'),
    })

    const attendee = await registerAttendee('user-1', 'session-1')

    expect(attendee).toMatchObject({
      id: 'att-1',
      sessionId: 'session-1',
      userId: 'user-1',
    })
    expect(mockZoomSessionAttendeeUpsert).toHaveBeenCalledWith({
      where: { sessionId_userId: { sessionId: 'session-1', userId: 'user-1' } },
      create: { userId: 'user-1', sessionId: 'session-1' },
      update: {},
    })
  })

  it('saveBookingQuestionForAttendee stores questionText for an existing booking', async () => {
    const createdAt = new Date('2026-07-27T10:05:00.000Z')

    mockZoomSessionAttendeeFindUnique.mockResolvedValue({ id: 'att-1' })
    mockEventCreate.mockResolvedValue({
      id: 'event-1',
      createdAt,
    })

    const event = await saveBookingQuestionForAttendee(
      'user-1',
      'session-1',
      '  Як підготуватися до практики?  ',
    )

    expect(event).toEqual({
      id: 'event-1',
      createdAt,
    })
    expect(mockZoomSessionAttendeeFindUnique).toHaveBeenCalledWith({
      where: {
        sessionId_userId: {
          sessionId: 'session-1',
          userId: 'user-1',
        },
      },
      select: {
        id: true,
      },
    })
    expect(mockEventCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'ZOOM_BOOKING_QUESTION',
        source: 'web',
        payload: {
          sessionId: 'session-1',
          questionText: 'Як підготуватися до практики?',
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    })
  })
})
