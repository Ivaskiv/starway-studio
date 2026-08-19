import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockExpertFindMany = vi.fn()
const mockGenerateSessionsFromAvailability = vi.fn()
const mockSeedDefaultAvailability = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    expert: {
      findMany: (...args: unknown[]) => mockExpertFindMany(...args),
    },
  },
}))

vi.mock('../booking/zoom.availability.service.js', () => ({
  generateSessionsFromAvailability: (...args: unknown[]) => mockGenerateSessionsFromAvailability(...args),
  seedDefaultAvailability: (...args: unknown[]) => mockSeedDefaultAvailability(...args),
}))

vi.mock('../../../lib/telegram.js', () => ({
  bot: {},
  sendDedupedTelegramMessage: vi.fn(),
}))

vi.mock('../index.js', () => ({
  getAllUpcomingSessionsForNotification: vi.fn(),
  patchSessionRequests: vi.fn(),
  expireStaleSwapRequests: vi.fn(),
  syncChannelPost: vi.fn(),
}))

import { scanZoomAvailabilityAutoGenerate } from '../notifications/zoom.notifications.js'

describe('scanZoomAvailabilityAutoGenerate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates sessions only for active experts with active availability and isolates failures', async () => {
    mockExpertFindMany.mockResolvedValue([
      {
        id: 'expert-active',
        zoomAvailability: [
          { id: 'slot-1', active: true, dayOfWeek: 1, hour: 19, minute: 0, timezone: 'Europe/Kyiv', sessionType: 'group_practice' },
        ],
      },
      {
        id: 'expert-empty',
        zoomAvailability: [],
      },
      {
        id: 'expert-inactive-slots',
        zoomAvailability: [
          { id: 'slot-2', active: false, dayOfWeek: 1, hour: 19, minute: 0, timezone: 'Europe/Kyiv', sessionType: 'group_practice' },
        ],
      },
      {
        id: 'expert-failing',
        zoomAvailability: [
          { id: 'slot-3', active: true, dayOfWeek: 2, hour: 18, minute: 0, timezone: 'Europe/Kyiv', sessionType: 'group_practice' },
        ],
      },
    ])

    mockGenerateSessionsFromAvailability.mockImplementation(async (expertId: string) => {
      if (expertId === 'expert-failing') {
        throw new Error('generator_failed')
      }

      return { created: 4, skipped: 0 }
    })
    mockSeedDefaultAvailability.mockResolvedValue({
      seeded: true,
      created: 4,
      skipped: 0,
    })

    const result = await scanZoomAvailabilityAutoGenerate()

    expect(mockGenerateSessionsFromAvailability).toHaveBeenCalledTimes(2)
    expect(mockSeedDefaultAvailability).toHaveBeenCalledTimes(1)
    expect(mockSeedDefaultAvailability).toHaveBeenCalledWith('expert-empty')
    expect(mockGenerateSessionsFromAvailability).toHaveBeenCalledWith('expert-active', 4)
    expect(mockGenerateSessionsFromAvailability).toHaveBeenCalledWith('expert-failing', 4)
    expect(result).toEqual({
      expertsScanned: 2,
      expertsSkipped: 1,
      created: 8,
      skipped: 0,
      failures: 1,
    })
  })
})
