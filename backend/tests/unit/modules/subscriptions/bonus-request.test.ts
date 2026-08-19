import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => {
  const users = new Map<string, {
    id: string
    lifecycleState: string | null
  }>()
  const requests = new Map<string, {
    id: string
    userId: string
    type: string
    campaign: string
    status: string
    dedupKey: string
    requestedAt: Date
    approvedAt: Date | null
    approvedById: string | null
    rejectedAt: Date | null
    rejectedById: string | null
    rejectionReason: string | null
    createdAt: Date
    updatedAt: Date
  }>()

  return {
    users,
    requests,
    userUpdate: vi.fn(),
    paymentLogCount: vi.fn(async () => 0),
    productSubscriptionCount: vi.fn(async () => 0),
    reset() {
      users.clear()
      requests.clear()
      this.userUpdate.mockReset()
      this.paymentLogCount.mockClear()
      this.productSubscriptionCount.mockClear()
    },
    seedUser(userId: string, lifecycleState = 'FOCUS_PAID') {
      users.set(userId, { id: userId, lifecycleState })
    },
  }
})

function makeDuplicateError(): Error & { code: 'P2002' } {
  const error = new Error('Unique constraint failed') as Error & { code: 'P2002' }
  error.code = 'P2002'
  return error
}

vi.mock('../../../db/client.ts', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const user = mockState.users.get(where.id)
        return user ? { id: user.id } : null
      }),
      update: mockState.userUpdate,
    },
    bonusSubscriptionRequest: {
      create: vi.fn(async ({ data }: {
        data: {
          userId: string
          type: string
          campaign: string
          status: string
          dedupKey: string
        }
      }) => {
        const compositeKey = `${data.userId}:${data.type}:${data.campaign}`
        if (mockState.requests.has(compositeKey)) {
          throw makeDuplicateError()
        }

        const now = new Date()
        const record = {
          id: `req_${mockState.requests.size + 1}`,
          userId: data.userId,
          type: data.type,
          campaign: data.campaign,
          status: data.status,
          dedupKey: data.dedupKey,
          requestedAt: now,
          approvedAt: null,
          approvedById: null,
          rejectedAt: null,
          rejectedById: null,
          rejectionReason: null,
          createdAt: now,
          updatedAt: now,
        }
        mockState.requests.set(compositeKey, record)
        return record
      }),
      findUnique: vi.fn(async ({ where }: {
        where: {
          userId_type_campaign: {
            userId: string
            type: string
            campaign: string
          }
        }
      }) => {
        const { userId, type, campaign } = where.userId_type_campaign
        return mockState.requests.get(`${userId}:${type}:${campaign}`) ?? null
      }),
      count: vi.fn(async () => mockState.requests.size),
    },
    paymentLog: {
      count: mockState.paymentLogCount,
    },
    productSubscription: {
      count: mockState.productSubscriptionCount,
    },
  },
}))

import {
  BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
  BONUS_SUBSCRIPTION_REQUEST_TYPE,
  BonusSubscriptionRequestUserNotFoundError,
  createBonusSubscriptionRequest,
  getBonusSubscriptionRequestState,
} from '../bonus-request.ts'

describe('bonusSubscriptionRequest.service', () => {
  beforeEach(() => {
    mockState.reset()
    mockState.seedUser('user-1')
    mockState.seedUser('user-2', 'NEW_USER')
  })

  it('creates the first request as PENDING', async () => {
    const result = await createBonusSubscriptionRequest({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })

    expect(result.created).toBe(true)
    expect(result.request.status).toBe('PENDING')
    expect(result.request.type).toBe(BONUS_SUBSCRIPTION_REQUEST_TYPE)
    expect(result.request.approvedAt).toBeNull()
    expect(result.request.rejectedAt).toBeNull()
  })

  it('returns the same request on repeated call', async () => {
    const first = await createBonusSubscriptionRequest({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })
    const second = await createBonusSubscriptionRequest({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.request.id).toBe(first.request.id)
  })

  it('creates a single record for two parallel create calls', async () => {
    const [first, second] = await Promise.all([
      createBonusSubscriptionRequest({
        userId: 'user-1',
        campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
      }),
      createBonusSubscriptionRequest({
        userId: 'user-1',
        campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
      }),
    ])

    expect([first.created, second.created].sort()).toEqual([false, true])
    expect(first.request.id).toBe(second.request.id)
    expect(mockState.requests.size).toBe(1)
  })

  it('allows separate requests for different users', async () => {
    await createBonusSubscriptionRequest({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })
    await createBonusSubscriptionRequest({
      userId: 'user-2',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })

    expect(mockState.requests.size).toBe(2)
  })

  it('allows separate requests for another campaign', async () => {
    const first = await createBonusSubscriptionRequest({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })
    const second = await createBonusSubscriptionRequest({
      userId: 'user-1',
      campaign: 'FOCUS_AUGUST_2026',
    })

    expect(first.request.id).not.toBe(second.request.id)
    expect(mockState.requests.size).toBe(2)
  })

  it('throws for unknown userId', async () => {
    await expect(createBonusSubscriptionRequest({
      userId: 'missing-user',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })).rejects.toBeInstanceOf(BonusSubscriptionRequestUserNotFoundError)

    expect(mockState.requests.size).toBe(0)
  })

  it('does not create Payment or ProductSubscription or change lifecycle state', async () => {
    const beforeLifecycle = mockState.users.get('user-1')?.lifecycleState

    await createBonusSubscriptionRequest({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })

    expect(mockState.paymentLogCount).not.toHaveBeenCalled()
    expect(mockState.productSubscriptionCount).not.toHaveBeenCalled()
    expect(mockState.userUpdate).not.toHaveBeenCalled()
    expect(mockState.users.get('user-1')?.lifecycleState).toBe(beforeLifecycle)
  })

  it('returns NONE when no request exists', async () => {
    const state = await getBonusSubscriptionRequestState({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })

    expect(state).toEqual({
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
      status: 'NONE',
      requestedAt: null,
      decidedAt: null,
    })
  })

  it('returns PENDING when request exists', async () => {
    const created = await createBonusSubscriptionRequest({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })

    const state = await getBonusSubscriptionRequestState({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })

    expect(state.status).toBe('PENDING')
    expect(state.requestedAt?.toISOString()).toBe(created.request.requestedAt.toISOString())
    expect(state.decidedAt).toBeNull()
  })

  it('does not mask unexpected DB errors as duplicates', async () => {
    const originalCreate = (await import('../../../db/client.ts')).prisma.bonusSubscriptionRequest.create
    vi.mocked(originalCreate).mockRejectedValueOnce(new Error('DB_DOWN'))

    await expect(createBonusSubscriptionRequest({
      userId: 'user-1',
      campaign: BONUS_SUBSCRIPTION_FOCUS_JULY_2026,
    })).rejects.toThrow('DB_DOWN')
  })
})
