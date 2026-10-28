import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()
const attendeeFindMany = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    zoomSession: { findMany: (...args: unknown[]) => findMany(...args) },
    zoomSessionAttendee: { findMany: (...args: unknown[]) => attendeeFindMany(...args) },
  },
}))

vi.mock('../../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: vi.fn().mockResolvedValue({ state: 'FOCUS_ACTIVE' }),
}))

vi.mock('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js', () => ({
  hasPaidIndividualParticipation: vi.fn(),
  isLegacyIndividualSession: vi.fn(),
}))

describe('getCalendarSessions user visibility', () => {
  beforeEach(() => {
    findMany.mockReset()
    attendeeFindMany.mockReset()
    findMany.mockResolvedValue([])
    attendeeFindMany.mockResolvedValue([])
  })

  it('includes the selected user’s commerce-linked individual session without exposing other individual sessions', async () => {
    const { getCalendarSessions } = await import('../../../../src/modules/zoom/calendar/zoom.calendar.service.js')

    await getCalendarSessions({
      from: new Date('2026-09-01T00:00:00.000Z'),
      to: new Date('2026-09-30T23:59:59.000Z'),
      role: 'user',
      userId: 'user-1',
      expertId: 'expert-1',
    })

    const where = findMany.mock.calls[0]?.[0]?.where
    expect(where.OR).toContainEqual({ commerceRequests: { some: { requesterUserId: 'user-1' } } })
    expect(where.OR).toContainEqual({ attendees: { some: { userId: 'user-1' } } })
    expect(where.OR).toContainEqual({
      type: 'GROUP',
      NOT: { requests: { path: ['type'], equals: 'individual' } },
    })
    expect(where.OR).not.toContainEqual({ type: 'GROUP' })
    expect(where.status).toBeUndefined()
  })

  it('projects the same single canonical Monday group practice for coach and user', async () => {
    const { getCalendarSessions } = await import('../../../../src/modules/zoom/calendar/zoom.calendar.service.js')
    const canonicalPractice = {
      id: 'canonical-practice',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-10-05T16:00:00.000Z'),
      status: 'COMPLETED',
      type: 'GROUP',
      topic: 'canonical topic',
      requests: { type: 'group_practice' },
      _count: { attendees: 5 },
      attendees: [],
    }
    const staleDuplicate = {
      id: 'stale-duplicate',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-10-05T17:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      topic: 'legacy topic',
      requests: { type: 'group_practice' },
      _count: { attendees: 0 },
      attendees: [],
    }

    findMany.mockResolvedValue([canonicalPractice, staleDuplicate])

    const coachSessions = await getCalendarSessions({
      from: new Date('2026-10-05T00:00:00.000Z'),
      to: new Date('2026-10-05T23:59:59.000Z'),
      role: 'coach',
      userId: 'coach-user',
      expertId: 'expert-1',
    })
    const userSessions = await getCalendarSessions({
      from: new Date('2026-10-05T00:00:00.000Z'),
      to: new Date('2026-10-05T23:59:59.000Z'),
      role: 'user',
      userId: 'user-1',
      expertId: 'expert-1',
    })

    expect(coachSessions.map((session) => session.id)).toEqual(['canonical-practice'])
    expect(userSessions.map((session) => session.id)).toEqual(['canonical-practice'])
  })
})
