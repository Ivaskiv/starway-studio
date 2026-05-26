import { describe, expect, it } from 'vitest'

import {
  buildEcosystemPaymentCheckoutUrl,
  resolveEcosystemPaymentPlan,
} from './modules/subscriptions/payments/business.js'

describe('welcome-test focus payment', () => {
  it('maps monthly plan to focus 1month catalog', () => {
    const plan = resolveEcosystemPaymentPlan('focus', '1month')
    expect(plan?.amount).toBe(780)
  })

  it('builds checkout proxy url for focus monthly', () => {
    const url = buildEcosystemPaymentCheckoutUrl('focus', '1month', 'user_test_1')
    expect(url).toContain('/api/payments/wayforpay/checkout')
  })
})
