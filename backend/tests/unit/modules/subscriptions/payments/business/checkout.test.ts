import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockProductSubscriptionFindFirst = vi.fn()
const mockPaymentLogFindFirst = vi.fn()
const mockBuildShortWayForPayCheckoutUrl = vi.fn()
const mockBuildPaymentRequest = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    productSubscription: {
      findFirst: (...args: unknown[]) => mockProductSubscriptionFindFirst(...args),
    },
    paymentLog: {
      findFirst: (...args: unknown[]) => mockPaymentLogFindFirst(...args),
    },
    checkoutSession: {
      upsert: vi.fn(async () => undefined),
    },
  },
}))

vi.mock('@/modules/subscriptions/payments/wayforpay/service.js', () => ({
  buildPaymentRequest: (...args: unknown[]) => mockBuildPaymentRequest(...args),
  readWayForPayCredentials: vi.fn(() => ({
    merchantAccount: 'merchant',
    merchantDomain: 'example.com',
    merchantSecret: 'secret',
  })),
}))

vi.mock('@/modules/subscriptions/payments/wayforpay/checkout.js', () => ({
  buildShortWayForPayCheckoutUrl: (...args: unknown[]) => mockBuildShortWayForPayCheckoutUrl(...args),
  buildShortWayForPayCheckoutUrlSync: vi.fn(() => 'https://checkout.example/sync'),
}))

import { buildEcosystemPaymentCheckoutSession } from '@/modules/subscriptions/payments/business/checkout.ts'

describe('buildEcosystemPaymentCheckoutSession', () => {
  const userId = '11111111-1111-4111-8111-111111111111'

  beforeEach(() => {
    vi.clearAllMocks()
    mockProductSubscriptionFindFirst.mockResolvedValue(null)
    mockPaymentLogFindFirst.mockResolvedValue(null)
    mockBuildShortWayForPayCheckoutUrl.mockResolvedValue('https://checkout.example/trial')
    mockBuildPaymentRequest.mockImplementation((input: Record<string, unknown>) => ({
      ...input,
      orderReference: input.payRef,
    }))
    process.env.NODE_ENV = 'development'
    process.env.PUBLIC_API_URL = 'https://api.starway.test'
    process.env.PUBLIC_FRONTEND_URL = 'https://app.starway.test'
    process.env.WAYFORPAY_CALLBACK_URL = 'https://api.starway.test/api/subscriptions/payments/wayforpay/callback'
  })

  it('builds a real checkout for trial_zoom when the user has not used it yet', async () => {
    const result = await buildEcosystemPaymentCheckoutSession('trial_zoom', 'single', userId, 'telegram')

    expect(result.checkoutUrl).toBe('https://checkout.example/trial')
    expect(result.orderReference).toMatch(/^trial_zoom_single_11111111-1111-4111-8111-111111111111_\d+$/)
    expect(mockBuildShortWayForPayCheckoutUrl).toHaveBeenCalledTimes(1)
    expect(mockBuildPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        productId: 'trial_zoom',
        amount: 1,
        currency: 'UAH',
        product_name: ['Пробний Zoom'],
        product_count: [1],
        product_price: [1],
      }),
    )
    expect(mockBuildShortWayForPayCheckoutUrl).toHaveBeenCalledWith(
      'https://api.starway.test',
      expect.objectContaining({
        amount: 1,
        currency: 'UAH',
        userId,
        productId: 'trial_zoom',
        payRef: expect.stringMatching(
          /^trial_zoom_single_11111111-1111-4111-8111-111111111111_\d+$/,
        ),
        orderReference: expect.stringMatching(
          /^trial_zoom_single_11111111-1111-4111-8111-111111111111_\d+$/,
        ),
        product_name: ['Пробний Zoom'],
        product_count: [1],
        product_price: [1],
        returnUrl:
          'https://api.starway.test/api/subscriptions/payments/wayforpay/return?source=telegram',
      }),
      expect.objectContaining({
        plan: 'single',
        product: 'trial_zoom',
      }),
    )
  })

  it('builds a yearly focus checkout session through the canonical checkout owner', async () => {
    const result = await buildEcosystemPaymentCheckoutSession('focus', '1year', userId, 'telegram')

    expect(result.checkoutUrl).toBe('https://checkout.example/trial')
    expect(result.orderReference).toMatch(/^focus_1year_11111111-1111-4111-8111-111111111111_\d+$/)
    expect(mockBuildPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        productId: 'focus',
        amount: 1,
        currency: 'UAH',
        product_name: ['FOCUS'],
        product_count: [1],
        product_price: [1],
      }),
    )
    expect(mockBuildShortWayForPayCheckoutUrl).toHaveBeenCalledWith(
      'https://api.starway.test',
      expect.objectContaining({
        amount: 1,
        currency: 'UAH',
        payRef: expect.stringMatching(
          /^focus_1year_11111111-1111-4111-8111-111111111111_\d+$/,
        ),
        orderReference: expect.stringMatching(
          /^focus_1year_11111111-1111-4111-8111-111111111111_\d+$/,
        ),
        returnUrl:
          'https://api.starway.test/api/subscriptions/payments/wayforpay/return?source=telegram',
      }),
      expect.objectContaining({
        product: 'focus',
        plan: '1year',
      }),
    )
  })

  it('blocks repeated trial_zoom checkout creation after a prior entitlement', async () => {
    mockProductSubscriptionFindFirst.mockResolvedValueOnce({ id: 'sub-1' })

    await expect(
      buildEcosystemPaymentCheckoutSession('trial_zoom', 'single', userId, 'telegram'),
    ).rejects.toThrow('TRIAL_ZOOM_ALREADY_USED')

    expect(mockBuildShortWayForPayCheckoutUrl).not.toHaveBeenCalled()
  })
})
