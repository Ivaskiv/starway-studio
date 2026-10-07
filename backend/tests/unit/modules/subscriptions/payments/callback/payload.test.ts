import { describe, expect, it } from 'vitest'

import { parseWayForPayPayload } from '../../../../../../src/modules/subscriptions/payments/callback/payload.js'

describe('WayForPay callback payload parsing', () => {
  it('decodes the provider JSON retained inside a form-parsed request key', () => {
    const providerPayload = JSON.stringify({
      orderReference: 'zoom_commerce_individual_c1b6821e-f324-41b4-aed5-d36d67daa8d6',
      merchantSignature: '0123456789abcdef0123456789abcdef',
      amount: 1,
      currency: 'UAH',
      transactionStatus: 'Approved',
    })

    expect(parseWayForPayPayload({
      [`payment=${encodeURIComponent(providerPayload)}`]: '',
    })).toMatchObject({
      orderReference: 'zoom_commerce_individual_c1b6821e-f324-41b4-aed5-d36d67daa8d6',
      merchantSignature: '0123456789abcdef0123456789abcdef',
      amount: 1,
      currency: 'UAH',
      transactionStatus: 'Approved',
    })
  })
})
