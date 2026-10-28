import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@starway/db/prisma-client'

const transaction = vi.fn()
const lock = vi.fn()
const sessionFindUnique = vi.fn()
const sessionFindMany = vi.fn()
const sessionUpdate = vi.fn()
const expertFindUnique = vi.fn()
const requestFindMany = vi.fn()
const overrideFindUnique = vi.fn()
const eventCreate = vi.fn()
const rescheduleGroupPracticeNotifications = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}))

vi.mock('../../../../src/modules/zoom/core/zoom.session.service.js', () => ({
  createFullSession: vi.fn(),
  findCanonicalMondayGroupPractice: vi.fn(),
}))

vi.mock('../../../../src/modules/zoom/notifications/zoom.reminders.service.js', () => ({
  rescheduleGroupPracticeNotifications: (...args: unknown[]) => rescheduleGroupPracticeNotifications(...args),
}))

import { rescheduleCoachManagedSession } from '../../../../src/modules/zoom/booking/zoom.availability.service.js'

const oldScheduledAt = new Date('2030-09-16T14:00:00.000Z')
const targetScheduledAt = new Date('2030-09-23T14:00:00.000Z')
const availability = {
  id: 'coach-monday',
  dayOfWeek: 1,
  hour: 17,
  minute: 0,
  endHour: 20,
  endMinute: 0,
  timezone: 'Europe/Kyiv',
  sessionType: 'individual',
  maxSlots: 1,
  priceCents: 0,
  durationMinutes: 60,
  active: true,
}

const freeSession = {
  id: 'session-1',
  expertId: 'expert-1',
  scheduledAt: oldScheduledAt,
  topic: 'Індивідуальна сесія',
  status: 'SCHEDULED',
  type: 'PRIVATE',
  capacity: 1,
  requests: { type: 'individual', durationMinutes: 60 },
  postSessionReport: null,
  createdAt: new Date('2030-01-01T00:00:00.000Z'),
  updatedAt: new Date('2030-01-01T00:00:00.000Z'),
  attendees: [],
  commerceRequests: [],
  swapRequestsFrom: [],
}

const bookedGroupPractice = {
  ...freeSession,
  id: 'group-practice-1',
  topic: 'ФОКУС · Zoom-практика',
  type: 'GROUP',
  capacity: 50,
  requests: {
    type: 'group_practice',
    durationMinutes: 60,
    zoomLink: 'https://zoom.example/group-practice',
  },
  attendees: [
    { id: 'attendee-1', userId: 'user-1', attended: false, goalText: 'Моє питання' },
    { id: 'attendee-2', userId: 'user-2', attended: false, goalText: null },
  ],
}

