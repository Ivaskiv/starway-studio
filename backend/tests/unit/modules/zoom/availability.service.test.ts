import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockExpertFindUnique = vi.fn()
const mockExpertUpdate = vi.fn()
const mockZoomSessionFindFirst = vi.fn()
const mockCreateFullSession = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    expert: {
      findUnique: (...args: unknown[]) => mockExpertFindUnique(...args),
      update: (...args: unknown[]) => mockExpertUpdate(...args),
    },
    zoomSession: {
      findFirst: (...args: unknown[]) => mockZoomSessionFindFirst(...args),
    },
  },
}))

vi.mock('../index.js', () => ({
  createFullSession: (...args: unknown[]) => mockCreateFullSession(...args),
}))

import { generateSessionsFromAvailability } from '../booking/zoom.availability.service.js'

describe('generateSessionsFromAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses slot timezone instead of hardcoded Kyiv offset', async () => {
    mockExpertFindUnique.mockResolvedValue({
      zoomAvailability: [
        {
          id: 'warsaw-monday',
          dayOfWeek: 1,
          hour: 19,
          minute: 0,
          timezone: 'Europe/Warsaw',
          sessionType: 'group_practice',
          maxSlots: 50,
          priceCents: 0,
          durationMinutes: 60,
          active: true,
        },
      ],
    })
    mockZoomSessionFindFirst.mockResolvedValue(null)
    mockCreateFullSession.mockResolvedValue({ id: 'session-1' })

    await generateSessionsFromAvailability(
      'expert-1',
      1,
      new Date('2026-08-04T09:00:00.000Z'),
    )

    expect(mockCreateFullSession).toHaveBeenCalledTimes(1)
    expect(mockCreateFullSession.mock.calls[0]?.[0]).toMatchObject({
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-10T17:00:00.000Z'),
      topic: 'ФОКУС · Zoom-практика',
    })
  })

  it('is idempotent across repeated runs and preserves existing sessions', async () => {
    mockExpertFindUnique.mockResolvedValue({
      zoomAvailability: [
        {
          id: 'kyiv-monday',
          dayOfWeek: 1,
          hour: 19,
          minute: 0,
          timezone: 'Europe/Kyiv',
          sessionType: 'group_practice',
          maxSlots: 50,
          priceCents: 0,
          durationMinutes: 60,
          active: true,
        },
      ],
    })

    const existingWindows = new Set<string>()
    mockZoomSessionFindFirst.mockImplementation(async ({ where }: { where: { scheduledAt: { gte: Date; lte: Date } } }) => {
      const key = where.scheduledAt.gte.toISOString()
      return existingWindows.has(key) ? { id: `existing:${key}` } : null
    })
    mockCreateFullSession.mockImplementation(async ({ scheduledAt }: { scheduledAt: Date }) => {
      existingWindows.add(new Date(scheduledAt.getTime() - 5 * 60 * 1000).toISOString())
      return { id: `created:${scheduledAt.toISOString()}` }
    })

    const firstRun = await generateSessionsFromAvailability(
      'expert-1',
      2,
      new Date('2026-08-04T09:00:00.000Z'),
    )
    const secondRun = await generateSessionsFromAvailability(
      'expert-1',
      2,
      new Date('2026-08-04T09:00:00.000Z'),
    )

    expect(firstRun).toEqual({ created: 2, skipped: 0 })
    expect(secondRun).toEqual({ created: 0, skipped: 2 })
    expect(mockCreateFullSession).toHaveBeenCalledTimes(2)
  })
})
