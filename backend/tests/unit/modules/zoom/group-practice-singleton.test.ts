import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionCreate = vi.fn()
const mockZoomSessionFindMany = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    zoomSession: {
      create: (...args: unknown[]) => mockZoomSessionCreate(...args),
      findMany: (...args: unknown[]) => mockZoomSessionFindMany(...args),
    },
  },
}))

vi.mock('../../../../src/lib/telegram.js', () => ({ bot: {} }))

vi.mock('../../../../src/modules/zoom/private/zoom.private-booking.service.js', () => ({
  assertWeeklyPrivateLimit: vi.fn(),
}))

vi.mock('../../../../src/modules/zoom/core/zoom.operations.service.js', () => ({
  afterZoomOperation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../../src/modules/zoom/notifications/zoom.subscriber-notifications.service.js', () => ({
  notifySubscribersNewSession: vi.fn().mockResolvedValue(undefined),
}))

import {
  createFullSession,
  createZoomSession,
} from '../../../../src/modules/zoom/core/zoom.session.service.js'

type StoredSession = {
  id: string
  expertId: string
  scheduledAt: Date
  topic: string
  requests: unknown
  status: 'SCHEDULED'
}

describe('canonical Monday Group Practice singleton', () => {
  let sessions: StoredSession[]

  beforeEach(() => {
    vi.clearAllMocks()
    sessions = []
    mockZoomSessionFindMany.mockImplementation(async ({ where }: { where: { expertId: string; scheduledAt: { gte: Date; lte: Date } } }) => (
      sessions.filter((session) => (
        session.expertId === where.expertId
        && session.scheduledAt >= where.scheduledAt.gte
        && session.scheduledAt <= where.scheduledAt.lte
        && (session.requests as { type?: string }).type === 'group_practice'
      ))
    ))
    mockZoomSessionCreate.mockImplementation(async ({ data }: { data: Omit<StoredSession, 'id' | 'status'> }) => {
      const session: StoredSession = {
        id: `session-${sessions.length + 1}`,
        ...data,
        status: 'SCHEDULED',
      }
      sessions.push(session)
      return session
    })
  })

  it('returns the existing canonical Monday practice instead of creating a second one through either creation path', async () => {
    const scheduledAt = new Date('2026-10-05T16:00:00.000Z')
    const first = await createFullSession({
      expertId: 'expert-1',
      scheduledAt,
      topic: 'canonical topic',
      requests: { type: 'group_practice' } as never,
    }, {
      suppressAutomation: true,
      suppressSessionNotification: true,
    })
    const duplicate = await createZoomSession(
      'expert-1',
      new Date('2026-10-05T17:00:00.000Z'),
      'legacy topic',
      { type: 'group_practice' } as never,
    )

    expect(duplicate).toEqual(first)
    expect(sessions).toHaveLength(1)
    expect(mockZoomSessionCreate).toHaveBeenCalledTimes(1)
  })

  it('allows the next Monday and unrelated session types to create normally', async () => {
    await createFullSession({
      expertId: 'expert-1',
      scheduledAt: new Date('2026-10-05T16:00:00.000Z'),
      topic: 'Monday group',
      requests: { type: 'group_practice' } as never,
    }, { suppressAutomation: true, suppressSessionNotification: true })

    await createFullSession({
      expertId: 'expert-1',
      scheduledAt: new Date('2026-10-12T16:00:00.000Z'),
      topic: 'Next Monday group',
      requests: { type: 'group_practice' } as never,
    }, { suppressAutomation: true, suppressSessionNotification: true })
    await createFullSession({
      expertId: 'expert-1',
      scheduledAt: new Date('2026-10-05T17:00:00.000Z'),
      topic: 'Individual session',
      requests: { type: 'individual' } as never,
    }, { suppressAutomation: true, suppressSessionNotification: true })

    expect(sessions).toHaveLength(3)
    expect(sessions.map((session) => session.requests)).toEqual([
      { type: 'group_practice' },
      { type: 'group_practice' },
      { type: 'individual' },
    ])
  })
})