describe('rescheduleCoachManagedSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    expertFindUnique.mockResolvedValue({ zoomAvailability: [availability] })
    overrideFindUnique.mockResolvedValue(null)
    sessionFindUnique.mockResolvedValue(freeSession)
    sessionFindMany.mockResolvedValue([])
    requestFindMany.mockResolvedValue([])
    eventCreate.mockResolvedValue({ id: 'zoom-group-practice-rescheduled:event' })
    rescheduleGroupPracticeNotifications.mockResolvedValue(undefined)
    sessionUpdate.mockImplementation(async ({ data }: { data: { scheduledAt: Date } }) => ({
      ...freeSession,
      scheduledAt: data.scheduledAt,
    }))
    transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      $executeRaw: (...args: unknown[]) => lock(...args),
      $queryRaw: (...args: unknown[]) => lock(...args),
      expert: { findUnique: (...args: unknown[]) => expertFindUnique(...args) },
      zoomSession: {
        findUnique: (...args: unknown[]) => sessionFindUnique(...args),
        findMany: (...args: unknown[]) => sessionFindMany(...args),
        update: (...args: unknown[]) => sessionUpdate(...args),
      },
      zoomCommerceRequest: { findMany: (...args: unknown[]) => requestFindMany(...args) },
      zoomAvailabilityOverride: { findUnique: (...args: unknown[]) => overrideFindUnique(...args) },
      event: { create: (...args: unknown[]) => eventCreate(...args) },
    }))
  })

  it('moves an authorized, free Individual slot only after the canonical availability check', async () => {
    await expect(rescheduleCoachManagedSession({
      sessionId: freeSession.id,
      expertId: freeSession.expertId,
      scheduledAt: targetScheduledAt,
    })).resolves.toMatchObject({
      idempotent: false,
      session: { id: freeSession.id, scheduledAt: targetScheduledAt },
    })

    expect(lock).toHaveBeenCalled()
    expect(sessionUpdate).toHaveBeenCalledWith({
      where: { id: freeSession.id },
      data: { scheduledAt: targetScheduledAt },
    })
  })

  it('moves a future Group Practice in place without losing its attendee records', async () => {
    sessionFindUnique.mockResolvedValue(bookedGroupPractice)
    sessionUpdate.mockImplementation(async ({ data }: { data: { scheduledAt: Date; requests?: unknown } }) => ({
      ...bookedGroupPractice,
      scheduledAt: data.scheduledAt,
      requests: data.requests ?? bookedGroupPractice.requests,
    }))

    await expect(rescheduleCoachManagedSession({
      sessionId: bookedGroupPractice.id,
      expertId: bookedGroupPractice.expertId,
      scheduledAt: targetScheduledAt,
    })).resolves.toMatchObject({
      idempotent: false,
      session: {
        id: bookedGroupPractice.id,
        scheduledAt: targetScheduledAt,
        requests: expect.objectContaining({
          type: 'group_practice',
          zoomLink: 'https://zoom.example/group-practice',
          previousScheduledAt: oldScheduledAt.toISOString(),
        }),
      },
    })

    expect(sessionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: bookedGroupPractice.id },
      data: expect.objectContaining({ scheduledAt: targetScheduledAt }),
    }))
    expect(eventCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'ZOOM_GROUP_PRACTICE_RESCHEDULED',
        payload: expect.objectContaining({
          sessionId: bookedGroupPractice.id,
          attendeesCount: 2,
        }),
      }),
    }))
    expect(rescheduleGroupPracticeNotifications).toHaveBeenCalledWith(expect.objectContaining({
      attendeeUserIds: ['user-1', 'user-2'],
      oldScheduledAt,
      session: expect.objectContaining({ id: bookedGroupPractice.id, scheduledAt: targetScheduledAt }),
    }))
  })

  it('rejects moving a past scheduled Group Practice without side effects', async () => {
    sessionFindUnique.mockResolvedValue({ ...bookedGroupPractice, scheduledAt: new Date('2020-01-01T00:00:00Z') })
    await expect(rescheduleCoachManagedSession({ sessionId: bookedGroupPractice.id, expertId: bookedGroupPractice.expertId, scheduledAt: targetScheduledAt })).rejects.toThrow('RESCHEDULE_SESSION_IMMUTABLE')
    expect(sessionUpdate).not.toHaveBeenCalled()
    expect(eventCreate).not.toHaveBeenCalled()
    expect(rescheduleGroupPracticeNotifications).not.toHaveBeenCalled()
  })

  it.each(['CANCELLED', 'COMPLETED'])('rejects a %s Group Practice without side effects', async (status) => {
    sessionFindUnique.mockResolvedValue({ ...bookedGroupPractice, status })
    await expect(rescheduleCoachManagedSession({ sessionId: bookedGroupPractice.id, expertId: bookedGroupPractice.expertId, scheduledAt: targetScheduledAt })).rejects.toThrow('RESCHEDULE_SESSION_IMMUTABLE')
    expect(sessionUpdate).not.toHaveBeenCalled()
    expect(eventCreate).not.toHaveBeenCalled()
    expect(rescheduleGroupPracticeNotifications).not.toHaveBeenCalled()
  })

  it.each([
    ['outside working hours', '2030-09-23T13:00:00.000Z'],
    ['partially outside working hours', '2030-09-23T16:30:00.000Z'],
  ])('rejects a Group Practice %s without side effects', async (_label, scheduledAt) => {
    sessionFindUnique.mockResolvedValue(bookedGroupPractice)
    await expect(rescheduleCoachManagedSession({ sessionId: bookedGroupPractice.id, expertId: bookedGroupPractice.expertId, scheduledAt: new Date(scheduledAt) })).rejects.toThrow('RESCHEDULE_TARGET_UNAVAILABLE')
    expect(sessionUpdate).not.toHaveBeenCalled()
    expect(eventCreate).not.toHaveBeenCalled()
    expect(rescheduleGroupPracticeNotifications).not.toHaveBeenCalled()
  })

  it('rechecks a changed availability override at Group Practice confirmation', async () => {
    sessionFindUnique.mockResolvedValue(bookedGroupPractice)
    overrideFindUnique.mockResolvedValue({ windows: [] })
    await expect(rescheduleCoachManagedSession({ sessionId: bookedGroupPractice.id, expertId: bookedGroupPractice.expertId, scheduledAt: targetScheduledAt })).rejects.toThrow('RESCHEDULE_TARGET_UNAVAILABLE')
    expect(sessionUpdate).not.toHaveBeenCalled()
    expect(eventCreate).not.toHaveBeenCalled()
    expect(rescheduleGroupPracticeNotifications).not.toHaveBeenCalled()
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  })

  it('accepts an active group working window using its full Kyiv interval', async () => {
    sessionFindUnique.mockResolvedValue(bookedGroupPractice)
    expertFindUnique.mockResolvedValue({ zoomAvailability: [{ ...availability, sessionType: 'group_practice' }] })
    await expect(rescheduleCoachManagedSession({ sessionId: bookedGroupPractice.id, expertId: bookedGroupPractice.expertId, scheduledAt: targetScheduledAt })).resolves.toMatchObject({ idempotent: false })
  })

  it.each([
    ['full overlap', 0, 60, true],
    ['partial overlap', -30, 60, true],
    ['adjacent interval', -60, 60, false],
  ])('checks group practice %s at confirmation', async (_name, offset, duration, blocked) => {
    sessionFindUnique.mockResolvedValue(bookedGroupPractice)
    sessionFindMany.mockResolvedValue([{ scheduledAt: new Date(targetScheduledAt.getTime() + offset * 60_000), requests: { durationMinutes: duration } }])
    const result = rescheduleCoachManagedSession({ sessionId: bookedGroupPractice.id, expertId: bookedGroupPractice.expertId, scheduledAt: targetScheduledAt })
    if (blocked) {
      await expect(result).rejects.toThrow('RESCHEDULE_TARGET_UNAVAILABLE')
      expect(sessionUpdate).not.toHaveBeenCalled()
      expect(eventCreate).not.toHaveBeenCalled()
      expect(rescheduleGroupPracticeNotifications).not.toHaveBeenCalled()
    } else {
      await expect(result).resolves.toMatchObject({ idempotent: false })
    }
  })

  it.each([
    ['a different coach', { ...freeSession, expertId: 'expert-2' }, 'RESCHEDULE_FORBIDDEN'],
    ['a cancelled session', { ...freeSession, status: 'CANCELLED' }, 'RESCHEDULE_SESSION_IMMUTABLE'],
    ['a completed session', { ...freeSession, status: 'COMPLETED' }, 'RESCHEDULE_SESSION_IMMUTABLE'],
    ['attendance history', { ...freeSession, attendees: [{ id: 'attendance-1', attended: true }] }, 'RESCHEDULE_ATTENDEES_LOCKED'],
    ['an active request', { ...freeSession, commerceRequests: [{ id: 'request-1', status: 'REQUESTED' }] }, 'RESCHEDULE_COMMERCE_LOCKED'],
    ['pending payment', { ...freeSession, commerceRequests: [{ id: 'request-1', status: 'APPROVED_PENDING_PAYMENT' }] }, 'RESCHEDULE_COMMERCE_LOCKED'],
    ['a paid booking', { ...freeSession, commerceRequests: [{ id: 'request-1', status: 'PAID' }] }, 'RESCHEDULE_COMMERCE_LOCKED'],
  ])('rejects %s without mutating it', async (_label, session, error) => {
    sessionFindUnique.mockResolvedValue(session)

    await expect(rescheduleCoachManagedSession({
      sessionId: freeSession.id,
      expertId: freeSession.expertId,
      scheduledAt: targetScheduledAt,
    })).rejects.toThrow(error)
    expect(sessionUpdate).not.toHaveBeenCalled()
  })

  it('rejects a target outside the effective availability or overlapping another commitment', async () => {
    await expect(rescheduleCoachManagedSession({
      sessionId: freeSession.id,
      expertId: freeSession.expertId,
      scheduledAt: new Date('2030-09-23T13:00:00.000Z'),
    })).rejects.toThrow('RESCHEDULE_TARGET_UNAVAILABLE')

    sessionFindMany.mockResolvedValue([{ id: 'busy', scheduledAt: targetScheduledAt, requests: { type: 'group_practice', durationMinutes: 60 }, type: 'GROUP', commerceRequests: [] }])
    await expect(rescheduleCoachManagedSession({
      sessionId: freeSession.id,
      expertId: freeSession.expertId,
      scheduledAt: targetScheduledAt,
    })).rejects.toThrow('RESCHEDULE_TARGET_UNAVAILABLE')
    expect(sessionUpdate).not.toHaveBeenCalled()
  })

  it('treats a repeated completed command as idempotent and creates no side effect', async () => {
    sessionFindUnique.mockResolvedValue({ ...freeSession, scheduledAt: targetScheduledAt })

    await expect(rescheduleCoachManagedSession({
      sessionId: freeSession.id,
      expertId: freeSession.expertId,
      scheduledAt: targetScheduledAt,
    })).resolves.toMatchObject({ idempotent: true })
    expect(sessionUpdate).not.toHaveBeenCalled()
    expect(sessionFindMany).not.toHaveBeenCalled()
  })

  it('returns a rollback-safe conflict when PostgreSQL rejects a concurrent serializable write', async () => {
    transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError(
      'serialization failure',
      { code: 'P2034', clientVersion: '5.22.0' },
    ))

    await expect(rescheduleCoachManagedSession({
      sessionId: freeSession.id,
      expertId: freeSession.expertId,
      scheduledAt: targetScheduledAt,
    })).rejects.toThrow('RESCHEDULE_CONCURRENT_MODIFICATION')
    expect(sessionUpdate).not.toHaveBeenCalled()
  })
})
