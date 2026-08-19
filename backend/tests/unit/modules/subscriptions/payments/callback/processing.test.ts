import { beforeEach, describe, expect, it, vi } from 'vitest'

const processEcosystemPaymentMock = vi.fn()

vi.mock('@/lib/payments/registry.js', () => ({
  findByAmount: vi.fn(() => null),
}))

vi.mock('../../../ai-mentor/helpers.ts', () => ({
  ensureUserExpertId: vi.fn(async () => 'expert-1'),
}))

vi.mock('../../../zoom/battle/battle.service.ts', () => ({
  initiateBattle: vi.fn(),
}))

vi.mock('../../../zoom/service.ts', () => ({
  confirmZoomSwapPaymentByOrderRef: vi.fn(),
}))

vi.mock('../business/service.ts', () => ({
  processEcosystemPayment: (...args: unknown[]) => processEcosystemPaymentMock(...args),
  processPayment: vi.fn(),
}))

import { processPaymentWebhook } from '../callback/processing.ts'

describe('processPaymentWebhook', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const payRef = 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123'

  function createDb() {
    return {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: userId }),
      },
      checkoutSession: {
        findFirst: vi.fn().mockResolvedValue({
          amount: 1,
          currency: 'UAH',
          userId,
          productCode: 'trial_zoom',
        }),
      },
      paymentLog: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'pay-1' }),
        update: vi.fn().mockResolvedValue(undefined),
      },
      product: {
        findFirst: vi.fn().mockResolvedValue({ ownerId: 'expert-1' }),
      },
    } as any
  }

  beforeEach(() => {
    vi.clearAllMocks()
    processEcosystemPaymentMock.mockResolvedValue({
      status: 'approved',
      userId,
      productId: 'trial_zoom',
      enrollmentId: null,
      expertId: 'expert-1',
    })
  })

  it('marks a valid approved trial_zoom callback as paid in database', async () => {
    const db = createDb()

    const result = await processPaymentWebhook(
      {
        order_reference: payRef,
        amount: 1,
        currency: 'UAH',
        clientAccountId: userId,
        transaction_status: 'Approved',
      },
      db,
    )

    expect(result).toMatchObject({
      duplicate: false,
      scope: 'ecosystem',
      productId: 'trial_zoom',
      planId: 'single',
      payRef,
      amount: 1,
      result: {
        status: 'approved',
        userId,
        productId: 'trial_zoom',
      },
    })
    expect(db.checkoutSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderReference: payRef },
      }),
    )
    expect(db.paymentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderReference: payRef,
          userId,
          amountCents: 100,
          currency: 'UAH',
          status: 'PENDING',
        }),
      }),
    )
    expect(processEcosystemPaymentMock).toHaveBeenCalledWith(
      'trial_zoom',
      'single',
      userId,
      expect.objectContaining({
        amount: 1,
        currency: 'UAH',
        payRef,
        orderReference: payRef,
      }),
      db,
    )
    expect(db.paymentLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-1' },
        data: expect.objectContaining({
          status: 'SUCCESS',
          processedAt: expect.any(Date),
        }),
      }),
    )
  })

  it('rejects an approved callback with the wrong amount before PAID is written', async () => {
    const db = createDb()

    const result = await processPaymentWebhook(
      {
        order_reference: payRef,
        amount: 2,
        currency: 'UAH',
        clientAccountId: userId,
        transaction_status: 'Approved',
      },
      db,
    )

    expect(result).toMatchObject({
      duplicate: false,
      productId: 'trial_zoom',
      result: {
        status: 'failed',
        userId,
        reason: 'CHECKOUT_AMOUNT_MISMATCH',
      },
    })
    expect(processEcosystemPaymentMock).not.toHaveBeenCalled()
    expect(db.paymentLog.create).not.toHaveBeenCalled()
    expect(db.paymentLog.update).not.toHaveBeenCalled()
  })

  it('treats repeated trial_zoom webhook delivery as idempotent', async () => {
    const db = createDb()
    db.paymentLog.findUnique.mockResolvedValue({ id: 'pay-1' })

    const result = await processPaymentWebhook(
      {
        order_reference: payRef,
        amount: 1,
        currency: 'UAH',
        clientAccountId: userId,
        transaction_status: 'Approved',
      },
      db,
    )

    expect(result).toMatchObject({
      duplicate: true,
      scope: 'ecosystem',
      productId: 'trial_zoom',
      planId: 'single',
      payRef,
      amount: 1,
      result: null,
    })
    expect(processEcosystemPaymentMock).not.toHaveBeenCalled()
    expect(db.paymentLog.create).not.toHaveBeenCalled()
  })
})
