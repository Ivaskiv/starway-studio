import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSchedule = vi.fn()

vi.mock('node-cron', () => ({
  default: {
    schedule: (...args: unknown[]) => mockSchedule(...args),
  },
}))

vi.mock('../../modules/admin/content-research.service.js', () => ({
  refreshMarketResearch: vi.fn(),
}))
vi.mock('../../modules/ai-operator/operator.service.js', () => ({
  sendCoachZoomSummary: vi.fn(),
}))
vi.mock('../../modules/zoom/service.js', () => ({
  resetMonthlySwapUsage: vi.fn(),
}))
vi.mock('../../modules/zoom/index.js', () => ({
  cancelStaleBattlesCron: vi.fn(),
  expireZoomSwapRequestsCron: vi.fn(),
  scanZoomAvailabilityAutoGenerate: vi.fn(),
  syncZoomWeeklyChannelPostCron: vi.fn(),
}))
vi.mock('../../platform/index.js', () => ({
  getProductCronProfile: vi.fn(() => ({ jobs: [] })),
}))
vi.mock('../../core/runtime/runtimeIdempotency.js', () => ({
  withRuntimeAdvisoryLock: vi.fn(async (_key: string, fn: () => Promise<void>) => fn()),
}))
vi.mock('../../lib/telegram.js', () => ({
  bot: {},
  sendOpsTelegramMessage: vi.fn(),
}))
vi.mock('../../db/client.js', () => ({
  prisma: {
    notification: { findFirst: vi.fn() },
    zoomSessionAttendee: { findMany: vi.fn() },
  },
}))
vi.mock('../../products/ab-system/content/abTest.followups.js', () => ({
  AB_TEST_LIFECYCLE_REMINDERS: {},
}))
vi.mock('../notifications/worker.js', () => ({
  startNotificationJobWorker: vi.fn(),
  stopNotificationJobWorker: vi.fn(),
}))
vi.mock('../runtimeOutbox/worker.js', () => ({
  startRuntimeOutboxWorker: vi.fn(),
  stopRuntimeOutboxWorker: vi.fn(),
}))
vi.mock('./ai-seller.jobs.js', () => ({
  aiSellerFocusCheck24hCron: vi.fn(),
  aiSellerFocusDojimBeforeZoom2Cron: vi.fn(),
  aiSellerLeadFollowup3dCron: vi.fn(),
  aiSellerLeadFollowup7dCron: vi.fn(),
  aiSellerReactivationCron: vi.fn(),
  aiSellerRetentionCron: vi.fn(),
}))
vi.mock('./billing.jobs.js', () => ({
  scheduleBillingExpiryCheck: vi.fn(),
  scheduleBillingExpiryWarning: vi.fn(),
  scheduleInactivityComeback: vi.fn(),
}))
vi.mock('./daily.jobs.js', () => ({
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
vi.mock('../../modules/zoom/cloudinary-audio-ingest.service.js', () => ({
  cloudinaryZoomAudioIngestCron: vi.fn(),
}))
vi.mock('../../modules/zoom/urls.js', () => ({
  buildZoomCalendarUrl: vi.fn(() => 'https://miniapp.example/zoom-calendar'),
}))
vi.mock('./lifecycle.jobs.js', () => ({
  mentorReadinessCheckCron: vi.fn(),
  personalProgramCheckCron: vi.fn(),
  referralCheckCron: vi.fn(),
  scheduleWinbackNotification: vi.fn(),
}))
vi.mock('./operations.jobs.js', () => ({
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

import { startScheduler, stopScheduler } from './index.js'

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
