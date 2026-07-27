import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockNotificationPreferenceFindMany = vi.fn()
const mockStreakFindMany = vi.fn()
const mockUserFindMany = vi.fn()
const mockEmit = vi.fn()
const mockRunWeeklyAnalysis = vi.fn()
const mockHasActiveSchedulerProductEntitlement = vi.fn()
const mockHasMentorNotificationAccess = vi.fn()

vi.mock('../../db/client.js', () => ({
  prisma: {
    notificationPreference: {
      findMany: (...args: unknown[]) => mockNotificationPreferenceFindMany(...args),
    },
    streak: {
      findMany: (...args: unknown[]) => mockStreakFindMany(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
    productSubscription: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
  withRetry: (operation: () => unknown) => operation(),
}))

vi.mock('../../lib/telegram.js', () => ({
  bot: {},
  coachBot: {
    telegram: {
      sendMessage: vi.fn(),
    },
  },
  sendOpsTelegramMessage: vi.fn(),
}))

vi.mock('../notifications/NotificationService.js', () => ({
  notificationService: {
    emit: (...args: unknown[]) => mockEmit(...args),
  },
}))

vi.mock('./common.js', () => ({
  ensureNotificationPreferenceTableAvailability: vi.fn(async () => true),
  getMinutesInTimezone: vi.fn(() => 19 * 60),
  getStartOfUtcDay: vi.fn(() => new Date('2026-07-27T00:00:00.000Z')),
  getWeekdayInTimezone: vi.fn(() => 'Sun'),
  hasMentorNotificationAccess: (...args: unknown[]) => mockHasMentorNotificationAccess(...args),
  hasActiveSchedulerProductEntitlement: (...args: unknown[]) => mockHasActiveSchedulerProductEntitlement(...args),
  isWithinScheduledMinute: vi.fn(() => true),
}))

vi.mock('../../modules/ai-mentor/weekly-analysis/service.js', () => ({
  runWeeklyAnalysis: (...args: unknown[]) => mockRunWeeklyAnalysis(...args),
}))

vi.mock('../../modules/analytics/service.js', () => ({
  getCanonicalRevenueMetrics: vi.fn(),
}))

vi.mock('../notifications/mentorLifecycle.js', () => ({
  resolvePausedMentorContext: vi.fn(),
}))

vi.mock('./dailyBriefing.ai.js', () => ({
  generateAiBriefingInsights: vi.fn(),
}))

vi.mock('../../modules/zoom/zoomPostReport.types.js', () => ({
  parseZoomPostReport: vi.fn(() => null),
}))

import { NotificationEvent } from '../notifications/NotificationEvent.js'
import {
  dailyMorningCron,
  streakRiskCron,
  weeklySummaryCron,
} from './daily.jobs.js'

describe('daily.jobs product-scoped notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEmit.mockResolvedValue(undefined)
    mockHasMentorNotificationAccess.mockResolvedValue(true)
    mockHasActiveSchedulerProductEntitlement.mockResolvedValue(true)
    mockRunWeeklyAnalysis.mockResolvedValue({
      userReport: { streakDays: 5 },
      metrics: { wheels: 2, sessions: 1 },
    })
  })

  it('skips DAILY_MORNING_DUE for a Focus-only user without absystem/stankey entitlement', async () => {
    mockNotificationPreferenceFindMany.mockResolvedValue([
      {
        userId: 'focus-only-user',
        dailyMorningTime: 8 * 60,
        timezone: 'Europe/Kyiv',
      },
    ])
    mockHasActiveSchedulerProductEntitlement.mockResolvedValue(false)

    await dailyMorningCron()

    expect(mockHasActiveSchedulerProductEntitlement).toHaveBeenCalledWith(
      'focus-only-user',
      ['stankey', 'absystem'],
    )
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('dispatches DAILY_MORNING_DUE when the user has an allowed product entitlement', async () => {
    mockNotificationPreferenceFindMany.mockResolvedValue([
      {
        userId: 'absystem-user',
        dailyMorningTime: 8 * 60,
        timezone: 'Europe/Kyiv',
      },
    ])

    await dailyMorningCron()

    expect(mockEmit).toHaveBeenCalledWith(
      NotificationEvent.DAILY_MORNING_DUE,
      'absystem-user',
    )
  })

  it('skips STREAK_RISK and WEEKLY_SUMMARY when a Focus-only user lacks the corresponding entitlement', async () => {
    mockStreakFindMany.mockResolvedValue([
      {
        current: 7,
        userId: 'focus-only-user',
        user: {
          notificationPreference: {
            telegramEnabled: true,
            streakRiskEnabled: true,
          },
          dailyEntries: [],
        },
      },
    ])
    mockUserFindMany.mockResolvedValue([
      {
        id: 'focus-only-user',
        notificationPreference: {
          telegramEnabled: true,
          weeklySummaryEnabled: true,
          timezone: 'Europe/Kyiv',
        },
      },
    ])
    mockHasActiveSchedulerProductEntitlement.mockResolvedValue(false)

    await streakRiskCron()
    await weeklySummaryCron()

    expect(mockHasActiveSchedulerProductEntitlement).toHaveBeenCalledWith(
      'focus-only-user',
      ['absystem'],
    )
    expect(mockHasActiveSchedulerProductEntitlement).toHaveBeenCalledWith(
      'focus-only-user',
      ['stankey', 'absystem'],
    )
    expect(mockEmit).not.toHaveBeenCalled()
  })
})
