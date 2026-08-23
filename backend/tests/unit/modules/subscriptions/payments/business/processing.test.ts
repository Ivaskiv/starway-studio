import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockAccessUserFindUnique = vi.fn()
const mockAccessProductSubscriptionFindFirst = vi.fn()
const mockAccessProductSubscriptionFindMany = vi.fn()
const mockAccessZoomSessionAttendeeFindFirst = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockAccessUserFindUnique(...args),
    },
    productSubscription: {
      findFirst: (...args: unknown[]) => mockAccessProductSubscriptionFindFirst(...args),
      findMany: (...args: unknown[]) => mockAccessProductSubscriptionFindMany(...args),
    },
    zoomSessionAttendee: {
      findFirst: (...args: unknown[]) => mockAccessZoomSessionAttendeeFindFirst(...args),
    },
  },
}))

vi.mock('@/lib/funnel/getUserFunnelStage.js', () => ({
  invalidateFunnelStage: vi.fn(async () => undefined),
}))

vi.mock('@/modules/flow-control/service.js', () => ({
  syncLifecycleForUser: vi.fn(async () => undefined),
}))

import {
  processEcosystemPayment,
  resolveTrialZoomExpiryDate,
} from '@/modules/subscriptions/payments/business/processing.ts'
import { getUserAccessState } from '@/modules/subscriptions/payments/focus-access.ts'

describe('trial_zoom payment processing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-22T17:03:28.621Z'))
    vi.clearAllMocks()
    mockAccessUserFindUnique.mockResolvedValue({
      id: 'user-1',
      telegramUserId: '630111093',
      telegramChatId: '630111093',
      testCompletedAt: null,
      deletedAt: null,
    })
    mockAccessZoomSessionAttendeeFindFirst.mockResolvedValue(null)
    mockAccessProductSubscriptionFindMany.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves trial_zoom validity from payment time plus seven days', () => {
    expect(resolveTrialZoomExpiryDate(new Date('2026-08-22T17:03:28.621Z')).toISOString())
      .toBe('2026-08-29T17:03:28.621Z')
  })

  it('persists a fresh 7-day trial_zoom entitlement and canonical access prefers it over an expired old trial', async () => {
    const userUpdate = vi.fn()
    const productSubscriptionUpsert = vi.fn()
    const subscriptionFindFirst = vi.fn().mockResolvedValue(null)
    const subscriptionCreate = vi.fn()
    const paymentTime = new Date('2026-08-22T17:03:28.621Z')
    const freshExpiry = new Date('2026-08-29T17:03:28.621Z')

    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          expertId: 'expert-1',
          currentState: null,
          currentStep: null,
          funnelStage: null,
          createdAt: new Date('2026-07-31T12:00:00.000Z'),
        }),
        update: userUpdate,
      },
      product: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'product-trial',
          code: 'trial_zoom',
          durationDays: 7,
        }),
        upsert: vi.fn(),
      },
      productSubscription: {
        findFirst: vi.fn().mockResolvedValue(null),
        upsert: productSubscriptionUpsert,
      },
      subscription: {
        findFirst: subscriptionFindFirst,
        create: subscriptionCreate,
        update: vi.fn(),
      },
    } as any

    const result = await processEcosystemPayment(
      'trial_zoom',
      'single',
      '11111111-1111-4111-8111-111111111111',
      {
        amount: 1,
        currency: 'UAH',
        payRef: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123',
        orderReference: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123',
      },
      db,
    )

    expect(result).toMatchObject({
      status: 'approved',
      userId: '11111111-1111-4111-8111-111111111111',
      productId: 'trial_zoom',
    })
    expect(productSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: 'trial',
          amount: 1,
          expiresAt: null,
          paidAt: paymentTime,
          trialEndsAt: freshExpiry,
        }),
        create: expect.objectContaining({
          status: 'trial',
          amount: 1,
          expiresAt: null,
          paidAt: paymentTime,
          trialEndsAt: freshExpiry,
        }),
      }),
    )
    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planCode: 'trial_zoom:single',
          currentPeriodEnd: freshExpiry,
        }),
      }),
    )
    expect(userUpdate).not.toHaveBeenCalled()

    mockAccessProductSubscriptionFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        status: 'trial',
        paidAt: paymentTime,
        expiresAt: null,
        trialEndsAt: freshExpiry,
        product: { code: 'trial_zoom' },
      })
      .mockResolvedValueOnce(null)
    mockAccessProductSubscriptionFindMany.mockResolvedValue([
      {
        status: 'trial',
        paidAt: paymentTime,
        expiresAt: null,
        trialEndsAt: freshExpiry,
        product: { code: 'trial_zoom' },
      },
      {
        status: 'trial',
        paidAt: new Date('2026-07-27T10:00:00.000Z'),
        expiresAt: null,
        trialEndsAt: new Date('2026-08-03T20:59:59.999Z'),
        product: { code: 'trial_zoom' },
      },
    ])

    await expect(getUserAccessState('user-1')).resolves.toEqual({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: freshExpiry,
    })
  })
})
