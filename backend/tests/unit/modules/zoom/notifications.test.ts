import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockExpertFindMany = vi.fn()
const mockGenerateSessionsFromAvailability = vi.fn()
const mockSeedDefaultAvailability = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    expert: {
      findMany: (...args: unknown[]) => mockExpertFindMany(...args),
    },
  },
}))

vi.mock('../../../../src/modules/zoom/booking/zoom.availability.service.js', () => ({
  generateSessionsFromAvailability: (...args: unknown[]) => mockGenerateSessionsFromAvailability(...args),
  seedDefaultAvailability: (...args: unknown[]) => mockSeedDefaultAvailability(...args),
}))

vi.mock('../../../../src/lib/telegram.js', () => ({
  bot: {},
  sendDedupedTelegramMessage: vi.fn(),
}))

vi.mock('../../../../src/modules/zoom/index.js', () => ({
  getAllUpcomingSessionsForNotification: vi.fn(),
  patchSessionRequests: vi.fn(),
  expireStaleSwapRequests: vi.fn(),
  syncChannelPost: vi.fn(),
}))

import { scanZoomAvailabilityAutoGenerate } from '../../../../src/modules/zoom/notifications/zoom.notifications.js'

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
        id: 'expert-individual-only',
        zoomAvailability: [
          { id: 'slot-4', active: true, dayOfWeek: 2, hour: 10, minute: 0, timezone: 'Europe/Kyiv', sessionType: 'individual' },
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
    expect(mockSeedDefaultAvailability).toHaveBeenCalledTimes(3)
    expect(mockSeedDefaultAvailability).toHaveBeenCalledWith('expert-empty')
    expect(mockSeedDefaultAvailability).toHaveBeenCalledWith('expert-individual-only')
    expect(mockGenerateSessionsFromAvailability).toHaveBeenCalledWith('expert-active', 4)
    expect(mockGenerateSessionsFromAvailability).toHaveBeenCalledWith('expert-failing', 4)
    expect(result).toEqual({
      expertsScanned: 4,
      expertsSkipped: 0,
      created: 16,
      skipped: 0,
      failures: 1,
    })
  })
})
