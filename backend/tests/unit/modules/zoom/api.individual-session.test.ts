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
const mockGetIndividualAvailabilityForScheduledAt = vi.fn()
const mockGetIndividualAvailabilitySummary = vi.fn()
const mockGetAvailabilityWeek = vi.fn()
const mockSaveAvailabilityWeek = vi.fn()

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

vi.mock('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js')>(),
  getCommerceCheckoutUrl: (...args: unknown[]) => mockGetIndividualCheckoutUrl(...args),
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
  getCalendarSessions: (...args: unknown[]) => mockGetCalendarSessions(...args),
}))

vi.mock('../../../../src/modules/zoom/battle/battle.service.js', () => ({
  acceptBattle: vi.fn(),
  declineBattle: vi.fn(),
  logBattleProgress: (...args: unknown[]) => mockLogBattleProgress(...args),
  notifyBattleCreatedByCoach: (...args: unknown[]) => mockNotifyBattleCreatedByCoach(...args),
  recordBattleResult: vi.fn(),
  setBattleGoal: (...args: unknown[]) => mockSetBattleGoal(...args),
}))

import {
  handleCreateSession,
  handleCreateUserIndividualRequest,
  handleGetCalendarSessions,
  handleGetIndividualAvailabilitySummary,
  handleGetAvailabilityWeek,
  handleLogBattleProgress,
  handleSetBattleGoal,
  handleSaveAvailabilityWeek,
  handleUpdateSession,
} from '../../../../src/modules/zoom/api/zoom.admin.handler.js'

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
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
    mockGetAvailabilityWeek.mockResolvedValue([])
    mockSaveAvailabilityWeek.mockResolvedValue(undefined)
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

  it('uses canonical Individual availability before a coach-created session persists', async () => {
    mockGetIndividualAvailabilityForScheduledAt.mockResolvedValueOnce({
      candidate: { available: false, reason: 'Час уже заброньований' },
      alternatives: [],
    })
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
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'COMMERCE_SLOT_UNAVAILABLE' }))
    expect(mockCreateFullSession).not.toHaveBeenCalled()
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
        postSessionReport: { audioUrl: 'https://zoom.us/rec/1', recordingAvailable: true },
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
        postSessionReport: { audioUrl: 'https://zoom.us/rec/2', recordingAvailable: true },
        attendees: [],
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
      expect.objectContaining({ id: 'session-1', canViewRecording: false }),
      expect.objectContaining({ id: 'session-2', canViewRecording: true }),
    ])
  })

})
