import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindMany = vi.fn()
const mockGetUserPreviousZoomSessionRecap = vi.fn()
const mockGetUserLatestWeeklyReportSummary = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    zoomSessionAttendee: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../../../../src/modules/events/service.js', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../../../src/modules/telegram-mentor/handlers/start.js', () => ({
  resolveUserState: vi.fn(),
}))

vi.mock('../../../../src/modules/telegram-mentor/services/product/summary.js', () => ({
  resolveTelegramProductSummary: vi.fn(),
}))

vi.mock('@/products/ab-system/telegram/service.js', () => ({
  markAbTestZoomAttended: vi.fn(),
  markAbTestZoomRegistered: vi.fn(),
}))

vi.mock('@/modules/subscriptions/payments/business/service.js', () => ({
  schedulePostZoomBridge: vi.fn(),
  scheduleUpgradeOffer: vi.fn(),
}))

vi.mock('@/modules/users/runtime/resolveUserLifecycle.js', () => ({
  resolveUserLifecycle: vi.fn(),
}))

vi.mock('../../../../src/services/notifications/NotificationService.js', () => ({
  notificationService: {},
}))

vi.mock('../../../../src/services/notifications/NotificationEvent.js', () => ({
  NotificationEvent: {},
}))

vi.mock('../../../../src/lib/telegram.js', () => ({
  sendDedupedTelegramMessage: vi.fn(),
  sendOpsTelegramMessage: vi.fn(),
}))

vi.mock('../../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  EXCHANGE_PRICE: 0,
  getZoomExchangeAccessPolicy: vi.fn(),
}))

vi.mock('../../../../src/modules/zoom/api/routes.js', () => ({
  default: {},
}))

vi.mock('../../../../src/modules/zoom/index.js', () => ({
  assertCanBookGroupPracticeSession: vi.fn(),
  createZoomSession: vi.fn(),
  getCurrentWeekZoomOverview: vi.fn(),
  getPublicCurrentWeekZoomOverview: vi.fn(),
  getUserLatestWeeklyReportSummary: (...args: unknown[]) =>
    mockGetUserLatestWeeklyReportSummary(...args),
  getSessionById: vi.fn(),
  getSessionAttendees: vi.fn(),
  getUpcomingZoom: vi.fn(),
  getUpcomingZoomBookingView: vi.fn(),
  getZoomBookingNotificationContext: vi.fn(),
  getUserPreviousZoomSessionRecap: (...args: unknown[]) =>
    mockGetUserPreviousZoomSessionRecap(...args),
  markAttended: vi.fn(),
  registerAttendee: vi.fn(),
  saveBookingPreparationForAttendee: vi.fn(),
  saveBookingQuestionForAttendee: vi.fn(),
  savePostSessionReport: vi.fn(),
}))

vi.mock('../../../../src/modules/zoom/index.ts', () => ({
  assertCanBookGroupPracticeSession: vi.fn(),
  createZoomSession: vi.fn(),
  getCurrentWeekZoomOverview: vi.fn(),
  getPublicCurrentWeekZoomOverview: vi.fn(),
  getUserLatestWeeklyReportSummary: (...args: unknown[]) =>
    mockGetUserLatestWeeklyReportSummary(...args),
  getSessionById: vi.fn(),
  getSessionAttendees: vi.fn(),
  getUpcomingZoom: vi.fn(),
  getUpcomingZoomBookingView: vi.fn(),
  getZoomBookingNotificationContext: vi.fn(),
  getUserPreviousZoomSessionRecap: (...args: unknown[]) =>
    mockGetUserPreviousZoomSessionRecap(...args),
  markAttended: vi.fn(),
  registerAttendee: vi.fn(),
  saveBookingPreparationForAttendee: vi.fn(),
  saveBookingQuestionForAttendee: vi.fn(),
  savePostSessionReport: vi.fn(),
}))

describe('getMySessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns attendee sessions even when optional recap/report reads fail', async () => {
    const { getMySessions } = await import('../../../../src/modules/zoom/api/controller.ts')

    mockFindMany.mockResolvedValue([
      {
        id: 'attendee-1',
        session: {
          id: 'session-1',
          expertId: 'expert-1',
          scheduledAt: new Date('2026-08-27T16:00:00.000Z'),
          topic: 'Focus Group Practice',
          status: 'SCHEDULED',
          requests: [{ type: 'group_practice' }],
          postSessionReport: null,
          createdAt: new Date('2026-08-20T10:00:00.000Z'),
          updatedAt: new Date('2026-08-20T10:00:00.000Z'),
        },
      },
    ])
    mockGetUserPreviousZoomSessionRecap.mockRejectedValue(new Error('recap-failed'))
    mockGetUserLatestWeeklyReportSummary.mockRejectedValue(new Error('report-failed'))

    const req = {
      user: {
        id: 'user-1',
      },
    } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any
    const next = vi.fn()

    await getMySessions(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      sessions: [
        expect.objectContaining({
          id: 'session-1',
          attendeeId: 'attendee-1',
          scheduledAt: '2026-08-27T16:00:00.000Z',
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
          isRegistered: true,
        }),
      ],
      previousSessionRecap: null,
      latestWeeklyReport: null,
    })
  })
})
