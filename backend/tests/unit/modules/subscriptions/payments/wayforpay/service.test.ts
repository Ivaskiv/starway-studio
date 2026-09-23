import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildPaymentRequest,
  buildWayForPaySignatureFields,
  generatePaymentSignature,
} from '../../../../../../src/modules/subscriptions/payments/wayforpay/service.ts'

const environmentKeys = [
  'WAYFORPAY_MERCHANT',
  'WAYFORPAY_SECRET',
  'WAYFORPAY_MERCHANT_DOMAIN',
  'PUBLIC_FRONTEND_URL',
  'WAYFORPAY_CALLBACK_URL',
] as const
const originalEnvironment = Object.fromEntries(
  environmentKeys.map(key => [key, process.env[key]]),
)

afterEach(() => {
  vi.restoreAllMocks()
  for (const key of environmentKeys) {
    const value = originalEnvironment[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('canonical WayForPay request signer', () => {
  it('uses the public merchant host when the configured domain incorrectly repeats the merchant account', () => {
    process.env.WAYFORPAY_MERCHANT = 'merchant-account'
    process.env.WAYFORPAY_SECRET = 'test-secret'
    process.env.WAYFORPAY_MERCHANT_DOMAIN = 'merchant-account'
    process.env.PUBLIC_FRONTEND_URL = 'https://payments.starway.test/miniapp'
    process.env.WAYFORPAY_CALLBACK_URL = 'https://api.starway.test/api/subscriptions/payments/wayforpay/callback'
    vi.spyOn(Date, 'now').mockReturnValue(1_789_850_000_000)

    const input = {
      userId: 'user-1',
      productId: 'zoom_individual',
      amount: 1,
      currency: 'UAH',
      payRef: 'zoom_commerce_individual_request-1',
      product_name: ['zoom_individual'],
      product_count: [1],
      product_price: [1],
    }
    const payment = buildPaymentRequest(input)
    const orderDate = Number(payment.orderDate)

    expect(payment).toMatchObject({
      merchantAccount: 'merchant-account',
      merchantDomainName: 'payments.starway.test',
      orderReference: input.payRef,
      amount: 1,
      currency: 'UAH',
      productName: ['zoom_individual'],
      productCount: [1],
      productPrice: [1],
    })
    expect(buildWayForPaySignatureFields(input, orderDate)).toEqual([
      String(payment.merchantAccount),
      String(payment.merchantDomainName),
      String(payment.orderReference),
      String(payment.orderDate),
      String(payment.amount),
      String(payment.currency),
      ...(payment.productName as string[]),
      ...(payment.productCount as number[]).map(String),
      ...(payment.productPrice as number[]).map(String),
    ])
    expect(payment.merchantSignature).toBe(generatePaymentSignature(input, orderDate))
  })
})
