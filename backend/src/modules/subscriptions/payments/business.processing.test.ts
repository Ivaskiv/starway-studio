import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../lib/funnel/getUserFunnelStage.js', () => ({
  invalidateFunnelStage: vi.fn(async () => undefined),
}))

vi.mock('../../flow-control/service.js', () => ({
  syncLifecycleForUser: vi.fn(async () => undefined),
}))

import {
  processEcosystemPayment,
  resolveStrictNextKyivMonday,
  resolveTrialZoomExpiryDate,
} from './business.processing.js'

describe('trial_zoom payment processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps a Friday registration to the next Monday in Kyiv', () => {
    const monday = resolveStrictNextKyivMonday(new Date('2026-07-31T12:00:00.000Z'))

    expect(monday.toISOString()).toBe('2026-08-03T00:00:00.000Z')
    expect(resolveTrialZoomExpiryDate(new Date('2026-07-31T12:00:00.000Z')).toISOString())
      .toBe('2026-08-03T20:59:59.999Z')
  })

  it('maps a Monday registration to the Monday of the following week in Kyiv', () => {
    const monday = resolveStrictNextKyivMonday(new Date('2026-08-03T08:00:00.000Z'))

    expect(monday.toISOString()).toBe('2026-08-10T00:00:00.000Z')
    expect(resolveTrialZoomExpiryDate(new Date('2026-08-03T08:00:00.000Z')).toISOString())
      .toBe('2026-08-10T20:59:59.999Z')
  })

  it('stores trial_zoom as a separate paid trial entitlement without activating focus', async () => {
    const userUpdate = vi.fn()
    const productSubscriptionUpsert = vi.fn()
    const subscriptionFindFirst = vi.fn().mockResolvedValue(null)
    const subscriptionCreate = vi.fn()

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
          trialEndsAt: new Date('2026-08-03T20:59:59.999Z'),
        }),
        create: expect.objectContaining({
          status: 'trial',
          amount: 1,
          expiresAt: null,
          trialEndsAt: new Date('2026-08-03T20:59:59.999Z'),
        }),
      }),
    )
    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planCode: 'trial_zoom:single',
          currentPeriodEnd: new Date('2026-08-03T20:59:59.999Z'),
        }),
      }),
    )
    expect(userUpdate).not.toHaveBeenCalled()
  })
})
