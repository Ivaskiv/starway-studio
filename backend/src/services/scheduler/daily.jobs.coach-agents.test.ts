import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockUserFindFirst = vi.fn()
const mockUserCount = vi.fn()
const mockUserFindMany = vi.fn()
const mockSendMessage = vi.fn()
const mockGenerateCoachAgentsWebDeepLink = vi.fn()
const mockProductSubscriptionCount = vi.fn()
const mockFunnelLeadCount = vi.fn()
const mockCheckoutSessionFindMany = vi.fn()
const mockSubscriptionCount = vi.fn()
const mockZoomSessionCount = vi.fn()
const mockRuntimeOutboxCount = vi.fn()
const mockContentPlanCount = vi.fn()
const mockContentItemCount = vi.fn()
const mockQueryRaw = vi.fn()

vi.mock('../../db/client.js', () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
      count: (...args: unknown[]) => mockUserCount(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
    funnelLead: {
      count: (...args: unknown[]) => mockFunnelLeadCount(...args),
    },
    checkoutSession: {
      findMany: (...args: unknown[]) => mockCheckoutSessionFindMany(...args),
    },
    subscription: {
      count: (...args: unknown[]) => mockSubscriptionCount(...args),
    },
    productSubscription: {
      count: (...args: unknown[]) => mockProductSubscriptionCount(...args),
    },
    zoomSession: {
      count: (...args: unknown[]) => mockZoomSessionCount(...args),
    },
    runtimeOutbox: {
      count: (...args: unknown[]) => mockRuntimeOutboxCount(...args),
    },
    contentPlan: {
      count: (...args: unknown[]) => mockContentPlanCount(...args),
    },
    contentItem: {
      count: (...args: unknown[]) => mockContentItemCount(...args),
    },
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
  withRetry: (operation: () => unknown) => operation(),
}))

vi.mock('../../lib/telegram.js', () => ({
  bot: {},
  coachBot: {
    telegram: {
      sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    },
  },
  sendOpsTelegramMessage: vi.fn(),
}))

vi.mock('../notifications/NotificationService.js', () => ({
  notificationService: { emit: vi.fn() },
}))

vi.mock('../../modules/ai-mentor/weekly-analysis/service.js', () => ({
  runWeeklyAnalysis: vi.fn(),
}))

vi.mock('../../modules/analytics/service.js', () => ({
  getCanonicalRevenueMetrics: vi.fn(async () => ({
    revenueByCurrency: [{ currency: 'UAH', sumCents: 100, count: 1 }],
    revenueByProduct: [{ code: 'focus', name: 'Focus', currency: 'UAH', sumCents: 100, users: 1 }],
    revenueCents: 100,
    paidUsers: 1,
    paidUsersByProduct: [{ code: 'focus', users: 1 }],
    paymentCount: 1,
    renewals: 0,
    mrrCents: 100,
    arpuCents: 100,
    salesCount: 0,
    totalRevenueCents: 0,
    currency: 'UAH',
  })),
}))

vi.mock('../notifications/mentorLifecycle.js', () => ({
  resolvePausedMentorContext: vi.fn(),
}))

vi.mock('./common.js', () => ({
  ensureNotificationPreferenceTableAvailability: vi.fn(async () => true),
  getMinutesInTimezone: vi.fn(),
  getStartOfUtcDay: vi.fn(),
  getWeekdayInTimezone: vi.fn(),
  hasActiveSchedulerProductEntitlement: vi.fn(),
  hasMentorNotificationAccess: vi.fn(),
  isWithinScheduledMinute: vi.fn(),
}))

vi.mock('./dailyBriefing.ai.js', () => ({
  generateAiBriefingInsights: vi.fn(async () => []),
}))

vi.mock('../../modules/zoom/zoomPostReport.types.js', () => ({
  parseZoomPostReport: vi.fn(() => null),
}))

vi.mock('../../modules/deeplinks/service.js', () => ({
  generateCoachAgentsWebDeepLink: (...args: unknown[]) => mockGenerateCoachAgentsWebDeepLink(...args),
}))

import {
  coachDailyBriefingCron,
  coachMonthlyStrategicPlannerCron,
} from './daily.jobs.js'

describe('daily.jobs coach agents CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    process.env.STARWAY_OPS_CHAT_ID = 'ops-chat'
    process.env.COACH_TELEGRAM_ID = '99'

    mockUserFindFirst
      .mockResolvedValueOnce({ id: 'coach-user-id' })
      .mockResolvedValueOnce({ id: 'coach-user-id' })
    mockFunnelLeadCount.mockResolvedValue(0)
    mockUserCount.mockResolvedValue(0)
    mockUserFindMany.mockResolvedValue([])
    mockCheckoutSessionFindMany.mockResolvedValue([])
    mockSubscriptionCount.mockResolvedValue(0)
    mockProductSubscriptionCount.mockResolvedValue(0)
    mockZoomSessionCount.mockResolvedValue(0)
    mockRuntimeOutboxCount.mockResolvedValue(0)
    mockContentPlanCount.mockResolvedValue(0)
    mockContentItemCount.mockResolvedValue(0)
    mockQueryRaw.mockResolvedValue([])
    mockGenerateCoachAgentsWebDeepLink.mockResolvedValue(
      'https://starway-frontend.vercel.app/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-agents-token',
    )
    mockSendMessage.mockResolvedValue(undefined)

    vi.setSystemTime(new Date('2026-08-29T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses deeplink-auth agents CTA in scheduled daily and monthly coach reports', async () => {
    await coachDailyBriefingCron()
    await coachMonthlyStrategicPlannerCron()

    expect(mockGenerateCoachAgentsWebDeepLink).toHaveBeenNthCalledWith(1, 'coach-user-id')
    expect(mockGenerateCoachAgentsWebDeepLink).toHaveBeenNthCalledWith(2, 'coach-user-id')

    const sentUrls = mockSendMessage.mock.calls
      .map(([, , options]) => JSON.stringify(options?.reply_markup ?? {}))
      .join('\n')

    expect(sentUrls).toContain('/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-agents-token')
    expect(sentUrls).not.toContain('localhost')
    expect(sentUrls).toContain('agents.overview')
    expect(sentUrls).not.toContain('https://starway-frontend.vercel.app/app/dashboard/admin/studio?tab=agents&item=agents.overview"')
  })
})
