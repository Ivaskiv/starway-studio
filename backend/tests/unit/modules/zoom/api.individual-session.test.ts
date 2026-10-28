import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrismaUserFindUnique = vi.fn()
const mockPrismaZoomSessionFindUnique = vi.fn()
const mockPrismaZoomSessionFindMany = vi.fn()
const mockPrismaZoomSessionAttendeeFindMany = vi.fn()
const mockPrismaZoomSessionAttendeeDeleteMany = vi.fn()
const mockCreateFullSession = vi.fn()
const mockRegisterAttendee = vi.fn()
const mockUpdateSession = vi.fn()
const mockGetCalendarSessions = vi.fn()
const mockSendOpsTelegramMessage = vi.fn()
const mockAfterZoomOperation = vi.fn()
const mockNotifyBattleCreatedByCoach = vi.fn()
const mockLogBattleProgress = vi.fn()
const mockSetBattleGoal = vi.fn()
const mockGetQuestionSummariesBySessionId = vi.fn()
const mockCreateCommerceRequest = vi.fn()
const mockApproveCommerceRequest = vi.fn()
const mockGetCommerceCalendarRequests = vi.fn()
const mockGetUserCalendarRequestsForWindow = vi.fn()
const mockGetIndividualCheckoutUrl = vi.fn()
const mockCreateUserIndividualRequest = vi.fn()
const mockNotifyPrivateSessionRequest = vi.fn()
const mockPrismaCheckoutSessionFindFirst = vi.fn()
const mockPrismaEventFindMany = vi.fn()
const mockGetIndividualAvailabilityForScheduledAt = vi.fn()
const mockGetIndividualAvailabilitySummary = vi.fn()
const mockGetAvailability = vi.fn()
const mockGetAvailabilityWeek = vi.fn()
const mockSaveAvailabilityWeek = vi.fn()
const mockDeleteFreeIndividualSlot = vi.fn()
const mockGetEligibleBattleOpponents = vi.fn()
const mockAppendFile = vi.fn()
const mockLoggerInfo = vi.fn()

vi.mock('node:fs/promises', () => ({
  appendFile: (...args: unknown[]) => mockAppendFile(...args),
}))

vi.mock('../../../../src/utils/logger.js', () => ({
  logger: { info: (...args: unknown[]) => mockLoggerInfo(...args) },
}))

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    },
    zoomSession: {
      findUnique: (...args: unknown[]) => mockPrismaZoomSessionFindUnique(...args),
      findMany: (...args: unknown[]) => mockPrismaZoomSessionFindMany(...args),
    },
    zoomSessionAttendee: {
      findMany: (...args: unknown[]) => mockPrismaZoomSessionAttendeeFindMany(...args),
      deleteMany: (...args: unknown[]) => mockPrismaZoomSessionAttendeeDeleteMany(...args),
    },
    checkoutSession: {
      findFirst: (...args: unknown[]) => mockPrismaCheckoutSessionFindFirst(...args),
    },
    event: {
      findMany: (...args: unknown[]) => mockPrismaEventFindMany(...args),
    },
  },
}))

vi.mock('../../../../src/lib/telegram.js', () => ({
  bot: {},
  sendOpsTelegramMessage: (...args: unknown[]) =>
    Promise.resolve(mockSendOpsTelegramMessage(...args)),
}))

vi.mock('../../../../src/modules/zoom/core/zoom.operations.service.js', () => ({
  afterZoomOperation: (...args: unknown[]) => mockAfterZoomOperation(...args),
}))

vi.mock('../../../../src/modules/zoom/core/zoom.session.service.js', () => ({
  deleteFreeIndividualSlot: (...args: unknown[]) => mockDeleteFreeIndividualSlot(...args),
}))

vi.mock('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js')>(),
  getCommerceCheckoutUrl: (...args: unknown[]) => mockGetIndividualCheckoutUrl(...args),
  getExistingIndividualCheckoutUrl: (...args: unknown[]) => mockGetIndividualCheckoutUrl(...args),
  createRequest: (...args: unknown[]) => mockCreateCommerceRequest(...args),
  createUserIndividualRequest: (...args: unknown[]) => mockCreateUserIndividualRequest(...args),
  approveRequest: (...args: unknown[]) => mockApproveCommerceRequest(...args),
  getCalendarRequests: (...args: unknown[]) => mockGetCommerceCalendarRequests(...args),
  getUserCalendarRequestsForWindow: (...args: unknown[]) => mockGetUserCalendarRequestsForWindow(...args),
  getRequestById: vi.fn(),
  rejectRequest: vi.fn(),
}))

vi.mock('../../../../src/modules/zoom/private/zoom.private-booking.service.js', () => ({
  notifyAssignedPrivateSession: () => Promise.resolve(),
  notifyPrivateSessionRequest: (...args: unknown[]) => Promise.resolve(mockNotifyPrivateSessionRequest(...args)),
}))

vi.mock('../../../../src/modules/zoom/booking/zoom.availability.service.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../src/modules/zoom/booking/zoom.availability.service.js')>(),
  getIndividualAvailabilityForScheduledAt: (...args: unknown[]) => mockGetIndividualAvailabilityForScheduledAt(...args),
  getIndividualAvailabilitySummary: (...args: unknown[]) => mockGetIndividualAvailabilitySummary(...args),
  getAvailability: (...args: unknown[]) => mockGetAvailability(...args),
  getAvailabilityWeek: (...args: unknown[]) => mockGetAvailabilityWeek(...args),
  saveAvailabilityWeek: (...args: unknown[]) => mockSaveAvailabilityWeek(...args),
}))

vi.mock('../../../../src/modules/zoom/reports/zoom.reports.service.js', () => ({
  getQuestionSummariesBySessionId: (...args: unknown[]) =>
    mockGetQuestionSummariesBySessionId(...args),
}))

vi.mock('../../../../src/modules/zoom/index.js', () => ({
  createFullSession: (...args: unknown[]) => mockCreateFullSession(...args),
  registerAttendee: (...args: unknown[]) => mockRegisterAttendee(...args),
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
  getCalendarSessions: async (...args: unknown[]) => {
    const rows = await mockGetCalendarSessions(...args)
    const input = args[0] as { role?: string; expertId?: string }
    return input.role === 'coach' && Array.isArray(rows)
      ? rows.map((row) => ({ expertId: input.expertId, ...row }))
      : rows
  },
}))

vi.mock('../../../../src/modules/zoom/battle/battle.service.js', () => ({
  acceptBattle: vi.fn(),
  declineBattle: vi.fn(),
  getEligibleBattleOpponents: (...args: unknown[]) => mockGetEligibleBattleOpponents(...args),
  logBattleProgress: (...args: unknown[]) => mockLogBattleProgress(...args),
  notifyBattleCreatedByCoach: (...args: unknown[]) => mockNotifyBattleCreatedByCoach(...args),
  recordBattleResult: vi.fn(),
  setBattleGoal: (...args: unknown[]) => mockSetBattleGoal(...args),
}))

import {
  handleCreateSession,
  handleDeleteFreeIndividualSlot,
  handleCreateUserIndividualRequest,
  handleApproveCommerceRequest,
  handleGetCalendarSessions,
  handleGetIndividualAvailabilitySummary,
  handleGetAvailabilityWeek,
  handleInitiateBattle,
  handleLogBattleProgress,
  handleSetBattleGoal,
  handleSaveAvailabilityWeek,
  handleUpdateSession,
} from '../../../../src/modules/zoom/api/zoom.admin.handler.js'

