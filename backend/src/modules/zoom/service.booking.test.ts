import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionAttendeeUpsert = vi.fn()
const mockZoomSessionAttendeeFindUnique = vi.fn()
const mockZoomSessionAttendeeFindMany = vi.fn()
const mockZoomSessionFindUnique = vi.fn()
const mockZoomSessionFindMany = vi.fn()
const mockEventCreate = vi.fn()

vi.mock('../../db/client.js', () => ({
  prisma: {
    zoomSession: {
      findUnique: (...args: unknown[]) => mockZoomSessionFindUnique(...args),
      findMany: (...args: unknown[]) => mockZoomSessionFindMany(...args),
    },
    zoomSessionAttendee: {
      upsert: (...args: unknown[]) => mockZoomSessionAttendeeUpsert(...args),
      findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
      findMany: (...args: unknown[]) => mockZoomSessionAttendeeFindMany(...args),
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
  assertCanBookGroupPracticeSession,
  getCalendarSessions,
  registerAttendee,
  saveBookingQuestionForAttendee,
  selectTrialZoomEligibleSession,
} from './service.js'
import * as focusAccessModule from '../subscriptions/payments/focus.access.js'

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

  it('selectTrialZoomEligibleSession returns exactly the first Monday group practice for the paid trial', () => {
    const selected = selectTrialZoomEligibleSession(
      [
        {
          id: 'session-late',
          scheduledAt: new Date('2026-08-03T18:00:00.000Z'),
          requests: { type: 'group_practice' },
        },
        {
          id: 'session-early',
          scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
          requests: { type: 'group_practice' },
        },
        {
          id: 'session-wrong-day',
          scheduledAt: new Date('2026-08-10T15:00:00.000Z'),
          requests: { type: 'group_practice' },
        },
      ],
      new Date('2026-08-03T20:59:59.999Z'),
    )

    expect(selected?.id).toBe('session-early')
  })

  it('allows booking when trial entitlement matches the canonical session', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-03T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-early',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-early',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        requests: { type: 'group_practice' },
      },
    ])
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-early',
      }),
    ).resolves.toBeUndefined()
  })

  it('forbids booking another session for trial entitlement', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-03T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-late',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T18:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-early',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        requests: { type: 'group_practice' },
      },
      {
        id: 'session-late',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-03T18:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        requests: { type: 'group_practice' },
      },
    ])

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-late',
      }),
    ).rejects.toThrow('NO_ACTIVE_SUBSCRIPTION')
  })

  it('forbids booking without entitlement', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).rejects.toThrow('NO_ACTIVE_SUBSCRIPTION')
  })

  it('allows booking for FREE_WEEK1 without any paid subscription', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FREE_WEEK1',
      isActive: true,
      hasFocus: false,
      expiresAt: new Date('2026-08-08T10:00:00.000Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).resolves.toBeUndefined()
  })

  it('keeps active focus booking logic working', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-05T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).resolves.toBeUndefined()
  })

  it('keeps repeated requests idempotent for an existing booking', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-03T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-early',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 1,
      requests: { type: 'group_practice' },
      _count: { attendees: 1 },
    })
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-early',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        requests: { type: 'group_practice' },
      },
    ])
    mockZoomSessionAttendeeFindUnique.mockResolvedValue({ id: 'att-1' })

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-early',
      }),
    ).resolves.toBeUndefined()
  })

  it('forbids cancelled sessions', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-05T15:00:00.000Z'),
      status: 'CANCELLED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).rejects.toThrow('session_unavailable')
  })

  it('forbids full sessions before creating a new booking', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-05T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 3,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).rejects.toThrow('slot_full')
  })

  it('returns global group practices when the user has access but no expertId binding', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-03T16:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        topic: 'ФОКУС · Zoom-практика',
        requests: { type: 'group_practice' },
        _count: { attendees: 3 },
      },
    ])
    mockZoomSessionAttendeeFindMany.mockResolvedValue([])

    const sessions = await getCalendarSessions({
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-14T00:00:00.000Z'),
      role: 'user',
      userId: 'user-1',
      expertId: undefined,
    })

    expect(mockZoomSessionFindMany).toHaveBeenCalledWith({
      where: {
        scheduledAt: {
          gte: new Date('2026-08-01T00:00:00.000Z'),
          lte: new Date('2026-08-14T00:00:00.000Z'),
        },
        status: { not: 'CANCELLED' },
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: 'GROUP' },
        ],
      },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      id: 'session-1',
      isMyBooking: false,
    })
  })
})
