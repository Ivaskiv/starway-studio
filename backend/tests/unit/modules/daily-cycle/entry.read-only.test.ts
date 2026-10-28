import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDailyEntryFindFirst = vi.fn()
const mockSetCachedTodayEntry = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    dailyEntry: {
      findFirst: (...args: unknown[]) => mockDailyEntryFindFirst(...args),
    },
  },
}))

vi.mock('@/lib/db/dailyCache.js', () => ({
  getCachedEntryByDate: vi.fn(),
  getCachedDailyHistory: vi.fn(),
  getCachedTodayEntry: vi.fn().mockResolvedValue(null),
  invalidateDailyHistoryCache: vi.fn(),
  invalidateDayCache: vi.fn(),
  setCachedTodayEntry: (...args: unknown[]) => mockSetCachedTodayEntry(...args),
}))

import { getOrCreateTodayEntry } from '@/modules/daily-cycle/entry.ts'

describe('getOrCreateTodayEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDailyEntryFindFirst.mockResolvedValue(null)
  })

  it('does not create a DailyEntry when a read finds no entry for today', async () => {
    await expect(getOrCreateTodayEntry('user-1')).resolves.toBeNull()

    expect(mockDailyEntryFindFirst).toHaveBeenCalledTimes(1)
    expect(mockSetCachedTodayEntry).not.toHaveBeenCalled()
  })
})
