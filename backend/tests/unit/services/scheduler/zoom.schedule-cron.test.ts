import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSchedule = vi.fn()

vi.mock('node-cron', () => ({
  default: {
    schedule: (...args: unknown[]) => mockSchedule(...args),
  },
}))

vi.mock('../../../modules/admin/content-research/service.ts', () => ({
  refreshMarketResearch: vi.fn(),
}))
vi.mock('../../../modules/ai-operator/operator.service.ts', () => ({
  sendCoachZoomSummary: vi.fn(),
}))
vi.mock('../../../modules/zoom/service.ts', () => ({
  resetMonthlySwapUsage: vi.fn(),
}))
vi.mock('../../../modules/zoom/index.ts', () => ({
  cancelStaleBattlesCron: vi.fn(),
  expireZoomSwapRequestsCron: vi.fn(),
  scanZoomAvailabilityAutoGenerate: vi.fn(),
  syncZoomWeeklyChannelPostCron: vi.fn(),
}))
vi.mock('../../../platform/index.ts', () => ({
  getProductCronProfile: vi.fn(() => ({ jobs: [] })),
}))
vi.mock('../../../core/runtime/idempotency.ts', () => ({
  withRuntimeAdvisoryLock: vi.fn(async (_key: string, fn: () => Promise<void>) => fn()),
}))
vi.mock('../../../lib/telegram.ts', () => ({
  bot: {},
  sendOpsTelegramMessage: vi.fn(),
}))
vi.mock('../../../db/client.ts', () => ({
  prisma: {
    notification: { findFirst: vi.fn() },
    zoomSessionAttendee: { findMany: vi.fn() },
  },
}))
vi.mock('../../../products/ab-system/content/abTest.followups.ts', () => ({
  AB_TEST_LIFECYCLE_REMINDERS: {},
}))
vi.mock('../../notifications/worker.ts', () => ({
  startNotificationJobWorker: vi.fn(),
  stopNotificationJobWorker: vi.fn(),
}))
vi.mock('../../runtimeOutbox/worker.ts', () => ({
  startRuntimeOutboxWorker: vi.fn(),
  stopRuntimeOutboxWorker: vi.fn(),
}))
vi.mock('../ai-seller.ts', () => ({
  aiSellerFocusCheck24hCron: vi.fn(),
  aiSellerFocusDojimBeforeZoom2Cron: vi.fn(),
  aiSellerLeadFollowup3dCron: vi.fn(),
  aiSellerLeadFollowup7dCron: vi.fn(),
  aiSellerReactivationCron: vi.fn(),
  aiSellerRetentionCron: vi.fn(),
}))
vi.mock('../billing.ts', () => ({
  scheduleBillingExpiryCheck: vi.fn(),
  scheduleBillingExpiryWarning: vi.fn(),
  scheduleInactivityComeback: vi.fn(),
}))
vi.mock('../daily/index.ts', () => ({
  aiInactiveCron: vi.fn(),
  coachDailyBriefingCron: vi.fn(),
  coachMonthlyStrategicPlannerCron: vi.fn(),
  coachWeeklyPlannerSaturdayCron: vi.fn(),
  coachWeeklyPlannerTuesdayCron: vi.fn(),
  dailyEveningCron: vi.fn(),
  dailyMorningCron: vi.fn(),
  streakBrokenCron: vi.fn(),
  streakRiskCron: vi.fn(),
  weeklyContentReminderCron: vi.fn(),
  weeklySummaryCron: vi.fn(),
}))
vi.mock('../../../modules/zoom/audio/cloudinary-audio-ingest.service.ts', () => ({
  cloudinaryZoomAudioIngestCron: vi.fn(),
}))
vi.mock('../../../modules/zoom/urls.ts', () => ({
  buildZoomCalendarUrl: vi.fn(() => 'https://miniapp.example/zoom-calendar'),
}))
vi.mock('../lifecycle.ts', () => ({
  mentorReadinessCheckCron: vi.fn(),
  personalProgramCheckCron: vi.fn(),
  referralCheckCron: vi.fn(),
  scheduleWinbackNotification: vi.fn(),
}))
vi.mock('../operations.ts', () => ({
  expireMicroTasksCron: vi.fn(),
  markMissedDaysCron: vi.fn(),
  microTaskReminderCron: vi.fn(),
  nudgeCron: vi.fn(),
  subscriptionExpiredCron: vi.fn(),
  subscriptionExpiringCron: vi.fn(),
  webMapBehindGoalsCron: vi.fn(),
  webMapMonthEndAnalysisCron: vi.fn(),
  webMapMonthStartReminderCron: vi.fn(),
}))

import { startScheduler, stopScheduler } from '../index.ts'

describe('zoom availability auto-generate cron registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSchedule.mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
      destroy: vi.fn(),
    })
  })

  afterEach(() => {
    stopScheduler()
  })

  it('registers a single daily cron for zoom availability auto-generation', () => {
    startScheduler()

    expect(
      mockSchedule.mock.calls.filter((call) => call[0] === '12 2 * * *'),
    ).toHaveLength(1)
  })
})
