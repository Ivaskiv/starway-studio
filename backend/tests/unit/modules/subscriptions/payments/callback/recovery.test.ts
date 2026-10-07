import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  checkStatus: vi.fn(),
  processPayment: vi.fn(),
  notifyCommercePaid: vi.fn(),
}))

vi.mock('@/modules/subscriptions/payments/wayforpay/service.js', () => ({
  checkWayForPayTransactionStatus: (...args: unknown[]) => mocks.checkStatus(...args),
}))

vi.mock('@/modules/subscriptions/payments/callback/processing.js', () => ({
  processPaymentWebhook: (...args: unknown[]) => mocks.processPayment(...args),
}))

vi.mock('@/modules/zoom/commerce/zoom.commerce-telegram.js', () => ({
  notifyCommercePaid: (...args: unknown[]) => mocks.notifyCommercePaid(...args),
}))

vi.mock('@/db/client.js', () => ({ prisma: {} }))

import { recoverApprovedWayForPayCommercePayment } from '@/modules/subscriptions/payments/callback/recovery.js'

describe('recoverApprovedWayForPayCommercePayment', () => {
  const orderReference = 'zoom_commerce_individual_824b0774-1856-46b8-b2a0-1d36d932c598'

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkStatus.mockResolvedValue({
      orderReference,
      transactionStatus: 'Approved',
      amount: 1,
      currency: 'UAH',
      clientAccountId: 'e8262934-9454-4926-b734-65d03bca699e',
      transactionId: 'provider-transaction-1',
    })
    mocks.processPayment.mockResolvedValue({
      duplicate: false,
      scope: 'zoom',
      productId: 'zoom_individual',
      planId: 'single',
      payRef: orderReference,
      amount: 1,
      result: { status: 'approved' },
    })
    mocks.notifyCommercePaid.mockResolvedValue(undefined)
  })

  it('reuses the verified callback completion path idempotently for repeated recovery', async () => {
    await recoverApprovedWayForPayCommercePayment(orderReference)
    mocks.processPayment.mockResolvedValueOnce({
      duplicate: true,
      scope: 'zoom',
      productId: 'zoom_individual',
      planId: 'single',
      payRef: orderReference,
      amount: 1,
      result: { status: 'approved' },
    })
    await recoverApprovedWayForPayCommercePayment(orderReference)

    expect(mocks.checkStatus).toHaveBeenCalledTimes(2)
    expect(mocks.processPayment).toHaveBeenCalledTimes(2)
    expect(mocks.processPayment).toHaveBeenNthCalledWith(1, expect.objectContaining({
      order_reference: orderReference,
      transaction_status: 'Approved',
      amount: 1,
      currency: 'UAH',
      transaction_id: 'provider-transaction-1',
    }), expect.anything())
    expect(mocks.notifyCommercePaid).toHaveBeenCalledTimes(2)
    expect(mocks.notifyCommercePaid).toHaveBeenCalledWith(orderReference)
  })
})
