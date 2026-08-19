import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockSubscription = {
  status: string
  expiresAt: Date | null
  paidAt: Date | null
  manuallyGrantedBy: string | null
  manualGrantNote: string | null
}

type MockUser = {
  id: string
  telegramUserId: string
  absystemAiActive: boolean
  absystemTrialExpiresAt: Date | null
  absystemGrantSource: 'post_zoom' | 'timeout' | 'direct_purchase' | 'manual' | null
  productSubscriptions: MockSubscription[]
}

const mockState = vi.hoisted(() => {
  const usersByTelegramId = new Map<string, MockUser>()
  const usersById = new Map<string, MockUser>()
  const checkoutCreates: unknown[] = []
  const paymentCreates: unknown[] = []

  function syncUser(user: MockUser) {
    usersByTelegramId.set(user.telegramUserId, user)
    usersById.set(user.id, user)
  }

  return {
    usersByTelegramId,
    usersById,
    checkoutCreates,
    paymentCreates,
    activationCalls: vi.fn(),
    reset() {
      usersByTelegramId.clear()
      usersById.clear()
      checkoutCreates.length = 0
      paymentCreates.length = 0
      this.activationCalls.mockReset()
    },
    seedUser(user: MockUser) {
      syncUser(structuredClone(user))
    },
    getUserById(userId: string) {
      return usersById.get(userId) ?? null
    },
    upsertFocusSubscription(userId: string, subscription: MockSubscription) {
      const user = usersById.get(userId)
      if (!user) throw new Error(`Unknown user ${userId}`)
      user.productSubscriptions = [subscription]
      syncUser(user)
    },
  }
})

vi.mock('../../db/client.ts', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { telegramUserId: string } }) => {
        const user = mockState.usersByTelegramId.get(where.telegramUserId)
        if (!user) return null
        return {
          id: user.id,
          telegramUserId: user.telegramUserId,
          absystemAiActive: user.absystemAiActive,
          absystemTrialExpiresAt: user.absystemTrialExpiresAt,
          absystemGrantSource: user.absystemGrantSource,
          productSubscriptions: user.productSubscriptions.map((subscription) => ({ ...subscription })),
        }
      }),
    },
    checkoutSession: {
      create: vi.fn((payload: unknown) => {
        mockState.checkoutCreates.push(payload)
      }),
    },
    paymentLog: {
      create: vi.fn((payload: unknown) => {
        mockState.paymentCreates.push(payload)
      }),
    },
    $disconnect: vi.fn(),
  },
}))

vi.mock('../../modules/subscriptions/payments/activation.ts', () => ({
  activateProductSubscription: vi.fn(async (params: {
    userId: string
    productCode: string
    source: string
    manualNote?: string
    expiresAtOverride?: Date
    autoBookGroupSessions?: boolean
  }) => {
    mockState.activationCalls(params)
    mockState.upsertFocusSubscription(params.userId, {
      status: 'active',
      expiresAt: params.expiresAtOverride ?? null,
      paidAt: null,
      manuallyGrantedBy: params.source,
      manualGrantNote: params.manualNote ?? null,
    })
    return {
      success: true,
      message: 'activated',
      userId: params.userId,
      source: params.source,
    }
  }),
}))

import {
  LEGACY_FOCUS_EXPIRES_AT,
  importLegacyFocusGifts,
} from '../legacy-focus-gift-import.ts'

describe('legacy-focus-gift-import', () => {
  beforeEach(() => {
    mockState.reset()
  })

  it('grants Focus to an existing Telegram user', async () => {
    mockState.seedUser({
      id: 'user-1',
      telegramUserId: '1001',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
      productSubscriptions: [],
    })

    const result = await importLegacyFocusGifts({
      telegramIds: ['1001'],
      dryRun: false,
    })

    expect(result).toEqual([
      expect.objectContaining({
        telegramUserId: '1001',
        userId: 'user-1',
        status: 'GRANTED',
        plannedExpiresAt: LEGACY_FOCUS_EXPIRES_AT.toISOString(),
      }),
    ])
    expect(mockState.activationCalls).toHaveBeenCalledTimes(1)
  })

  it('second run creates no duplicate subscription', async () => {
    mockState.seedUser({
      id: 'user-1',
      telegramUserId: '1001',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
      productSubscriptions: [],
    })

    await importLegacyFocusGifts({
      telegramIds: ['1001'],
      dryRun: false,
    })
    const second = await importLegacyFocusGifts({
      telegramIds: ['1001'],
      dryRun: false,
    })

    expect(mockState.activationCalls).toHaveBeenCalledTimes(1)
    expect(second[0]?.status).toBe('SKIPPED_ALREADY_GRANTED')
  })

  it('does not shorten an existing later expiresAt', async () => {
    mockState.seedUser({
      id: 'user-2',
      telegramUserId: '1002',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
      productSubscriptions: [{
        status: 'active',
        expiresAt: new Date('2027-08-01T00:00:00Z'),
        paidAt: null,
        manuallyGrantedBy: 'admin_manual',
        manualGrantNote: 'Existing longer grant',
      }],
    })

    const result = await importLegacyFocusGifts({
      telegramIds: ['1002'],
      dryRun: false,
    })

    expect(result[0]?.status).toBe('SKIPPED_LATER_ACCESS')
    expect(mockState.activationCalls).not.toHaveBeenCalled()
  })

  it('returns NOT_FOUND for an unknown Telegram user', async () => {
    const result = await importLegacyFocusGifts({
      telegramIds: ['404'],
      dryRun: false,
    })

    expect(result).toEqual([
      expect.objectContaining({
        telegramUserId: '404',
        userId: null,
        status: 'NOT_FOUND',
      }),
    ])
  })

  it('does not create checkout or payment records', async () => {
    mockState.seedUser({
      id: 'user-3',
      telegramUserId: '1003',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
      productSubscriptions: [],
    })

    await importLegacyFocusGifts({
      telegramIds: ['1003'],
      dryRun: false,
    })

    expect(mockState.checkoutCreates).toEqual([])
    expect(mockState.paymentCreates).toEqual([])
  })

  it('leaves unrelated ABSystem access unchanged', async () => {
    const trialExpiresAt = new Date('2026-09-15T12:00:00Z')
    mockState.seedUser({
      id: 'user-4',
      telegramUserId: '1004',
      absystemAiActive: false,
      absystemTrialExpiresAt: trialExpiresAt,
      absystemGrantSource: 'post_zoom',
      productSubscriptions: [],
    })

    await importLegacyFocusGifts({
      telegramIds: ['1004'],
      dryRun: false,
    })

    const user = mockState.getUserById('user-4')
    expect(user?.absystemAiActive).toBe(false)
    expect(user?.absystemTrialExpiresAt?.toISOString()).toBe(trialExpiresAt.toISOString())
    expect(user?.absystemGrantSource).toBe('post_zoom')
  })
})
