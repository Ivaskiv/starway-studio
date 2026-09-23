import { beforeEach, describe, expect, it, vi } from 'vitest'

const processEcosystemPaymentMock = vi.fn()
const sendOpsTelegramMessageMock = vi.fn()
const notifyPrivateSessionPaymentMock = vi.fn()

vi.mock('@/lib/payments/registry.js', () => ({
  findByAmount: vi.fn(() => null),
}))

vi.mock('@/modules/ai-mentor/helpers.js', () => ({
  ensureUserExpertId: vi.fn(async () => 'expert-1'),
}))

vi.mock('../../../zoom/battle/battle.service.ts', () => ({
  initiateBattle: vi.fn(),
}))

vi.mock('../../../zoom/service.ts', () => ({
  confirmZoomSwapPaymentByOrderRef: vi.fn(),
}))

vi.mock('../../../zoom/private/zoom.private-booking.service.js', () => ({
  notifyPrivateSessionPayment: (...args: unknown[]) => notifyPrivateSessionPaymentMock(...args),
}))

vi.mock('@/modules/subscriptions/payments/business/service.js', () => ({
  processEcosystemPayment: (...args: unknown[]) => processEcosystemPaymentMock(...args),
  processPayment: vi.fn(),
}))

vi.mock('@/lib/telegram.js', () => ({
  sendOpsTelegramMessage: (...args: unknown[]) => sendOpsTelegramMessageMock(...args),
}))

import { processPaymentWebhook } from '@/modules/subscriptions/payments/callback/processing.ts'

describe('processPaymentWebhook', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const payRef = 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123'

  function createDb() {
    const db: any = {
      $queryRaw: vi.fn(),
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: userId }),
      },
      productSubscription: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      checkoutSession: {
        findFirst: vi.fn().mockResolvedValue({
          amount: 1,
          currency: 'UAH',
          userId,
          productCode: 'trial_zoom',
        }),
      },
      zoomSession: {
        findUnique: vi.fn(),
      },
      zoomSessionAttendee: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      paymentLog: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'pay-1' }),
        update: vi.fn().mockResolvedValue(undefined),
      },
      product: {
        findFirst: vi.fn().mockResolvedValue({ ownerId: 'expert-1' }),
      },
    }
    db.$transaction = vi.fn(async (fn: (tx: typeof db) => unknown) => fn(db))
    return db
  }

  beforeEach(() => {
    vi.clearAllMocks()
    sendOpsTelegramMessageMock.mockResolvedValue(true)
    processEcosystemPaymentMock.mockResolvedValue({
      status: 'approved',
      userId,
      productId: 'trial_zoom',
      enrollmentId: null,
      expertId: 'expert-1',
    })
  })

  it('confirms only the exact individual checkout attendee and is idempotent', async () => {
    const individualPayRef = `zoom_individual_session-1_${userId}_123`
    const db = createDb()
    db.checkoutSession.findFirst.mockResolvedValue({
      amount: 60,
      currency: 'EUR',
      userId,
      productCode: 'zoom_individual',
      payload: { paymentKind: 'zoom_individual', zoomSessionId: 'session-1', userId },
    })
    db.zoomSession.findUnique.mockResolvedValue({
      id: 'session-1', expertId: 'expert-1', status: 'SCHEDULED', _count: { attendees: 0 },
    })
    db.zoomSessionAttendee.findUnique.mockResolvedValue(null)
    db.paymentLog.findUnique.mockResolvedValue(null)
    db.paymentLog.create.mockResolvedValue({ id: 'payment-1' })
    notifyPrivateSessionPaymentMock.mockResolvedValue(undefined)

    const result = await processPaymentWebhook({
      order_reference: individualPayRef,
      amount: 60,
      currency: 'EUR',
      clientAccountId: userId,
      transaction_status: 'Approved',
    }, db)

    expect(result).toMatchObject({
      duplicate: false,
      scope: 'zoom',
      productId: 'zoom_individual',
      result: { status: 'approved', enrollmentId: 'session-1' },
    })
    expect(db.zoomSessionAttendee.create).toHaveBeenCalledWith({
      data: { sessionId: 'session-1', userId, attended: false },
    })
    expect(processEcosystemPaymentMock).not.toHaveBeenCalled()

    db.paymentLog.findUnique.mockResolvedValue({ id: 'payment-1' })
    const duplicate = await processPaymentWebhook({
      order_reference: individualPayRef,
      amount: 60,
      currency: 'EUR',
      clientAccountId: userId,
      transaction_status: 'Approved',
    }, db)
    expect(duplicate.duplicate).toBe(true)
    expect(db.zoomSessionAttendee.create).toHaveBeenCalledTimes(1)
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
    expect(sendOpsTelegramMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('TRIAL_ZOOM_PAID'),
    )
    expect(sendOpsTelegramMessageMock).not.toHaveBeenCalledWith(
      expect.stringContaining('FOCUS_PAID'),
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
    expect(sendOpsTelegramMessageMock).not.toHaveBeenCalled()
  })

  it('treats repeated focus webhook delivery as idempotent', async () => {
    const db = createDb()
    db.paymentLog.findUnique.mockResolvedValue({ id: 'pay-focus-1' })
    db.checkoutSession.findFirst.mockResolvedValueOnce({
      amount: 780,
      currency: 'UAH',
      userId,
      productCode: 'focus',
    })

    const result = await processPaymentWebhook(
      {
        order_reference: 'focus_1month_11111111-1111-4111-8111-111111111111_456',
        amount: 780,
        currency: 'UAH',
        clientAccountId: userId,
        transaction_status: 'Approved',
      },
      db,
    )

    expect(result).toMatchObject({
      duplicate: true,
      scope: 'ecosystem',
      productId: 'focus',
      planId: '1month',
      result: null,
    })
    expect(processEcosystemPaymentMock).not.toHaveBeenCalled()
    expect(db.paymentLog.create).not.toHaveBeenCalled()
  })

  it('keeps FOCUS_PAID ops semantics for canonical focus payments', async () => {
    const focusPayRef = 'focus_1year_11111111-1111-4111-8111-111111111111_456'
    const db = createDb()
    db.checkoutSession.findFirst.mockResolvedValueOnce({
      amount: 1,
      currency: 'UAH',
      userId,
      productCode: 'focus',
    })
    db.productSubscription.findFirst.mockResolvedValueOnce({
      expiresAt: new Date('2026-09-15T17:03:28.621Z'),
    })
    db.subscription.findFirst.mockResolvedValueOnce({
      currentPeriodEnd: new Date('2026-09-21T17:03:28.621Z'),
    })
    processEcosystemPaymentMock.mockResolvedValueOnce({
      status: 'approved',
      userId,
      productId: 'focus',
      enrollmentId: null,
      expertId: 'expert-1',
    })

    const result = await processPaymentWebhook(
      {
        order_reference: focusPayRef,
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
      productId: 'focus',
      planId: '1year',
    })
    expect(sendOpsTelegramMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('✅ Оплату ФОКУС підтверджено'),
    )
    expect(sendOpsTelegramMessageMock).toHaveBeenCalledWith(
      expect.stringContaining(`Order: ${focusPayRef}`),
    )
    expect(sendOpsTelegramMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('Access active until: 2026-09-21T17:03:28.621Z'),
    )
  })
})