function createResponse() {
  const finishListeners = new Map<string, () => void>()
  const response = {
    statusCode: 200,
    status: vi.fn((statusCode: number) => {
      response.statusCode = statusCode
      return response
    }),
    json: vi.fn().mockReturnThis(),
    once: vi.fn((event: string, listener: () => void) => {
      finishListeners.set(event, listener)
      return response
    }),
    finish: () => finishListeners.get('finish')?.(),
  }
  return response
}

function createRequest(body: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'coach-user-1',
    },
    body,
    params: {},
    query: {},
  } as never
}

describe('zoom session participant contract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPrismaUserFindUnique.mockResolvedValue({ expertId: 'expert-1' })
    mockPrismaZoomSessionFindMany.mockResolvedValue([])
    mockAfterZoomOperation.mockResolvedValue(undefined)
    mockGetQuestionSummariesBySessionId.mockResolvedValue(new Map())
    mockCreateCommerceRequest.mockResolvedValue({ id: 'commerce-1', status: 'REQUESTED' })
    mockGetCommerceCalendarRequests.mockResolvedValue([])
    mockGetUserCalendarRequestsForWindow.mockResolvedValue([])
    mockPrismaEventFindMany.mockResolvedValue([])
    mockCreateUserIndividualRequest.mockResolvedValue({
      request: { id: 'commerce-1', status: 'REQUESTED' },
      session: { id: 'session-1' },
      duplicate: false,
    })
    mockApproveCommerceRequest.mockResolvedValue({
      request: { id: 'commerce-1', status: 'APPROVED_PENDING_PAYMENT' },
      checkoutUrl: 'https://checkout.example/commerce-1',
    })
    mockGetIndividualAvailabilityForScheduledAt.mockResolvedValue({
      candidate: { available: true, reason: null },
      alternatives: [],
    })
    mockGetIndividualAvailabilitySummary.mockResolvedValue([])
    mockGetAvailability.mockResolvedValue([{
      id: 'thu-group', dayOfWeek: 4, hour: 13, minute: 0,
      timezone: 'Europe/Kyiv', sessionType: 'group_practice', maxSlots: 50,
      priceCents: 0, durationMinutes: 60, active: true,
    }])
    mockGetAvailabilityWeek.mockResolvedValue([])
    mockSaveAvailabilityWeek.mockResolvedValue(undefined)
    mockDeleteFreeIndividualSlot.mockResolvedValue({ id: 'free-slot-1' })
    mockGetEligibleBattleOpponents.mockResolvedValue([])
    mockAppendFile.mockResolvedValue(undefined)
  })

  it('binds group questions to attendee user IDs only for the owning coach and hides other questions from users', async () => {
    const row = { id: 'group-owned', expertId: 'expert-1', scheduledAt: new Date('2099-11-02T17:00:00Z'), topic: 'Практика', status: 'SCHEDULED', requests: { type: 'group_practice' }, attendees: [
      { userId: 'a', user: { firstName: 'А', lastName: null, email: null }, goalText: null, progress: [] },
      { userId: 'b', user: { firstName: 'Б', lastName: null, email: null }, goalText: null, progress: [] },
      { userId: 'c', user: { firstName: 'В', lastName: null, email: null }, goalText: null, progress: [] },
    ], _count: { attendees: 3 } }
    mockGetCalendarSessions.mockResolvedValue([row])
    mockGetQuestionSummariesBySessionId.mockResolvedValue(new Map([['group-owned', { questionPreviews: ['питання B', 'питання A'], questionsCount: 2, remainingQuestionsCount: 0, myQuestion: { text: 'питання A', position: 1 }, questionsByUser: new Map([['a', 'питання A'], ['b', 'питання B']]) }]]))
    const request = (role: string, id: string) => ({ user: { id }, query: { from: '2099-11-01T00:00:00Z', to: '2099-11-30T00:00:00Z', role } })
    const coach = createResponse()
    await handleGetCalendarSessions(request('coach', 'coach-user-1') as never, coach as never, vi.fn())
    expect(coach.json.mock.calls[0][0][0].attendees).toEqual([
      expect.objectContaining({ userId: 'a', question: 'питання A' }),
      expect.objectContaining({ userId: 'b', question: 'питання B' }),
      expect.objectContaining({ userId: 'c', question: null }),
    ])
    const user = createResponse()
    await handleGetCalendarSessions(request('user', 'a') as never, user as never, vi.fn())
    expect(JSON.stringify(user.json.mock.calls[0][0])).not.toContain('питання B')
    const foreignCoach = createResponse()
    mockPrismaUserFindUnique.mockResolvedValue({ expertId: 'expert-2' })
    await handleGetCalendarSessions(request('coach', 'foreign') as never, foreignCoach as never, vi.fn())
    expect(JSON.stringify(foreignCoach.json.mock.calls[0][0])).not.toContain('питання A')
    expect(foreignCoach.json.mock.calls[0][0]).toEqual([])
  })

  it('preserves approval conflict responses and emits a redacted development diagnostic', async () => {
    const response = createResponse()
    const next = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    mockApproveCommerceRequest.mockRejectedValue(new Error('COMMERCE_SLOT_OCCUPIED'))

    try {
      await handleApproveCommerceRequest(createRequest({}) as never, response as never, next)

      expect(response.status).toHaveBeenCalledWith(409)
      expect(response.json).toHaveBeenCalledWith({ error: 'COMMERCE_SLOT_OCCUPIED' })
      expect(next).not.toHaveBeenCalled()
      expect(consoleError).toHaveBeenCalledWith(
        '[ZOOM_COMMERCE_APPROVAL_FAILED]',
        expect.stringContaining('"errorCode":"COMMERCE_SLOT_OCCUPIED"'),
      )
      expect(mockAppendFile).toHaveBeenCalledWith(
        '/tmp/starway-zoom-commerce-approval-error.log',
        expect.stringContaining('"httpStatus":409'),
        'utf8',
      )
    } finally {
      process.env.NODE_ENV = previousNodeEnv
      consoleError.mockRestore()
    }
  })

  it('serves one bounded individual availability summary for the authenticated expert', async () => {
    const response = createResponse()
    const summary = [{ date: '2026-09-21', hasIndividualWindow: true, availableCount: 4, hasAvailableIndividual: true }]
    mockGetIndividualAvailabilitySummary.mockResolvedValue(summary)

    await handleGetIndividualAvailabilitySummary(
      { user: { id: 'user-auth' }, query: { from: '2026-09-21', to: '2026-10-01' } } as never,
      response as never,
      vi.fn(),
    )

    expect(mockGetIndividualAvailabilitySummary).toHaveBeenCalledWith({
      expertId: 'expert-1', from: '2026-09-21', to: '2026-10-01',
    })
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith(summary)
  })

  it('scopes week GET and PUT to the authenticated user expert', async () => {
    const response = createResponse()
    const days = [{ date: '2026-09-28', source: 'recurring', hasOverride: false, windows: [] }]
    mockGetAvailabilityWeek.mockResolvedValue(days)
    await handleGetAvailabilityWeek(
      { user: { id: 'coach-user-1' }, query: { from: '2026-09-28' } } as never,
      response as never,
      vi.fn(),
    )
    expect(mockGetAvailabilityWeek).toHaveBeenCalledWith('expert-1', '2026-09-28')
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith(days)

    const saveResponse = createResponse()
    const change = { date: '2026-09-28', windows: [] }
    await handleSaveAvailabilityWeek(
      { user: { id: 'coach-user-1' }, body: { from: '2026-09-28', days: [change] } } as never,
      saveResponse as never,
      vi.fn(),
    )
    expect(mockSaveAvailabilityWeek).toHaveBeenCalledWith({ expertId: 'expert-1', from: '2026-09-28', days: [change] })
    expect(saveResponse.status).toHaveBeenCalledWith(200)
  })

  it('lets only an authenticated coach delete a free individual slot through the canonical boundary', async () => {
    const response = createResponse()

    await handleDeleteFreeIndividualSlot(
      { user: { id: 'coach-user-1' }, params: { id: 'free-slot-1' } } as never,
      response as never,
      vi.fn(),
    )

    expect(mockDeleteFreeIndividualSlot).toHaveBeenCalledWith({
      sessionId: 'free-slot-1', expertId: 'expert-1',
    })
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith({ id: 'free-slot-1' })

    const nonCoachResponse = createResponse()
    mockPrismaUserFindUnique.mockResolvedValueOnce({ expertId: null })
    await handleDeleteFreeIndividualSlot(
      { user: { id: 'user-1' }, params: { id: 'free-slot-1' } } as never,
      nonCoachResponse as never,
      vi.fn(),
    )
    expect(nonCoachResponse.status).toHaveBeenCalledWith(403)
    expect(nonCoachResponse.json).toHaveBeenCalledWith({ error: 'forbidden' })
    expect(mockDeleteFreeIndividualSlot).toHaveBeenCalledTimes(1)
  })

  it('rejects an initiation target outside the canonical eligible-opponents result', async () => {
    const response = createResponse()

    await handleInitiateBattle(
      {
        user: { id: 'user-1' },
        body: { challengerId: 'user-1', opponentId: 'user-2' },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(mockGetEligibleBattleOpponents).toHaveBeenCalledWith({
      userId: 'user-1', expertId: 'expert-1',
    })
    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith({ error: 'opponent_not_eligible' })
  })

  it('rejects an individual session without exactly one selected user', async () => {
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Індивідуальна сесія',
        type: 'individual',
      }),
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      error: 'participant_required',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
  })

  it('uses the authenticated user for a new individual request', async () => {
    const response = createResponse()

    await handleCreateUserIndividualRequest(
      {
        user: { id: 'user-auth' },
        body: {
          requesterUserId: 'spoofed-user',
          scheduledAt: '2026-10-10T10:00:00.000Z',
          questionText: 'Потрібен розбір.',
        },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(mockCreateUserIndividualRequest).toHaveBeenCalledWith({
      requesterUserId: 'user-auth',
      scheduledAt: new Date('2026-10-10T10:00:00.000Z'),
      questionText: 'Потрібен розбір.',
    })
    expect(response.status).toHaveBeenCalledWith(201)
  })

  it('keeps commerce slot rejection on the USER individual request flow', async () => {
    const unavailable = Object.assign(new Error('COMMERCE_SLOT_UNAVAILABLE'), {
      alternatives: [{ scheduledAt: '2026-10-10T11:00:00.000Z', available: true }],
    })
    mockCreateUserIndividualRequest.mockRejectedValueOnce(unavailable)
    const response = createResponse()

    await handleCreateUserIndividualRequest(
      {
        user: { id: 'user-auth' },
        body: {
          scheduledAt: '2026-10-10T10:00:00.000Z',
          questionText: 'Потрібен розбір.',
        },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(409)
    expect(response.json).toHaveBeenCalledWith({
      error: 'COMMERCE_SLOT_UNAVAILABLE',
      message: 'Цей час уже зайнятий. Обери інший доступний час.',
      alternatives: [{ scheduledAt: '2026-10-10T11:00:00.000Z', available: true }],
    })
  })

  it('rejects an individual session with more than one selected user', async () => {
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Індивідуальна сесія',
        type: 'individual',
        participantUserIds: ['user-1', 'user-2'],
      }),
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      error: 'participant_single_required',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
  })

  it('creates an individual session with one selected attendee', async () => {
    mockCreateFullSession.mockResolvedValue({ id: 'session-1' })
    mockRegisterAttendee.mockResolvedValue({ id: 'attendee-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ expertId: 'expert-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ id: 'user-1' })

    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Індивідуальна сесія',
        type: 'individual',
        participantUserId: 'user-1',
      }),
      response as never,
      vi.fn(),
    )

    expect(mockCreateFullSession).toHaveBeenCalledTimes(1)
    expect(mockCreateFullSession).toHaveBeenCalledWith(
      expect.objectContaining({
        expertId: 'expert-1',
        topic: 'Індивідуальна сесія',
        requests: expect.objectContaining({
          type: 'individual',
          maxAttendees: 1,
        }),
      }),
      { suppressAutomation: true },
    )
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
    expect(mockCreateCommerceRequest).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'INDIVIDUAL', requesterUserId: 'user-1', zoomSessionId: 'session-1',
      amount: 1, currency: 'UAH',
    }))
    expect(mockApproveCommerceRequest).toHaveBeenCalledWith('commerce-1', 'expert-1')
    expect(response.status).toHaveBeenCalledWith(201)
  })

  it('rejects an overlapping individual attendee session before persistence', async () => {
    mockPrismaUserFindUnique.mockResolvedValueOnce({ expertId: 'expert-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ id: 'user-1' })
    mockPrismaZoomSessionFindMany.mockResolvedValueOnce([
      {
        scheduledAt: new Date('2026-09-10T10:30:00.000Z'),
        requests: { type: 'individual', durationMinutes: 60 },
      },
    ])
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Індивідуальна сесія',
        type: 'individual',
        participantUserId: 'user-1',
      }),
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(409)
    expect(response.json).toHaveBeenCalledWith({
      error: 'user_session_conflict',
      message: 'Цей учасник уже має Zoom-сесію на вибраний час. Оберіть інший час.',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
  })

  it('creates a coach individual session even when commerce request availability would not expose that slot', async () => {
    mockGetIndividualAvailabilityForScheduledAt.mockResolvedValueOnce({
      candidate: { available: false, reason: 'Час уже заброньований' },
      alternatives: [],
    })
    mockCreateFullSession.mockResolvedValue({ id: 'session-1' })
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Індивідуальна сесія',
        type: 'individual',
        participantUserId: 'user-1',
      }),
      response as never,
      vi.fn(),
    )

    expect(mockGetIndividualAvailabilityForScheduledAt).not.toHaveBeenCalled()
    expect(mockCreateFullSession).toHaveBeenCalledTimes(1)
    expect(response.status).toHaveBeenCalledWith(201)
  })

  it('rejects an overlapping coach session before persistence', async () => {
    mockPrismaZoomSessionFindMany.mockResolvedValueOnce([
      {
        scheduledAt: new Date('2026-09-10T10:30:00.000Z'),
        requests: { type: 'group_practice', durationMinutes: 60 },
      },
    ])
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Групова практика',
        type: 'group_practice',
      }),
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(409)
    expect(response.json).toHaveBeenCalledWith({
      error: 'coach_session_conflict',
      message: 'На цей час уже запланована інша Zoom-сесія. Оберіть інший час.',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
  })

  it('rejects an overlapping battle participant before persistence', async () => {
    mockPrismaUserFindUnique.mockResolvedValueOnce({ expertId: 'expert-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ id: 'user-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ id: 'user-2' })
    mockPrismaZoomSessionFindMany.mockResolvedValueOnce([
      {
        scheduledAt: new Date('2026-09-10T10:30:00.000Z'),
        requests: { type: 'battle_review', durationMinutes: 60 },
      },
    ])
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Battle Review',
        type: 'battle_review',
        participantUserIds: ['user-1', 'user-2'],
      }),
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(409)
    expect(response.json).toHaveBeenCalledWith({
      error: 'user_session_conflict',
      message: 'Цей учасник уже має Zoom-сесію на вибраний час. Оберіть інший час.',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
    expect(mockNotifyBattleCreatedByCoach).not.toHaveBeenCalled()
  })

  it('keeps the same attendee when editing an individual session', async () => {
    mockPrismaZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      type: 'GROUP',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      requests: {
        type: 'individual',
        zoomLink: '',
        productId: null,
        maxAttendees: 1,
        notify24h: true,
        notify2h: true,
        notifiedAt24h: null,
        notifiedAt2h: null,
      },
    })
    mockPrismaZoomSessionAttendeeFindMany.mockResolvedValue([
      { userId: 'user-1' },
    ])
    mockUpdateSession.mockResolvedValue({ id: 'session-1' })

    const response = createResponse()

    await handleUpdateSession(
      {
        ...createRequest({
          participantUserId: 'user-1',
        }),
        params: { id: 'session-1' },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(mockPrismaZoomSessionAttendeeDeleteMany).not.toHaveBeenCalled()
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
    expect(mockUpdateSession).toHaveBeenCalledTimes(1)
    expect(response.status).toHaveBeenCalledWith(200)
  })

  it('rejects a battle session without selected users', async () => {
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Battle Review',
        type: 'battle_review',
      }),
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      error: 'battle_participants_two_required',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
  })

  it('rejects a battle session with one selected user', async () => {
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Battle Review',
        type: 'battle_review',
        participantUserIds: ['user-1'],
      }),
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      error: 'battle_participants_two_required',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
  })

  it('rejects a battle session above the existing two-participant battle contract', async () => {
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Battle Review',
        type: 'battle_review',
        participantUserIds: ['user-1', 'user-2', 'user-3'],
      }),
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      error: 'battle_participants_two_required',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
  })

  it('rejects a battle session with the same user selected twice', async () => {
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Battle Review',
        type: 'battle_review',
        participantUserIds: ['user-1', 'user-1'],
      }),
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      error: 'battle_participants_two_required',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
  })

  it('creates a battle session with two attendees through ZoomSessionAttendee', async () => {
    mockCreateFullSession.mockResolvedValue({ id: 'battle-session-1' })
    mockRegisterAttendee.mockResolvedValue({ id: 'attendee-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ expertId: 'expert-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ id: 'user-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ id: 'user-2' })

    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Battle Review',
        type: 'battle_review',
        participantUserIds: ['user-1', 'user-2'],
      }),
      response as never,
      vi.fn(),
    )

    expect(mockCreateFullSession).toHaveBeenCalledWith(
      expect.objectContaining({
        requests: expect.objectContaining({
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
        }),
      }),
      { suppressAutomation: true },
    )
    expect(mockRegisterAttendee).toHaveBeenCalledWith('user-1', 'battle-session-1')
    expect(mockRegisterAttendee).toHaveBeenCalledWith('user-2', 'battle-session-1')
    expect(mockRegisterAttendee).toHaveBeenCalledTimes(2)
    expect(mockNotifyBattleCreatedByCoach).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'battle-session-1' }),
    )
    expect(response.status).toHaveBeenCalledWith(201)
  })

  it('keeps the same battle attendees when editing an existing battle session', async () => {
    mockPrismaZoomSessionFindUnique.mockResolvedValue({
      id: 'battle-session-1',
      type: 'GROUP',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      requests: {
        type: 'battle_review',
        zoomLink: '',
        productId: null,
        maxAttendees: null,
        notify24h: true,
        notify2h: true,
        notifiedAt24h: null,
        notifiedAt2h: null,
        battleStatus: 'active',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })
    mockPrismaZoomSessionAttendeeFindMany.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
    ])
    mockPrismaUserFindUnique.mockResolvedValueOnce({ expertId: 'expert-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ id: 'user-1' })
    mockPrismaUserFindUnique.mockResolvedValueOnce({ id: 'user-2' })
    mockUpdateSession.mockResolvedValue({ id: 'battle-session-1' })

    const response = createResponse()

    await handleUpdateSession(
      {
        ...createRequest({
          topic: 'Battle Review updated',
        }),
        params: { id: 'battle-session-1' },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(mockPrismaZoomSessionAttendeeDeleteMany).not.toHaveBeenCalled()
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
    expect(mockUpdateSession).toHaveBeenCalledWith(
      'battle-session-1',
      expect.objectContaining({
        topic: 'Battle Review updated',
        requests: expect.objectContaining({
          type: 'battle_review',
          challengerId: 'user-1',
          opponentId: 'user-2',
        }),
      }),
    )
    expect(response.status).toHaveBeenCalledWith(200)
  })

  it('leaves group session participant behavior unchanged', async () => {
    mockCreateFullSession.mockResolvedValue({ id: 'group-session-1' })
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T10:00:00.000Z',
        topic: 'Групова практика',
        type: 'group_practice',
        maxAttendees: 50,
      }),
      response as never,
      vi.fn(),
    )

    expect(mockCreateFullSession).toHaveBeenCalledWith(
      expect.objectContaining({
        requests: expect.objectContaining({
          type: 'group_practice',
          maxAttendees: 50,
        }),
      }),
      undefined,
    )
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
    expect(response.status).toHaveBeenCalledWith(201)
  })

  it('rejects a group practice outside the coach normal schedule before persistence', async () => {
    mockCreateFullSession.mockResolvedValue({ id: 'group-session-1' })
    const response = createResponse()

    await handleCreateSession(
      createRequest({
        scheduledAt: '2026-09-10T09:00:00.000Z',
        topic: 'Групова практика',
        type: 'group_practice',
        maxAttendees: 50,
      }),
      response as never,
      vi.fn(),
    )

    expect(mockGetAvailability).toHaveBeenCalledWith('expert-1')
    expect(response.status).toHaveBeenCalledWith(409)
    expect(response.json).toHaveBeenCalledWith({
      error: 'group_schedule_unavailable',
      message: 'Час групової практики не відповідає звичному графіку коуча.',
    })
    expect(mockCreateFullSession).not.toHaveBeenCalled()
  })

  it('binds Battle progress writes to authenticated user, not request body userId', async () => {
    mockLogBattleProgress.mockResolvedValue({ id: 'battle-session-1' })
    const response = createResponse()

    await handleLogBattleProgress(
      {
        user: { id: 'user-1' },
        params: { sessionId: 'battle-session-1' },
        body: {
          userId: 'user-2',
          day: 1,
          text: 'Мій прогрес',
        },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(mockLogBattleProgress).toHaveBeenCalledWith({
      sessionId: 'battle-session-1',
      userId: 'user-1',
      day: 1,
      text: 'Мій прогрес',
    })
    expect(response.status).toHaveBeenCalledWith(200)
  })

  it('binds Battle goal writes to authenticated attendee', async () => {
    mockSetBattleGoal.mockResolvedValue({ id: 'battle-session-1' })
    const response = createResponse()

    await handleSetBattleGoal(
      {
        user: { id: 'user-1' },
        params: { sessionId: 'battle-session-1' },
        body: {
          userId: 'user-2',
          goalText: 'Моя ціль',
        },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(mockSetBattleGoal).toHaveBeenCalledWith({
      sessionId: 'battle-session-1',
      userId: 'user-1',
      goalText: 'Моя ціль',
    })
    expect(response.status).toHaveBeenCalledWith(200)
  })

  it('maps Coach Battle goal/progress from ZoomSessionAttendee rows by challenger/opponent ids', async () => {
    mockGetCalendarSessions.mockResolvedValue([
      {
        id: 'battle-session-1',
        scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
        topic: 'Battle Review',
        status: 'ACTIVE',
        requests: {
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
          goalA: 'legacy stale A',
          goalB: 'legacy stale B',
          progress: { 'user-1': [{ day: 1, text: 'legacy', createdAt: 'old' }] },
        },
        attendees: [
          {
            userId: 'user-2',
            goalText: 'Ціль B',
            progress: [{ day: 1, text: 'B', createdAt: '2026-09-10T10:00:00.000Z' }],
          },
          {
            userId: 'user-1',
            goalText: 'Ціль A',
            progress: [
              { day: 1, text: 'A1', createdAt: '2026-09-10T10:00:00.000Z' },
              { day: 2, text: 'A2', createdAt: '2026-09-11T10:00:00.000Z' },
            ],
          },
        ],
        _count: { attendees: 2 },
        isMyBooking: false,
      },
    ])
    const response = createResponse()

    await handleGetCalendarSessions(
      {
        user: { id: 'coach-user-1' },
        query: {
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-09-30T23:59:59.000Z',
          role: 'coach',
        },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({
        goalText: null,
        goalA: 'Ціль A',
        goalB: 'Ціль B',
        progressA: 2,
        progressB: 1,
      }),
    ])
  })

  it('maps USER Battle goal/progress only from the authenticated attendee row', async () => {
    mockGetCalendarSessions.mockResolvedValue([
      {
        id: 'battle-session-1',
        scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
        topic: 'Battle Review',
        status: 'ACTIVE',
        requests: {
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
          goalA: 'legacy stale A',
        },
        attendees: [
          {
            userId: 'user-1',
            goalText: 'Ціль A',
            progress: [{ day: 1, text: 'A', createdAt: '2026-09-10T10:00:00.000Z' }],
          },
          {
            userId: 'user-2',
            goalText: 'Ціль B',
            progress: [{ day: 1, text: 'B', createdAt: '2026-09-10T10:00:00.000Z' }],
          },
        ],
        _count: { attendees: 2 },
        isMyBooking: true,
      },
    ])
    const response = createResponse()

    await handleGetCalendarSessions(
      {
        user: { id: 'user-2' },
        query: {
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-09-30T23:59:59.000Z',
          role: 'user',
        },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({
        goalText: 'Ціль B',
        battleProgress: [{ day: 1, text: 'B', createdAt: '2026-09-10T10:00:00.000Z' }],
        goalA: 'Ціль A',
        goalB: 'Ціль B',
      }),
    ])
  })

  it('projects a registered user\'s saved group-practice question after a calendar reload', async () => {
    mockGetCalendarSessions.mockResolvedValue([
      {
        id: 'group-session-1',
        scheduledAt: new Date('2026-10-26T17:00:00.000Z'),
        topic: 'ФОКУС · Zoom-практика',
        status: 'SCHEDULED',
        requests: { type: 'group_practice' },
        attendees: [{ userId: 'user-1', goalText: null, progress: [] }],
        _count: { attendees: 1 },
        isMyBooking: true,
      },
    ])
    mockGetQuestionSummariesBySessionId.mockResolvedValue(new Map([
      ['group-session-1', {
        questionPreviews: ['Як підготуватися?'],
        questionsCount: 1,
        remainingQuestionsCount: 0,
        myQuestion: { text: 'Як підготуватися?', position: 1 },
      }],
    ]))
    const response = createResponse()

    await handleGetCalendarSessions(
      {
        user: { id: 'user-1' },
        query: {
          from: '2026-10-20T00:00:00.000Z',
          to: '2026-10-31T23:59:59.000Z',
          role: 'user',
        },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(mockGetQuestionSummariesBySessionId).toHaveBeenCalledWith(
      ['group-session-1'],
      'user-1',
    )
    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'group-session-1',
        isMyBooking: true,
        myQuestion: { text: 'Як підготуватися?', position: 1 },
      }),
    ])
  })

  it('projects reschedule history only for the owning coach while keeping distinct sessions', async () => {
    mockGetCalendarSessions.mockResolvedValue([
      { id: 'moved', expertId: 'expert-1', scheduledAt: new Date('2026-10-27T17:00:00Z'), topic: 'Практика', status: 'SCHEDULED', requests: { type: 'group_practice', previousScheduledAt: '2026-11-02T17:00:00.000Z' }, attendees: [], _count: { attendees: 0 } },
      { id: 'ordinary', expertId: 'expert-1', scheduledAt: new Date('2026-10-26T17:00:00Z'), topic: 'Практика', status: 'SCHEDULED', requests: { type: 'group_practice' }, attendees: [], _count: { attendees: 0 } },
      { id: 'foreign', expertId: 'expert-2', scheduledAt: new Date('2026-10-28T17:00:00Z'), topic: 'Практика', status: 'SCHEDULED', requests: { type: 'group_practice', previousScheduledAt: '2026-11-03T17:00:00.000Z' }, attendees: [], _count: { attendees: 0 } },
    ])
    mockPrismaEventFindMany.mockResolvedValue([{ id: `zoom-group-practice-rescheduled:moved:${new Date('2026-11-02T17:00:00.000Z').getTime()}:${new Date('2026-10-27T17:00:00Z').getTime()}`, createdAt: new Date('2026-10-27T14:52:56.000Z') }])
    const response = createResponse()
    await handleGetCalendarSessions({ user: { id: 'coach-user-1' }, query: { from: '2026-10-01T00:00:00Z', to: '2026-11-30T23:59:59Z', role: 'coach' } } as never, response as never, vi.fn())
    const byId = new Map((response.json.mock.calls[0]?.[0] as Array<Record<string, unknown>>).map((session) => [session.id, session]))
    expect(byId.size).toBe(2)
    expect(byId.get('moved')).toMatchObject({ previousScheduledAt: '2026-11-02T17:00:00.000Z', rescheduledAt: '2026-10-27T14:52:56.000Z' })
    expect(byId.get('ordinary')).not.toHaveProperty('previousScheduledAt')
    expect(byId.has('foreign')).toBe(false)
    mockPrismaEventFindMany.mockResolvedValue([])
    const missingAudit = createResponse()
    await handleGetCalendarSessions({ user: { id: 'coach-user-1' }, query: { from: '2026-10-01T00:00:00Z', to: '2026-11-30T23:59:59Z', role: 'coach' } } as never, missingAudit as never, vi.fn())
    expect(missingAudit.json.mock.calls[0][0][0]).toMatchObject({ previousScheduledAt: '2026-11-02T17:00:00.000Z', rescheduledAt: null })
  })

  it('projects only the immediate prior time of an enrolled USER\'s future rescheduled Group Practice', async () => {
    mockGetCalendarSessions.mockResolvedValue([
      {
        id: 'own-rescheduled-group', scheduledAt: new Date('2026-11-02T18:00:00.000Z'), topic: 'ФОКУС',
        status: 'SCHEDULED', requests: { type: 'group_practice', previousScheduledAt: '2026-10-26T18:00:00.000Z' },
        attendees: [{ userId: 'user-1', goalText: null, progress: [] }], _count: { attendees: 1 }, isMyBooking: true,
      },
      {
        id: 'foreign-rescheduled-group', scheduledAt: new Date('2026-11-02T18:00:00.000Z'), topic: 'ФОКУС',
        status: 'SCHEDULED', requests: { type: 'group_practice', previousScheduledAt: '2026-10-26T18:00:00.000Z' },
        attendees: [{ userId: 'user-2', goalText: null, progress: [] }], _count: { attendees: 1 }, isMyBooking: false,
      },
      {
        id: 'twice-rescheduled-group', scheduledAt: new Date('2026-11-09T18:00:00.000Z'), topic: 'ФОКУС',
        status: 'SCHEDULED', requests: {
          type: 'group_practice',
          previousScheduledAt: '2026-11-02T18:00:00.000Z',
          rescheduleHistory: [
            { oldScheduledAt: '2026-10-26T18:00:00.000Z', newScheduledAt: '2026-11-02T18:00:00.000Z' },
            { oldScheduledAt: '2026-11-02T18:00:00.000Z', newScheduledAt: '2026-11-09T18:00:00.000Z' },
          ],
        },
        attendees: [{ userId: 'user-1', goalText: null, progress: [] }], _count: { attendees: 1 }, isMyBooking: true,
      },
      {
        id: 'individual-with-history', scheduledAt: new Date('2026-11-02T18:00:00.000Z'), topic: 'Індивідуальна',
        status: 'SCHEDULED', requests: { type: 'individual', previousScheduledAt: '2026-10-26T18:00:00.000Z' },
        attendees: [{ userId: 'user-1', goalText: null, progress: [] }], _count: { attendees: 1 }, isMyBooking: true,
      },
      {
        id: 'group-without-history', scheduledAt: new Date('2026-11-02T18:00:00.000Z'), topic: 'ФОКУС',
        status: 'SCHEDULED', requests: { type: 'group_practice' },
        attendees: [{ userId: 'user-1', goalText: null, progress: [] }], _count: { attendees: 1 }, isMyBooking: true,
      },
      {
        id: 'cancelled-commerce-history', scheduledAt: new Date('2026-11-02T18:00:00.000Z'), topic: 'Скасований запит',
        status: 'SCHEDULED', requests: { type: 'individual' },
        attendees: [], _count: { attendees: 0 }, isMyBooking: false,
      },
    ])
    mockGetUserCalendarRequestsForWindow.mockResolvedValue([
      { id: 'cancelled-request', zoomSessionId: 'cancelled-commerce-history', requesterUserId: 'user-1', status: 'CANCELLED', amount: 1, currency: 'UAH' },
    ])
    const response = createResponse()

    await handleGetCalendarSessions({
      user: { id: 'user-1' },
      query: { from: '2026-10-01T00:00:00.000Z', to: '2026-11-30T23:59:59.000Z', role: 'user' },
    } as never, response as never, vi.fn())

    const byId = new Map((response.json.mock.calls[0]?.[0] as Array<Record<string, unknown>>).map((session) => [session.id, session]))
    expect(byId.get('own-rescheduled-group')).toMatchObject({ previousScheduledAt: '2026-10-26T18:00:00.000Z' })
    expect(byId.get('twice-rescheduled-group')).toMatchObject({ previousScheduledAt: '2026-11-02T18:00:00.000Z' })
    expect(byId.get('foreign-rescheduled-group')).not.toHaveProperty('previousScheduledAt')
    expect(byId.get('individual-with-history')).not.toHaveProperty('previousScheduledAt')
    expect(byId.get('group-without-history')).not.toHaveProperty('previousScheduledAt')
    expect(byId.get('cancelled-commerce-history')).toMatchObject({
      commerceRequestId: 'cancelled-request',
      commerceStatus: 'CANCELLED',
    })
  })

  it.each([
    ['user', 'REQUESTED', '🟡 Очікує підтвердження'],
    ['user', 'APPROVED_PENDING_PAYMENT', '🟠 Очікує оплати'],
    ['user', 'PAID', '🔵 Заплановано'],
    ['user', 'EXPIRED', '⚪️ Час оплати вичерпано'],
    ['coach', 'REQUESTED', '🟡 Очікує підтвердження'],
    ['coach', 'APPROVED_PENDING_PAYMENT', '🟠 Очікує оплати'],
    ['coach', 'PAID', '🔵 Заплановано'],
  ])('projects canonical %s commerce status %s into the shared calendar DTO', async (
    role,
    status,
    commerceLabel,
  ) => {
    mockGetIndividualCheckoutUrl.mockResolvedValue('https://checkout.example/existing');
    mockGetCalendarSessions.mockResolvedValue([{
      id: 'session-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Індивідуальна сесія',
      status: 'SCHEDULED',
      requests: { type: 'individual', maxSlots: 1 },
      attendees: [],
      _count: { attendees: 0 },
      isMyBooking: false,
    }])
    mockGetCommerceCalendarRequests.mockResolvedValue([{
      id: 'commerce-1',
      zoomSessionId: 'session-1',
      requesterUserId: 'user-1',
      status,
      amount: 1,
      currency: 'UAH',
      checkoutOrderReference: 'zoom_commerce_individual_commerce-1',
    }])
    mockGetUserCalendarRequestsForWindow.mockResolvedValue([{
      id: 'commerce-1',
      zoomSessionId: 'session-1',
      requesterUserId: 'user-1',
      status,
      amount: 1,
      currency: 'UAH',
      checkoutOrderReference: 'zoom_commerce_individual_commerce-1',
    }])
    const response = createResponse()
    mockPrismaCheckoutSessionFindFirst.mockResolvedValue({
      expiresAt: new Date('2026-09-21T10:30:00.000Z'),
    })

    await handleGetCalendarSessions({
      user: { id: role === 'coach' ? 'coach-user-1' : 'user-1' },
      query: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T23:59:59.000Z',
        role,
      },
    } as never, response as never, vi.fn())

    if (role === 'user') {
      expect(mockGetUserCalendarRequestsForWindow).toHaveBeenCalledWith({
        requesterUserId: 'user-1',
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-09-30T23:59:59.000Z'),
        includeInactive: true,
      })
      expect(mockGetCommerceCalendarRequests).not.toHaveBeenCalled()
    } else {
      expect(mockGetCommerceCalendarRequests).toHaveBeenCalledWith({
        zoomSessionIds: ['session-1'],
        includeInactive: true,
      })
      expect(mockGetUserCalendarRequestsForWindow).not.toHaveBeenCalled()
    }
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({
        commerceRequestId: 'commerce-1',
        commerceStatus: status,
        commerceLabel,
        isMyPendingPayment: role === 'user' && status === 'APPROVED_PENDING_PAYMENT',
        checkoutUrl: role === 'user' && status === 'APPROVED_PENDING_PAYMENT' ? 'https://checkout.example/existing' : null,
        priceCents: 100,
        currency: 'UAH',
        paymentDeadline: role === 'user' && status === 'APPROVED_PENDING_PAYMENT'
          ? '2026-09-21T10:30:00.000Z'
          : null,
        slotStatus: ['APPROVED_PENDING_PAYMENT', 'PAID'].includes(status) ? 'booked' : 'available',
      }),
    ])
    expect(mockGetIndividualCheckoutUrl).toHaveBeenCalledTimes(
      role === 'user' && status === 'APPROVED_PENDING_PAYMENT' ? 1 : 0,
    )
  })

  it('projects the persisted submitted question into the USER requested individual calendar DTO', async () => {
    mockGetCalendarSessions.mockResolvedValue([{
      id: 'requested-session',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Індивідуальна сесія',
      status: 'SCHEDULED',
      requests: { type: 'individual', maxSlots: 1 },
      attendees: [],
      _count: { attendees: 0 },
      isMyBooking: false,
    }])
    mockGetUserCalendarRequestsForWindow.mockResolvedValue([{
      id: 'requested-commerce-1',
      zoomSessionId: 'requested-session',
      requesterUserId: 'user-1',
      status: 'REQUESTED',
      amount: 1,
      currency: 'UAH',
    }])
    mockPrismaEventFindMany.mockResolvedValue([{
      id: 'zoom-context:requested-commerce-1',
      payload: { requestId: 'requested-commerce-1', questionText: 'Як вибудувати наступний крок?' },
    }])
    const response = createResponse()

    await handleGetCalendarSessions({
      user: { id: 'user-1' },
      query: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T23:59:59.000Z',
        role: 'user',
      },
    } as never, response as never, vi.fn())

    expect(mockPrismaEventFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { in: ['zoom-context:requested-commerce-1'] },
        userId: 'user-1',
        type: 'ZOOM_COMMERCE_CONTEXT',
      }),
    }))
    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({
        goalText: 'Як вибудувати наступний крок?',
        commerceStatus: 'REQUESTED',
        checkoutUrl: null,
        isMyPendingPayment: false,
      }),
    ])
  })

  it('projects the existing expert relation as real coach identity and preserves null when absent', async () => {
    mockGetCalendarSessions.mockResolvedValue([
      {
        id: 'session-with-coach',
        scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        requests: { type: 'individual', maxSlots: 1 },
        expert: { id: 'expert-1', displayName: 'Надія Старвей' },
        attendees: [],
        _count: { attendees: 0 },
        isMyBooking: false,
      },
      {
        id: 'session-without-coach',
        scheduledAt: new Date('2026-09-11T10:00:00.000Z'),
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        requests: { type: 'individual', maxSlots: 1 },
        expert: null,
        attendees: [],
        _count: { attendees: 0 },
        isMyBooking: false,
      },
    ])
    const response = createResponse()

    await handleGetCalendarSessions({
      user: { id: 'user-1' },
      query: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T23:59:59.000Z',
        role: 'user',
      },
    } as never, response as never, vi.fn())

    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'session-with-coach',
        coach: { id: 'expert-1', name: 'Надія Старвей' },
        topic: 'Індивідуальна сесія',
        durationMinutes: 60,
      }),
      expect.objectContaining({
        id: 'session-without-coach',
        coach: null,
        topic: 'Індивідуальна сесія',
        durationMinutes: 60,
      }),
    ])
  })

  it('projects the linked commerce requester as the coach participant before payment creates an attendee', async () => {
    mockGetCalendarSessions.mockResolvedValue([{
      id: 'coach-created-individual',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Індивідуальна сесія',
      status: 'SCHEDULED',
      requests: { type: 'individual', maxSlots: 1 },
      attendees: [],
      _count: { attendees: 0 },
      isMyBooking: false,
    }])
    mockGetCommerceCalendarRequests.mockResolvedValue([{
      id: 'commerce-1', zoomSessionId: 'coach-created-individual', requesterUserId: 'user-1',
      status: 'APPROVED_PENDING_PAYMENT', amount: 1, currency: 'UAH',
      requester: { id: 'user-1', firstName: 'Анна', lastName: 'Мельник', email: 'anna@example.com' },
    }])
    const response = createResponse()

    await handleGetCalendarSessions({
      user: { id: 'coach-user-1' },
      query: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.000Z', role: 'coach' },
    } as never, response as never, vi.fn())

    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'coach-created-individual',
        participantNames: ['Анна Мельник'],
        commerceStatus: 'APPROVED_PENDING_PAYMENT',
      }),
    ])
  })

  it('projects disposable individual inventory from persisted commitment history, not from time or title', async () => {
    mockGetCalendarSessions.mockResolvedValue([
      {
        id: 'empty-slot', scheduledAt: new Date('2026-09-08T08:00:00.000Z'), topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', requests: { type: 'individual', maxSlots: 1 }, attendees: [], _count: { attendees: 0 }, isMyBooking: false,
      },
      {
        id: 'pending-request', scheduledAt: new Date('2026-09-08T09:00:00.000Z'), topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', requests: { type: 'individual', maxSlots: 1 }, attendees: [], _count: { attendees: 0 }, isMyBooking: false,
      },
      {
        id: 'cancelled-commitment', scheduledAt: new Date('2026-09-08T10:00:00.000Z'), topic: 'Індивідуальна сесія',
        status: 'CANCELLED', requests: { type: 'individual', maxSlots: 1 }, attendees: [], _count: { attendees: 0 }, isMyBooking: false,
      },
      {
        id: 'cancelled-empty-slot', scheduledAt: new Date('2026-09-08T10:30:00.000Z'), topic: 'Індивідуальна сесія',
        status: 'CANCELLED', requests: { type: 'individual', maxSlots: 1 }, attendees: [], _count: { attendees: 0 }, isMyBooking: false,
      },
      {
        id: 'completed-session', scheduledAt: new Date('2026-09-08T11:00:00.000Z'), topic: 'Індивідуальна сесія',
        status: 'COMPLETED', requests: { type: 'individual', maxSlots: 1 }, attendees: [], _count: { attendees: 0 }, isMyBooking: false,
      },
    ])
    mockGetCommerceCalendarRequests.mockResolvedValue([
      { id: 'request-1', zoomSessionId: 'pending-request', requesterUserId: 'user-1', status: 'REQUESTED', amount: 1, currency: 'UAH' },
      { id: 'request-2', zoomSessionId: 'cancelled-commitment', requesterUserId: 'user-2', status: 'CANCELLED', amount: 1, currency: 'UAH' },
    ])
    const response = createResponse()

    await handleGetCalendarSessions({
      user: { id: 'coach-user-1' },
      query: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.000Z', role: 'coach' },
    } as never, response as never, vi.fn())

    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'empty-slot', isDisposableIndividualSlot: true }),
      expect.objectContaining({ id: 'pending-request', isDisposableIndividualSlot: false }),
      expect.objectContaining({ id: 'cancelled-commitment', isDisposableIndividualSlot: false }),
      expect.objectContaining({ id: 'cancelled-empty-slot', isDisposableIndividualSlot: true }),
      expect.objectContaining({ id: 'completed-session', isDisposableIndividualSlot: false }),
    ])
  })

  it('emits the scoped calendar HTTP diagnostic from the final USER response envelope only', async () => {
    const canonicalUserId = 'e8262934-9454-4926-b734-65d03bca699e'
    mockGetCalendarSessions.mockResolvedValue([
      {
        id: 'cancelled-owned-session', scheduledAt: new Date('2026-09-08T10:00:00.000Z'), topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', requests: { type: 'individual', maxSlots: 1 }, attendees: [], _count: { attendees: 0 }, isMyBooking: false,
      },
      {
        id: 'cancelled-unowned-session', scheduledAt: new Date('2026-09-08T11:00:00.000Z'), topic: 'Індивідуальна сесія',
        status: 'CANCELLED', requests: { type: 'individual', maxSlots: 1 }, attendees: [], _count: { attendees: 0 }, isMyBooking: false,
      },
    ])
    mockGetUserCalendarRequestsForWindow.mockResolvedValue([
      { id: 'owned1234-request', zoomSessionId: 'cancelled-owned-session', requesterUserId: canonicalUserId, status: 'CANCELLED', amount: 1, currency: 'UAH' },
    ])
    const response = createResponse()
    const request = {
      user: { id: canonicalUserId },
      originalUrl: '/api/zoom/sessions/calendar?from=private&to=private',
      query: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.000Z', role: 'user' },
    }

    await handleGetCalendarSessions(request as never, response as never, vi.fn())

    const responseEnvelope = response.json.mock.calls[0]?.[0]
    expect(response.status).toHaveBeenCalledWith(200)
    expect(responseEnvelope).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'cancelled-owned-session',
        commerceRequestId: 'owned1234-request',
        commerceStatus: 'CANCELLED',
        status: 'SCHEDULED',
      }),
      expect.objectContaining({ id: 'cancelled-unowned-session', commerceRequestId: null }),
    ]))
    response.finish()

    expect(mockLoggerInfo).toHaveBeenCalledTimes(1)
    const diagnostic = String(mockLoggerInfo.mock.calls[0]?.[0])
    expect(diagnostic).toContain('ZOOM_CALENDAR_HTTP_DIAG_236')
    expect(diagnostic).toContain('\"finalHttpStatus\":200')
    expect(diagnostic).toContain('\"calendarRecordsCount\":2')
    expect(diagnostic).toContain('\"userOwnedCancelledCount\":1')
    expect(diagnostic).toContain('\"cancelledRequestPrefixes\":[\"owned123\"]')
    expect(diagnostic).not.toContain(canonicalUserId)
    expect(diagnostic).not.toContain('private')
    expect(diagnostic).not.toContain('Authorization')

    const otherUserResponse = createResponse()
    await handleGetCalendarSessions({
      user: { id: 'other-user' },
      query: request.query,
    } as never, otherUserResponse as never, vi.fn())
    otherUserResponse.finish()
    const coachResponse = createResponse()
    await handleGetCalendarSessions({
      user: { id: canonicalUserId },
      query: { ...request.query, role: 'coach' },
    } as never, coachResponse as never, vi.fn())
    coachResponse.finish()

    expect(mockLoggerInfo).toHaveBeenCalledTimes(1)
  })

  it('exposes completed outcome and recording capability for coach calendar DTO', async () => {
    mockGetCalendarSessions.mockResolvedValue([
      {
        id: 'session-1',
        scheduledAt: new Date('2026-09-08T18:00:00.000Z'),
        topic: 'Індивідуальна сесія',
        status: 'COMPLETED',
        requests: { type: 'individual', zoomLink: 'https://zoom.us/j/1' },
        postSessionReport: {
          source: 'manual',
          completedAt: '2026-09-08T19:00:00.000Z',
          actualAttendeeCount: 1,
          topic: 'Воронка перед запуском',
          summary: 'Перевірили структуру запуску.',
          audioUrl: 'https://zoom.us/rec/1',
          recordingAvailable: true,
        },
        attendees: [
          {
            userId: 'user-1',
            goalText: null,
            progress: [],
            attended: true,
            user: { firstName: 'Vira', lastName: null, email: 'vira@example.com' },
          },
        ],
        _count: { attendees: 1 },
        isMyBooking: false,
      },
    ])
    const response = createResponse()

    await handleGetCalendarSessions(
      {
        user: { id: 'coach-user-1' },
        query: {
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-09-30T23:59:59.000Z',
          role: 'coach',
        },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({
        actualAttendeeCount: 1,
        completedAt: '2026-09-08T19:00:00.000Z',
        completionSource: 'manual',
        outcomeTopic: 'Воронка перед запуском',
        summary: 'Перевірили структуру запуску.',
        recordingUrl: 'https://zoom.us/rec/1',
        recordingAvailable: true,
        canViewRecording: true,
        attendees: [{ userId: 'user-1', name: 'Vira', attended: true }],
      }),
    ])
  })

  it('gates user recording capability through backend booking visibility', async () => {
    mockGetCalendarSessions.mockResolvedValue([
      {
        id: 'session-1',
        scheduledAt: new Date('2026-09-08T18:00:00.000Z'),
        topic: 'Групова практика',
        status: 'COMPLETED',
        requests: { type: 'group_practice' },
        postSessionReport: {
          audioUrl: 'https://zoom.us/rec/1',
          recordingAvailable: true,
          actualAttendeeCount: 3,
          topic: 'Закрита тема практики',
          summary: 'Підсумок для зареєстрованих учасників.',
        },
        attendees: [],
        _count: { attendees: 3 },
        isMyBooking: false,
      },
      {
        id: 'session-2',
        scheduledAt: new Date('2026-09-09T18:00:00.000Z'),
        topic: 'Групова практика',
        status: 'COMPLETED',
        requests: { type: 'group_practice' },
        postSessionReport: {
          audioUrl: 'https://zoom.us/rec/2',
          recordingAvailable: true,
          actualAttendeeCount: 5,
          topic: 'Причини відкладень дій',
          summary: 'Всі пройшли практику успішно',
        },
        attendees: [
          {
            userId: 'user-1', goalText: null, progress: [], attended: true,
            selfReportedAttended: true, selfReportedAt: new Date('2026-09-10T12:00:00.000Z'),
            user: { firstName: 'Vira', lastName: null, email: 'vira@example.com' },
          },
          { userId: 'user-2', goalText: null, progress: [], attended: true, user: { firstName: 'Anna', lastName: null, email: 'anna@example.com' } },
        ],
        _count: { attendees: 3 },
        isMyBooking: true,
      },
    ])
    const response = createResponse()

    await handleGetCalendarSessions(
      {
        user: { id: 'user-1' },
        query: {
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-09-30T23:59:59.000Z',
          role: 'user',
        },
      } as never,
      response as never,
      vi.fn(),
    )

    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'session-1', canViewRecording: false, recordingUrl: null }),
      expect.objectContaining({
        id: 'session-2',
        canViewRecording: true,
        recordingUrl: 'https://zoom.us/rec/2',
        isMyAttendanceConfirmed: true,
        canSelfReportAttendance: true,
        selfReportedAttended: true,
        selfReportedAt: '2026-09-10T12:00:00.000Z',
        actualAttendeeCount: 5,
        outcomeTopic: 'Причини відкладень дій',
        summary: 'Всі пройшли практику успішно',
        attendees: [{ userId: 'user-1', name: 'Vira', attended: true }],
      }),
    ])

    const result = response.json.mock.calls[0]?.[0] as Array<Record<string, unknown>>
    const publicCompletedGroup = result.find((session) => session.id === 'session-1')!
    const completedUserGroup = result.find((session) => session.id === 'session-2')!
    expect(publicCompletedGroup).not.toHaveProperty('actualAttendeeCount')
    expect(publicCompletedGroup).not.toHaveProperty('outcomeTopic')
    expect(publicCompletedGroup).not.toHaveProperty('summary')
    expect(completedUserGroup).toMatchObject({
      actualAttendeeCount: 5,
      outcomeTopic: 'Причини відкладень дій',
      summary: 'Всі пройшли практику успішно',
      canSelfReportAttendance: true,
      selfReportedAttended: true,
      selfReportedAt: '2026-09-10T12:00:00.000Z',
    })
    expect(completedUserGroup.attendees).toEqual([
      { userId: 'user-1', name: 'Vira', attended: true },
    ])
  })

})
