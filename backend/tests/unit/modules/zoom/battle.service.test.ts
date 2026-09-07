import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionFindMany = vi.fn()
const mockZoomSessionCreate = vi.fn()
const mockZoomSessionFindUniqueOrThrow = vi.fn()
const mockZoomSessionUpdate = vi.fn()
const mockZoomSessionUpdateMany = vi.fn()
const mockZoomSessionAttendeeFindUnique = vi.fn()
const mockZoomSessionAttendeeUpdate = vi.fn()
const mockZoomSessionAttendeeUpsert = vi.fn()
const mockUserFindMany = vi.fn()
const mockGamificationProfileUpsert = vi.fn()
const mockGamificationProfileUpdate = vi.fn()
const mockStreakFindUnique = vi.fn()
const mockStreakCreate = vi.fn()
const mockStreakUpdate = vi.fn()
const mockNotificationEmit = vi.fn()
const mockTransaction = vi.fn()

const mockTx = {
  zoomSession: {
    findMany: (...args: unknown[]) => mockZoomSessionFindMany(...args),
    create: (...args: unknown[]) => mockZoomSessionCreate(...args),
    findUniqueOrThrow: (...args: unknown[]) => mockZoomSessionFindUniqueOrThrow(...args),
    update: (...args: unknown[]) => mockZoomSessionUpdate(...args),
    updateMany: (...args: unknown[]) => mockZoomSessionUpdateMany(...args),
  },
  zoomSessionAttendee: {
    findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
    update: (...args: unknown[]) => mockZoomSessionAttendeeUpdate(...args),
    upsert: (...args: unknown[]) => mockZoomSessionAttendeeUpsert(...args),
  },
  user: {
    findMany: (...args: unknown[]) => mockUserFindMany(...args),
  },
  gamificationProfile: {
    upsert: (...args: unknown[]) => mockGamificationProfileUpsert(...args),
    update: (...args: unknown[]) => mockGamificationProfileUpdate(...args),
  },
  streak: {
    findUnique: (...args: unknown[]) => mockStreakFindUnique(...args),
    create: (...args: unknown[]) => mockStreakCreate(...args),
    update: (...args: unknown[]) => mockStreakUpdate(...args),
  },
}

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    ...mockTx,
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('../../../../src/services/notifications/NotificationService.js', () => ({
  notificationService: {
    emit: (...args: unknown[]) => mockNotificationEmit(...args),
  },
}))

