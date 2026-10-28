import { describe, expect, it } from 'vitest'

import { verifySignature } from '@/modules/subscriptions/payments/wayforpay/signature.js'

describe('WayForPay callback signature verification', () => {
  it('rejects an unsigned callback in development mode', () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    expect(verifySignature({
      order_reference: 'zoom_commerce_individual_123',
      amount: 60,
      currency: 'EUR',
      product_name: ['Індивідуальна Zoom-сесія'],
      product_count: [1],
      product_price: [60],
      transaction_status: 'Approved',
    })).toBe(false)

    process.env.NODE_ENV = previousNodeEnv
  })
})
