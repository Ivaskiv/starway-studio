import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationStatus, NotificationType, ZoomStatus } from '@starway/db/prisma-client'

const mockZoomSessionFindMany = vi.fn()
const mockNotificationFindFirst = vi.fn()
const mockNotificationCreate = vi.fn()

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
  getProductCronProfile: vi.fn(),
}))
vi.mock('../../core/runtime/runtimeIdempotency.js', () => ({
  withRuntimeAdvisoryLock: vi.fn(),
}))
vi.mock('../../lib/telegram.js', () => ({
  bot: {},
  sendOpsTelegramMessage: vi.fn(),
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

const createdNotifications: Array<Record<string, unknown>> = []

vi.mock('../../db/client.js', () => ({
  prisma: {
    zoomSession: {
      findMany: (...args: unknown[]) => mockZoomSessionFindMany(...args),
    },
    notification: {
      findFirst: (...args: unknown[]) => mockNotificationFindFirst(...args),
      create: (...args: unknown[]) => mockNotificationCreate(...args),
    },
  },
}))

import { scanZoomSessionReminders } from './index.js'

function createTelegramBot() {
  return {
    telegram: {
      sendMessage: vi.fn().mockResolvedValue({ ok: true }),
    },
  } as const
}

describe('scanZoomSessionReminders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T18:00:00.000Z'))
    vi.clearAllMocks()
    createdNotifications.length = 0

    mockNotificationCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      createdNotifications.push(data)
      return { id: `notification-${createdNotifications.length}` }
    })

    mockNotificationFindFirst.mockImplementation(async ({ where }: { where: { userId: string; templateKey: string; data?: { path: string[]; equals: string } } }) => {
      const hit = createdNotifications.find((item) =>
        item.userId === where.userId
        && item.templateKey === where.templateKey
        && item.status === NotificationStatus.SENT
        && (!where.data || (item.data as { sessionId?: string } | undefined)?.sessionId === where.data.equals),
      )
      return hit ? { id: 'notification-hit' } : null
    })
  })

  it('sends one 2h reminder for a booked trial attendee and dedupes repeated scans', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-trial',
        scheduledAt: new Date('2026-07-31T19:55:00.000Z'),
        expertId: 'expert-1',
        requests: { zoomLink: 'https://zoom.example/trial' },
        attendees: [
          {
            userId: 'trial-user',
            user: {
              telegramChatId: '630111093',
            },
          },
        ],
      },
    ])
    const telegramBot = createTelegramBot()

    await scanZoomSessionReminders(telegramBot as never)
    await scanZoomSessionReminders(telegramBot as never)

    expect(telegramBot.telegram.sendMessage).toHaveBeenCalledTimes(1)
    expect(createdNotifications).toHaveLength(1)
    expect(createdNotifications[0]).toMatchObject({
      userId: 'trial-user',
      type: NotificationType.AI_REMINDER,
      templateKey: 'ZOOM_REMINDER_2H',
      status: NotificationStatus.SENT,
    })
  })

  it('sends one 5m reminder in the correct short window', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-five-minutes',
        scheduledAt: new Date('2026-07-31T18:04:00.000Z'),
        expertId: 'expert-1',
        requests: { zoomLink: 'https://zoom.example/live' },
        attendees: [
          {
            userId: 'trial-user',
            user: {
              telegramChatId: '630111093',
            },
          },
        ],
      },
    ])
    const telegramBot = createTelegramBot()

    await scanZoomSessionReminders(telegramBot as never)

    expect(telegramBot.telegram.sendMessage).toHaveBeenCalledTimes(1)
    expect(createdNotifications[0]).toMatchObject({
      templateKey: 'ZOOM_REMINDER_5M',
    })
  })

  it('does not send reminders when payment exists without booking attendees', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-without-booking',
        scheduledAt: new Date('2026-07-31T19:55:00.000Z'),
        expertId: 'expert-1',
        requests: { zoomLink: 'https://zoom.example/trial' },
        attendees: [],
      },
    ])
    const telegramBot = createTelegramBot()

    await scanZoomSessionReminders(telegramBot as never)

    expect(telegramBot.telegram.sendMessage).not.toHaveBeenCalled()
    expect(createdNotifications).toHaveLength(0)
  })

  it('does not send reminders for cancelled sessions because the scan only requests scheduled sessions', async () => {
    mockZoomSessionFindMany.mockImplementation(async ({ where }: { where: { status: ZoomStatus } }) => {
      expect(where.status).toBe(ZoomStatus.SCHEDULED)
      return []
    })
    const telegramBot = createTelegramBot()

    await scanZoomSessionReminders(telegramBot as never)

    expect(telegramBot.telegram.sendMessage).not.toHaveBeenCalled()
    expect(createdNotifications).toHaveLength(0)
  })

  it('formats the 2h reminder in Zoom calendar timezone around a Kyiv day boundary', async () => {
    vi.setSystemTime(new Date('2026-07-31T20:10:00.000Z'))
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-kyiv-boundary',
        scheduledAt: new Date('2026-07-31T22:05:00.000Z'),
        expertId: 'expert-1',
        requests: { zoomLink: 'https://zoom.example/kyiv' },
        attendees: [
          {
            userId: 'trial-user',
            user: {
              telegramChatId: '630111093',
            },
          },
        ],
      },
    ])
    const telegramBot = createTelegramBot()

    await scanZoomSessionReminders(telegramBot as never)

    expect(telegramBot.telegram.sendMessage).toHaveBeenCalledTimes(1)
    const messageText = (telegramBot.telegram.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(messageText).toContain('01:05')
  })
})
