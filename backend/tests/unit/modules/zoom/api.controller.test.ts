import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindMany = vi.fn()
const mockFindCancellationEvents = vi.fn()
const mockGetUserPreviousZoomSessionRecap = vi.fn()
const mockGetUserLatestWeeklyReportSummary = vi.fn()
const mockQuestionContext = vi.fn()
const mockSaveQuestion = vi.fn()
const mockSendOps = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    zoomSessionAttendee: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    event: {
      findMany: (...args: unknown[]) => mockFindCancellationEvents(...args),
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
  sendOpsTelegramMessage: (...args: unknown[]) => mockSendOps(...args),
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
  getZoomBookingNotificationContext: (...args: unknown[]) => mockQuestionContext(...args),
  getUserPreviousZoomSessionRecap: (...args: unknown[]) =>
    mockGetUserPreviousZoomSessionRecap(...args),
  markAttended: vi.fn(),
  registerAttendee: vi.fn(),
  saveBookingPreparationForAttendee: vi.fn(),
  saveBookingQuestionForAttendee: (...args: unknown[]) => mockSaveQuestion(...args),
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
  getZoomBookingNotificationContext: (...args: unknown[]) => mockQuestionContext(...args),
  getUserPreviousZoomSessionRecap: (...args: unknown[]) =>
    mockGetUserPreviousZoomSessionRecap(...args),
  markAttended: vi.fn(),
  registerAttendee: vi.fn(),
  saveBookingPreparationForAttendee: vi.fn(),
  saveBookingQuestionForAttendee: (...args: unknown[]) => mockSaveQuestion(...args),
  savePostSessionReport: vi.fn(),
}))

describe('question notification privacy', () => {
  it('persists the question but sends OPS only the fact and session context', async () => {
    const { saveBookingQuestion } = await import('../../../../src/modules/zoom/api/controller.ts')
    const question = 'private-question-marker'
    mockSaveQuestion.mockResolvedValue({ id: 'event-1', createdAt: new Date('2026-10-27T00:00:00Z') })
    mockQuestionContext.mockResolvedValue({
      session: { scheduledAt: new Date('2026-11-02T17:00:00Z') },
      displayName: 'Test', username: null, attendeesCount: 2,
      myQuestion: { text: question, position: 1 },
    })
    mockSendOps.mockResolvedValue(undefined)
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    const next = vi.fn()
    await saveBookingQuestion({ user: { id: 'user-1' }, body: { sessionId: 'session-1', questionText: question } } as never, res as never, next)
    await vi.waitFor(() => expect(mockSendOps).toHaveBeenCalledOnce())
    expect(mockSaveQuestion).toHaveBeenCalledWith('user-1', 'session-1', question)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(next).not.toHaveBeenCalled()
    expect(mockSendOps.mock.calls[0][0]).toContain('НОВЕ ПИТАННЯ ДО ZOOM')
    expect(JSON.stringify(mockSendOps.mock.calls[0])).not.toContain(question)
    expect(mockSendOps.mock.calls[0][2]).toMatchObject({ messageType: 'zoom_booking_question', source: 'zoom.controller' })
  })
})

describe('getMySessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindCancellationEvents.mockResolvedValue([])
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
          type: 'GROUP',
          requests: [{ type: 'group_practice' }],
          commerceRequests: [{ id: 'request-1', status: 'PAID' }],
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
    expect(mockFindCancellationEvents).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-1', type: 'ZOOM_BOOKING_CANCELLED' }),
    }))
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
          type: 'GROUP',
          commerceRequestId: 'request-1',
          commerceStatus: 'PAID',
        }),
      ],
      previousSessionRecap: null,
      latestWeeklyReport: null,
    })
  })

  it('does not expose a completed group practice coach report through the USER session-detail read path', async () => {
    const { getMySessions } = await import('../../../../src/modules/zoom/api/controller.ts')

    mockFindMany.mockResolvedValue([
      {
        id: 'attendee-1',
        session: {
          id: 'completed-group-1',
          expertId: 'expert-1',
          scheduledAt: new Date('2026-10-05T15:00:00.000Z'),
          topic: 'ФОКУС · Zoom-практика',
          status: 'COMPLETED',
          type: 'GROUP',
          requests: { type: 'group_practice' },
          commerceRequests: [],
          postSessionReport: {
            actualAttendeeCount: 5,
            topic: 'Причини відкладень дій',
            summary: 'Всі пройшли практику успішно',
          },
          createdAt: new Date('2026-10-01T10:00:00.000Z'),
          updatedAt: new Date('2026-10-05T16:00:00.000Z'),
        },
      },
    ])
    mockGetUserPreviousZoomSessionRecap.mockResolvedValue(null)
    mockGetUserLatestWeeklyReportSummary.mockResolvedValue(null)

    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
    await getMySessions({ user: { id: 'user-1' } } as any, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sessions: [expect.objectContaining({
        id: 'completed-group-1',
        topic: 'ФОКУС · Zoom-практика',
        postSessionReport: null,
      })],
    }))
  })
})
