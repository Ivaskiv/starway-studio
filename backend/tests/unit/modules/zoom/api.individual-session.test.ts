import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrismaUserFindUnique = vi.fn()
const mockPrismaZoomSessionFindUnique = vi.fn()
const mockPrismaZoomSessionAttendeeFindMany = vi.fn()
const mockPrismaZoomSessionAttendeeDeleteMany = vi.fn()
const mockCreateFullSession = vi.fn()
const mockRegisterAttendee = vi.fn()
const mockUpdateSession = vi.fn()
const mockGetCalendarSessions = vi.fn()
const mockSendOpsTelegramMessage = vi.fn()
const mockNotifyBattleCreatedByCoach = vi.fn()
const mockLogBattleProgress = vi.fn()
const mockSetBattleGoal = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    },
    zoomSession: {
      findUnique: (...args: unknown[]) => mockPrismaZoomSessionFindUnique(...args),
    },
    zoomSessionAttendee: {
      findMany: (...args: unknown[]) => mockPrismaZoomSessionAttendeeFindMany(...args),
      deleteMany: (...args: unknown[]) => mockPrismaZoomSessionAttendeeDeleteMany(...args),
    },
  },
}))

vi.mock('../../../../src/lib/telegram.js', () => ({
  sendOpsTelegramMessage: (...args: unknown[]) =>
    Promise.resolve(mockSendOpsTelegramMessage(...args)),
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
  handleGetCalendarSessions,
  handleLogBattleProgress,
  handleSetBattleGoal,
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
  } as never
}

describe('zoom session participant contract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPrismaUserFindUnique.mockResolvedValue({ expertId: 'expert-1' })
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
    )
    expect(mockRegisterAttendee).toHaveBeenCalledWith('user-1', 'session-1')
    expect(response.status).toHaveBeenCalledWith(201)
  })

  it('keeps the same attendee when editing an individual session', async () => {
    mockPrismaZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      type: 'GROUP',
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
})