describe('battle.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation((callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx))
    mockZoomSessionAttendeeUpsert.mockResolvedValue({ id: 'attendee-1' })
    mockUserFindMany.mockResolvedValue([{ id: 'coach-1' }])
    mockZoomSessionUpdateMany.mockResolvedValue({ count: 1 })
    mockGamificationProfileUpsert.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      bitMind: 0,
      mindXP: 100,
      neuroGems: 20,
      level: 1,
    })
    mockGamificationProfileUpdate.mockResolvedValue({})
    mockStreakFindUnique.mockResolvedValue(null)
    mockStreakCreate.mockResolvedValue({ id: 'streak-1' })
    mockStreakUpdate.mockResolvedValue({ id: 'streak-1' })
    mockNotificationEmit.mockResolvedValue({ id: 'notification-1' })
  })

  it('creates one pending battle session with exactly two attendee rows', async () => {
    const { initiateBattle } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindMany.mockResolvedValue([])
    mockZoomSessionCreate.mockResolvedValue({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'pending',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })

    const session = await initiateBattle({
      expertId: 'expert-1',
      challengerId: 'user-1',
      opponentId: 'user-2',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
    })

    expect(session.id).toBe('battle-session-1')
    expect(mockZoomSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expertId: 'expert-1',
        topic: 'Battle: user-1 vs user-2',
        requests: expect.objectContaining({
          type: 'battle_review',
          battleStatus: 'pending',
          challengerId: 'user-1',
          opponentId: 'user-2',
        }),
      }),
    })
    expect(mockZoomSessionCreate.mock.calls[0]?.[0].data.requests).not.toHaveProperty('goalA')
    expect(mockZoomSessionCreate.mock.calls[0]?.[0].data.requests).not.toHaveProperty('goalB')
    expect(mockZoomSessionCreate.mock.calls[0]?.[0].data.requests).not.toHaveProperty('progress')
    expect(mockZoomSessionAttendeeUpsert).toHaveBeenCalledTimes(2)
    expect(mockZoomSessionAttendeeUpsert).toHaveBeenNthCalledWith(1, {
      where: { sessionId_userId: { sessionId: 'battle-session-1', userId: 'user-1' } },
      create: { sessionId: 'battle-session-1', userId: 'user-1', goalText: null },
      update: {},
    })
    expect(mockZoomSessionAttendeeUpsert).toHaveBeenNthCalledWith(2, {
      where: { sessionId_userId: { sessionId: 'battle-session-1', userId: 'user-2' } },
      create: { sessionId: 'battle-session-1', userId: 'user-2', goalText: null },
      update: {},
    })
    expect(mockNotificationEmit).toHaveBeenCalledTimes(3)
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_CREATED_BY_USER',
      'user-2',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        battleStatus: 'pending',
        recipientRole: 'opponent',
      }),
    )
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_CREATED_BY_USER',
      'coach-1',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        recipientRole: 'coach',
      }),
    )
  })

  it('stores participant goals on ZoomSessionAttendee without writing goal fields to requests', async () => {
    const { initiateBattle } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindMany.mockResolvedValue([])
    mockZoomSessionCreate.mockResolvedValue({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'pending',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })

    await initiateBattle({
      expertId: 'expert-1',
      challengerId: 'user-1',
      opponentId: 'user-2',
      goalA: 'Ціль A',
      goalB: 'Ціль B',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
    })

    expect(mockZoomSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requests: expect.not.objectContaining({
          goalA: expect.anything(),
          goalB: expect.anything(),
          progress: expect.anything(),
        }),
      }),
    })
    expect(mockZoomSessionAttendeeUpsert).toHaveBeenNthCalledWith(1, {
      where: { sessionId_userId: { sessionId: 'battle-session-1', userId: 'user-1' } },
      create: { sessionId: 'battle-session-1', userId: 'user-1', goalText: 'Ціль A' },
      update: {},
    })
    expect(mockZoomSessionAttendeeUpsert).toHaveBeenNthCalledWith(2, {
      where: { sessionId_userId: { sessionId: 'battle-session-1', userId: 'user-2' } },
      create: { sessionId: 'battle-session-1', userId: 'user-2', goalText: 'Ціль B' },
      update: {},
    })
  })

  it('lets participant A write only their own goal attendee row', async () => {
    const { setBattleGoal } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionAttendeeFindUnique.mockResolvedValue({
      id: 'attendee-a',
      userId: 'user-1',
      goalText: null,
      progress: [],
      session: {
        id: 'battle-session-1',
        requests: {
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
        },
      },
    })
    mockZoomSessionAttendeeUpdate.mockResolvedValue({
      session: {
        id: 'battle-session-1',
        requests: {
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
        },
      },
    })

    await setBattleGoal({ sessionId: 'battle-session-1', userId: 'user-1', goalText: 'Ціль A' })

    expect(mockZoomSessionAttendeeFindUnique).toHaveBeenCalledWith({
      where: { sessionId_userId: { sessionId: 'battle-session-1', userId: 'user-1' } },
      include: { session: true },
    })
    expect(mockZoomSessionAttendeeUpdate).toHaveBeenCalledWith({
      where: { id: 'attendee-a' },
      data: { goalText: 'Ціль A' },
      include: { session: true },
    })
    expect(mockZoomSessionUpdate).not.toHaveBeenCalled()
  })

  it('rejects goal writes for a non-attendee instead of touching another participant', async () => {
    const { setBattleGoal } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(setBattleGoal({
      sessionId: 'battle-session-1',
      userId: 'user-3',
      goalText: 'Чужа ціль',
    })).rejects.toThrow('battle_attendee_required')

    expect(mockZoomSessionAttendeeUpdate).not.toHaveBeenCalled()
    expect(mockZoomSessionUpdate).not.toHaveBeenCalled()
  })

  it('updates participant progress on their own attendee row without requests dual-write', async () => {
    const { logBattleProgress } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionAttendeeFindUnique.mockResolvedValue({
      id: 'attendee-a',
      userId: 'user-1',
      progress: [],
      session: {
        id: 'battle-session-1',
        requests: {
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
        },
      },
    })
    mockZoomSessionAttendeeUpdate.mockResolvedValue({
      session: {
        id: 'battle-session-1',
        requests: {
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
        },
      },
    })

    await logBattleProgress({
      sessionId: 'battle-session-1',
      userId: 'user-1',
      day: 1,
      text: 'Готово',
    })

    expect(mockZoomSessionAttendeeUpdate).toHaveBeenCalledWith({
      where: { id: 'attendee-a' },
      data: {
        progress: [expect.objectContaining({ day: 1, text: 'Готово' })],
      },
      include: { session: true },
    })
    expect(mockZoomSessionUpdate).not.toHaveBeenCalled()
  })

  it('keeps retry for the same progress day stable on the same attendee row', async () => {
    const { logBattleProgress } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionAttendeeFindUnique.mockResolvedValue({
      id: 'attendee-a',
      userId: 'user-1',
      progress: [{ day: 1, text: 'Старий текст', createdAt: '2026-09-10T10:00:00.000Z' }],
      session: {
        id: 'battle-session-1',
        requests: {
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
        },
      },
    })
    mockZoomSessionAttendeeUpdate.mockResolvedValue({
      session: {
        id: 'battle-session-1',
        requests: {
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
        },
      },
    })

    await logBattleProgress({
      sessionId: 'battle-session-1',
      userId: 'user-1',
      day: 1,
      text: 'Новий текст',
    })

    const update = mockZoomSessionAttendeeUpdate.mock.calls[0]?.[0] as {
      data: { progress: Array<{ day: number; text: string }> }
    }
    expect(update.data.progress).toHaveLength(1)
    expect(update.data.progress[0]).toMatchObject({ day: 1, text: 'Новий текст' })
  })

  it('keeps parallel participant progress writes isolated by attendee row', async () => {
    const { logBattleProgress } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionAttendeeFindUnique
      .mockResolvedValueOnce({
        id: 'attendee-a',
        userId: 'user-1',
        progress: [],
        session: {
          id: 'battle-session-1',
          requests: {
            type: 'battle_review',
            battleStatus: 'active',
            challengerId: 'user-1',
            opponentId: 'user-2',
          },
        },
      })
      .mockResolvedValueOnce({
        id: 'attendee-b',
        userId: 'user-2',
        progress: [],
        session: {
          id: 'battle-session-1',
          requests: {
            type: 'battle_review',
            battleStatus: 'active',
            challengerId: 'user-1',
            opponentId: 'user-2',
          },
        },
      })
    mockZoomSessionAttendeeUpdate.mockResolvedValue({
      session: {
        id: 'battle-session-1',
        requests: {
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
        },
      },
    })

    await Promise.all([
      logBattleProgress({ sessionId: 'battle-session-1', userId: 'user-1', day: 1, text: 'A' }),
      logBattleProgress({ sessionId: 'battle-session-1', userId: 'user-2', day: 1, text: 'B' }),
    ])

    expect(mockZoomSessionAttendeeUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'attendee-a' },
      data: { progress: [expect.objectContaining({ day: 1, text: 'A' })] },
      include: { session: true },
    })
    expect(mockZoomSessionAttendeeUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'attendee-b' },
      data: { progress: [expect.objectContaining({ day: 1, text: 'B' })] },
      include: { session: true },
    })
    expect(mockZoomSessionUpdate).not.toHaveBeenCalled()
  })

  it('retries the same open battle without duplicating the session or notifications', async () => {
    const { initiateBattle } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'existing-battle-1',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
        topic: 'Battle: user-1 vs user-2',
        requests: {
          type: 'battle_review',
          battleStatus: 'pending',
          challengerId: 'user-1',
          opponentId: 'user-2',
        },
      },
    ])

    const session = await initiateBattle({
      expertId: 'expert-1',
      challengerId: 'user-1',
      opponentId: 'user-2',
    })

    expect(session.id).toBe('existing-battle-1')
    expect(mockZoomSessionCreate).not.toHaveBeenCalled()
    expect(mockZoomSessionAttendeeUpsert).toHaveBeenCalledTimes(2)
    expect(mockNotificationEmit).not.toHaveBeenCalled()
  })

  it('rejects self-selection before persistence', async () => {
    const { initiateBattle } = await import('../../../../src/modules/zoom/battle/battle.service.js')

    await expect(initiateBattle({
      expertId: 'expert-1',
      challengerId: 'user-1',
      opponentId: 'user-1',
    })).rejects.toThrow('battle_participants_distinct_required')

    expect(mockZoomSessionCreate).not.toHaveBeenCalled()
    expect(mockZoomSessionAttendeeUpsert).not.toHaveBeenCalled()
  })

  it('accepts a pending battle through the opponent owner', async () => {
    const { acceptBattle } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindUniqueOrThrow.mockResolvedValue({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'pending',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })
    mockZoomSessionUpdate.mockResolvedValue({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'active',
        challengerId: 'user-1',
        opponentId: 'user-2',
        goalA: 'legacy stale',
        progress: { 'user-1': [{ day: 1, text: 'legacy', createdAt: 'old' }] },
      },
    })

    await acceptBattle({ sessionId: 'battle-session-1', userId: 'user-2' })

    expect(mockZoomSessionUpdate).toHaveBeenCalledWith({
      where: { id: 'battle-session-1' },
      data: {
        requests: expect.objectContaining({
          type: 'battle_review',
          battleStatus: 'active',
          challengerId: 'user-1',
          opponentId: 'user-2',
        }),
      },
    })
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_ACCEPTED',
      'user-1',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        battleStatus: 'active',
        recipientRole: 'challenger',
      }),
    )
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_ACCEPTED',
      'user-2',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        battleStatus: 'active',
        recipientRole: 'opponent',
      }),
    )
  })

  it('declines a pending battle and notifies challenger plus coach', async () => {
    const { declineBattle } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindUniqueOrThrow.mockResolvedValue({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'pending',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })
    mockZoomSessionUpdate.mockResolvedValue({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'cancelled',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })

    await declineBattle({ sessionId: 'battle-session-1', userId: 'user-2' })

    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_DECLINED',
      'user-1',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        battleStatus: 'cancelled',
        recipientRole: 'challenger',
      }),
    )
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_DECLINED',
      'coach-1',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        recipientRole: 'coach',
      }),
    )
  })

  it('records a battle result, rewards participant 1, and notifies participants once', async () => {
    const { recordBattleResult } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindUniqueOrThrow.mockResolvedValueOnce({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      status: 'ACTIVE',
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'active',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })
    mockZoomSessionFindUniqueOrThrow.mockResolvedValueOnce({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      status: 'COMPLETED',
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'completed',
        challengerId: 'user-1',
        opponentId: 'user-2',
        winnerId: 'user-1',
      },
    })

    await recordBattleResult({ sessionId: 'battle-session-1', outcome: 'challenger' })

    expect(mockZoomSessionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'battle-session-1',
        status: { not: 'COMPLETED' },
      },
      data: {
        status: 'COMPLETED',
        requests: expect.objectContaining({
          type: 'battle_review',
          battleStatus: 'completed',
          outcome: 'challenger',
          winnerId: 'user-1',
        }),
      },
    })
    expect(mockZoomSessionUpdateMany.mock.calls[0]?.[0].data.requests).not.toHaveProperty('goalA')
    expect(mockZoomSessionUpdateMany.mock.calls[0]?.[0].data.requests).not.toHaveProperty('goalB')
    expect(mockZoomSessionUpdateMany.mock.calls[0]?.[0].data.requests).not.toHaveProperty('progress')
    expect(mockGamificationProfileUpsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: {
        userId: 'user-1',
        mindXP: 100,
        neuroGems: 20,
      },
      update: {
        mindXP: { increment: 100 },
        neuroGems: { increment: 20 },
      },
    })
    expect(mockStreakCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        expertId: 'expert-1',
        ruleKey: 'battle_win',
        current: 1,
      }),
    })
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_RESULT',
      'user-1',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        battleStatus: 'completed',
        winnerId: 'user-1',
      }),
    )
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_RESULT',
      'user-2',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        battleStatus: 'completed',
      }),
    )
  })

  it('records participant 2 as winner through the same canonical reward path', async () => {
    const { recordBattleResult } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindUniqueOrThrow.mockResolvedValueOnce({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      status: 'ACTIVE',
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'active',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })
    mockZoomSessionFindUniqueOrThrow.mockResolvedValueOnce({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      status: 'COMPLETED',
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'completed',
        challengerId: 'user-1',
        opponentId: 'user-2',
        outcome: 'opponent',
        winnerId: 'user-2',
      },
    })

    await recordBattleResult({ sessionId: 'battle-session-1', outcome: 'opponent' })

    expect(mockGamificationProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-2' },
      }),
    )
    expect(mockStreakCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-2',
        ruleKey: 'battle_win',
      }),
    })
  })

  it('records no winner without applying XP, Gems, or battle_win streak', async () => {
    const { recordBattleResult } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindUniqueOrThrow.mockResolvedValueOnce({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      status: 'ACTIVE',
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'active',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })
    mockZoomSessionFindUniqueOrThrow.mockResolvedValueOnce({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      status: 'COMPLETED',
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'completed',
        challengerId: 'user-1',
        opponentId: 'user-2',
        outcome: 'none',
        winnerId: null,
      },
    })

    await recordBattleResult({ sessionId: 'battle-session-1', outcome: 'none' })

    expect(mockGamificationProfileUpsert).not.toHaveBeenCalled()
    expect(mockStreakCreate).not.toHaveBeenCalled()
    expect(mockStreakUpdate).not.toHaveBeenCalled()
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_RESULT',
      'user-1',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        battleStatus: 'completed',
      }),
    )
  })


  it('records both as shared completion reward without battle_win streak', async () => {
    const { recordBattleResult } = await import('../../../../src/modules/zoom/battle/battle.service.js')

    mockZoomSessionFindUniqueOrThrow.mockResolvedValueOnce({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      status: 'ACTIVE',
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'active',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })

    mockZoomSessionFindUniqueOrThrow.mockResolvedValueOnce({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      status: 'COMPLETED',
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'completed',
        challengerId: 'user-1',
        opponentId: 'user-2',
        outcome: 'both',
        winnerId: null,
      },
    })

    await recordBattleResult({ sessionId: 'battle-session-1', outcome: 'both' })

    expect(mockGamificationProfileUpsert).toHaveBeenCalledTimes(2)

    expect(mockGamificationProfileUpsert).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-1' },
      create: {
        userId: 'user-1',
        mindXP: 50,
        neuroGems: 10,
      },
      update: {
        mindXP: { increment: 50 },
        neuroGems: { increment: 10 },
      },
    })

    expect(mockGamificationProfileUpsert).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-2' },
      create: {
        userId: 'user-2',
        mindXP: 50,
        neuroGems: 10,
      },
      update: {
        mindXP: { increment: 50 },
        neuroGems: { increment: 10 },
      },
    })

    expect(mockStreakCreate).not.toHaveBeenCalled()
    expect(mockStreakUpdate).not.toHaveBeenCalled()
  })

  it('does not duplicate reward or notifications when a completed result is replayed', async () => {
    const { recordBattleResult } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindUniqueOrThrow.mockResolvedValue({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      status: 'COMPLETED',
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'completed',
        challengerId: 'user-1',
        opponentId: 'user-2',
        winnerId: 'user-1',
      },
    })

    await recordBattleResult({ sessionId: 'battle-session-1', outcome: 'challenger' })

    expect(mockZoomSessionUpdateMany).not.toHaveBeenCalled()
    expect(mockGamificationProfileUpsert).not.toHaveBeenCalled()
    expect(mockStreakCreate).not.toHaveBeenCalled()
    expect(mockNotificationEmit).not.toHaveBeenCalled()
  })

  it('cancels stale pending battles only', async () => {
    const { cancelStaleBattles } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'pending-battle-1',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-09-01T10:00:00.000Z'),
        topic: 'Battle: user-1 vs user-2',
        requests: {
          type: 'battle_review',
          battleStatus: 'pending',
          challengerId: 'user-1',
          opponentId: 'user-2',
        },
      },
      {
        id: 'active-battle-1',
        requests: { type: 'battle_review', battleStatus: 'active' },
      },
    ])
    mockZoomSessionUpdate.mockResolvedValue({
      id: 'pending-battle-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-01T10:00:00.000Z'),
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'cancelled',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })

    const count = await cancelStaleBattles()

    expect(count).toBe(1)
    expect(mockZoomSessionUpdate).toHaveBeenCalledWith({
      where: { id: 'pending-battle-1' },
      data: {
        status: 'CANCELLED',
        requests: expect.objectContaining({
          type: 'battle_review',
          battleStatus: 'cancelled',
          challengerId: 'user-1',
          opponentId: 'user-2',
        }),
      },
    })
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_EXPIRED',
      'user-1',
      expect.objectContaining({
        sessionId: 'pending-battle-1',
        battleStatus: 'cancelled',
      }),
    )
  })

  it('notifies both participants for a coach-created battle', async () => {
    const { notifyBattleCreatedByCoach } = await import('../../../../src/modules/zoom/battle/battle.service.js')

    await notifyBattleCreatedByCoach({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Battle Review',
      requests: {
        type: 'battle_review',
        battleStatus: 'active',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    } as never)

    expect(mockNotificationEmit).toHaveBeenCalledTimes(2)
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_CREATED_BY_COACH',
      'user-1',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        recipientRole: 'participant',
      }),
    )
    expect(mockNotificationEmit).toHaveBeenCalledWith(
      'BATTLE_CREATED_BY_COACH',
      'user-2',
      expect.objectContaining({
        sessionId: 'battle-session-1',
        recipientRole: 'participant',
      }),
    )
  })

  it('does not duplicate a replayed accepted battle notification', async () => {
    const { acceptBattle } = await import('../../../../src/modules/zoom/battle/battle.service.js')
    mockZoomSessionFindUniqueOrThrow.mockResolvedValue({
      id: 'battle-session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
      topic: 'Battle: user-1 vs user-2',
      requests: {
        type: 'battle_review',
        battleStatus: 'active',
        challengerId: 'user-1',
        opponentId: 'user-2',
      },
    })

    await acceptBattle({ sessionId: 'battle-session-1', userId: 'user-2' })

    expect(mockZoomSessionUpdate).not.toHaveBeenCalled()
    expect(mockNotificationEmit).not.toHaveBeenCalled()
  })
})
