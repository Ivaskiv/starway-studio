import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  approveRequest,
  getCalendarRequests,
  getCommerceCheckoutUrl,
  resolveIndividualPaymentDeadline,
  resolveZoomIndividualPaymentTerms,
} from '../../../../src/modules/zoom/commerce/zoom.commerce-request.service.ts'
import {
  buildPaymentRequest,
  generatePaymentSignatureFromPayload,
} from '../../../../src/modules/subscriptions/payments/wayforpay/service.ts'
import {
  buildHostedWayForPayCheckoutHtml,
  buildHostedWayForPayFormInputs,
  refreshCheckoutPayloadForRetry,
} from '../../../../src/modules/subscriptions/api/checkout.ts'

const originalNodeEnv = process.env.NODE_ENV
const paymentEnvKeys = [
  'WAYFORPAY_MERCHANT',
  'WAYFORPAY_SECRET',
  'WAYFORPAY_MERCHANT_DOMAIN',
  'WAYFORPAY_CALLBACK_URL',
  'PUBLIC_API_URL',
  'TELEGRAM_WEBAPP_BASE_URL',
] as const
const originalPaymentEnv = Object.fromEntries(
  paymentEnvKeys.map((key) => [key, process.env[key]]),
)

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
  vi.restoreAllMocks()
  for (const key of paymentEnvKeys) {
    const value = originalPaymentEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('Zoom Individual payment terms', () => {
  it('uses 1 UAH only for development and test runtimes', () => {
    process.env.NODE_ENV = 'development'
    expect(resolveZoomIndividualPaymentTerms()).toEqual({ amount: 1, currency: 'UAH' })

    process.env.NODE_ENV = 'test'
    expect(resolveZoomIndividualPaymentTerms()).toEqual({ amount: 1, currency: 'UAH' })
  })

  it('preserves the production 60 EUR contract', () => {
    process.env.NODE_ENV = 'production'
    expect(resolveZoomIndividualPaymentTerms()).toEqual({ amount: 60, currency: 'EUR' })
  })

  it('uses the shorter of one hour after approval and thirty minutes before the session', () => {
    expect(resolveIndividualPaymentDeadline({
      approvedAt: new Date('2026-09-21T12:00:00.000Z'),
      scheduledAt: new Date('2026-09-21T15:00:00.000Z'),
    }).toISOString()).toBe('2026-09-21T13:00:00.000Z')

    expect(resolveIndividualPaymentDeadline({
      approvedAt: new Date('2026-09-21T11:00:00.000Z'),
      scheduledAt: new Date('2026-09-21T12:00:00.000Z'),
    }).toISOString()).toBe('2026-09-21T11:30:00.000Z')
  })

  it('rounds the payment deadline up to five-minute boundaries without exceeding the session limit', () => {
    const scheduledAt = new Date('2026-09-21T20:00:00.000Z')

    expect(resolveIndividualPaymentDeadline({
      approvedAt: new Date('2026-09-21T15:27:00.000Z'),
      scheduledAt,
    }).toISOString()).toBe('2026-09-21T16:30:00.000Z')
    expect(resolveIndividualPaymentDeadline({
      approvedAt: new Date('2026-09-21T15:30:00.000Z'),
      scheduledAt,
    }).toISOString()).toBe('2026-09-21T16:30:00.000Z')
    expect(resolveIndividualPaymentDeadline({
      approvedAt: new Date('2026-09-21T15:31:00.000Z'),
      scheduledAt,
    }).toISOString()).toBe('2026-09-21T16:35:00.000Z')
    expect(resolveIndividualPaymentDeadline({
      approvedAt: new Date('2026-09-21T15:30:00.001Z'),
      scheduledAt,
    }).toISOString()).toBe('2026-09-21T16:35:00.000Z')
    expect(resolveIndividualPaymentDeadline({
      approvedAt: new Date('2026-09-21T16:31:00.000Z'),
      scheduledAt: new Date('2026-09-21T17:32:00.000Z'),
    }).toISOString()).toBe('2026-09-21T17:02:00.000Z')
  })

  it('refreshes an active approved checkout payload with the current WayForPay domain and signature', async () => {
    process.env.NODE_ENV = 'test'
    process.env.WAYFORPAY_MERCHANT = 'merchant-account'
    process.env.WAYFORPAY_SECRET = 'merchant-secret'
    process.env.WAYFORPAY_CALLBACK_URL = 'https://api.starway.test/callback'
    process.env.PUBLIC_API_URL = 'https://api.starway.test'
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://app.starway.test'
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-21T12:00:00.000Z'))

    const orderReference = 'zoom_commerce_individual_request-1'
    const request = {
      id: 'request-1',
      kind: 'INDIVIDUAL',
      requesterUserId: 'user-1',
      expertId: 'expert-1',
      zoomSessionId: 'session-1',
      scheduledAt: new Date('2030-09-21T18:00:00.000Z'),
      amount: 1,
      currency: 'UAH',
      status: 'APPROVED_PENDING_PAYMENT',
      approvedAt: new Date('2026-09-21T11:00:00.000Z'),
      checkoutOrderReference: orderReference,
    }

    process.env.WAYFORPAY_MERCHANT_DOMAIN = 'old.starway.test'
    const oldPayment = buildPaymentRequest({
      userId: request.requesterUserId,
      productId: 'zoom_individual',
      amount: request.amount,
      currency: request.currency,
      payRef: orderReference,
    })
    process.env.WAYFORPAY_MERCHANT_DOMAIN = 'merchant.starway.test'

    const checkout = {
      id: 'checkout-1',
      token: 'checkout-token',
      payload: {
        ...oldPayment,
        paymentKind: 'zoom_individual',
        zoomCommerceRequestId: request.id,
        zoomSessionId: request.zoomSessionId,
        userId: request.requesterUserId,
      },
      orderReference,
      amount: request.amount,
      currency: request.currency,
      productCode: 'zoom_individual',
      status: 'CREATED',
      expiresAt: new Date('2030-09-21T13:00:00.000Z'),
      invalidatedAt: null,
    }
    const updateCheckout = vi.fn().mockImplementation(async ({ data }) => {
      checkout.payload = data.payload
      checkout.orderReference = data.orderReference
      return checkout
    })
    const tx = {
      $queryRaw: vi.fn(),
      zoomCommerceRequest: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(request),
        findUnique: vi.fn().mockResolvedValue(request),
        findMany: vi.fn().mockResolvedValue([]),
      },
      zoomSession: {
        findUnique: vi.fn().mockResolvedValue({ status: 'SCHEDULED' }),
      },
      checkoutSession: {
        findMany: vi.fn().mockResolvedValue([checkout]),
        update: updateCheckout,
      },
    }
    let transactionActive = false
    const db = {
      $transaction: async (operation: (transaction: typeof tx) => Promise<unknown>) => {
        transactionActive = true
        try {
          return await operation(tx)
        } finally {
          transactionActive = false
        }
      },
    }

    const createInvoice = vi.fn()
      .mockImplementationOnce(async () => {
        expect(transactionActive).toBe(false)
        expect(request.status).toBe('APPROVED_PENDING_PAYMENT')
        throw new Error('WAYFORPAY_INVOICE_CREATION_FAILED: reasonCode=1113, reason=Some error')
      })
      .mockImplementationOnce(async () => {
        expect(transactionActive).toBe(false)
        expect(request.status).toBe('APPROVED_PENDING_PAYMENT')
        return {
          invoiceUrl: 'https://secure.wayforpay.com/pay/invoice?token=invoice-token',
          payload: {},
        }
      })

    await expect(approveRequest(
      request.id,
      request.expertId,
      db as never,
      createInvoice,
    )).rejects.toThrow('WAYFORPAY_INVOICE_CREATION_FAILED: reasonCode=1113, reason=Some error')

    expect(request.status).toBe('APPROVED_PENDING_PAYMENT')
    expect(checkout.orderReference).toBe(orderReference)
    expect((checkout.payload as Record<string, unknown>).wayForPayInvoiceUrl).toBeUndefined()

    await expect(approveRequest(
      request.id,
      request.expertId,
      db as never,
      createInvoice,
    )).resolves.toMatchObject({
      checkoutUrl: 'https://secure.wayforpay.com/pay/invoice?token=invoice-token',
    })
    expect(createInvoice).toHaveBeenCalledTimes(2)

    expect(updateCheckout).toHaveBeenCalledWith(expect.objectContaining({
      where: { token: 'checkout-token' },
      data: expect.objectContaining({
        orderReference,
        amount: 1,
        currency: 'UAH',
        productCode: 'zoom_individual',
        userId: 'user-1',
        payload: expect.objectContaining({
          merchantDomainName: 'merchant.starway.test',
          orderReference,
          zoomCommerceRequestId: request.id,
          zoomSessionId: request.zoomSessionId,
          userId: request.requesterUserId,
          wayForPayInvoiceUrl: 'https://secure.wayforpay.com/pay/invoice?token=invoice-token',
        }),
      }),
    }))
    expect((checkout.payload as Record<string, unknown>).merchantSignature)
      .not.toBe(oldPayment.merchantSignature)
    expect(checkout.orderReference).toBe(orderReference)
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      payRef: orderReference,
      amount: 1,
      currency: 'UAH',
      product_price: [1],
      product_count: [1],
    }))

    await expect(getCommerceCheckoutUrl(
      request.id,
      request.requesterUserId,
      db as never,
      createInvoice,
    )).resolves.toBe('https://secure.wayforpay.com/pay/invoice?token=invoice-token')
    expect(createInvoice).toHaveBeenCalledTimes(2)
  })

  it('keeps the Zoom checkout binding while rebuilding old WayForPay fields when its token opens', () => {
    process.env.NODE_ENV = 'test'
    process.env.WAYFORPAY_MERCHANT = 'merchant-account'
    process.env.WAYFORPAY_SECRET = 'merchant-secret'
    process.env.WAYFORPAY_CALLBACK_URL = 'https://api.starway.test/callback'
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-21T12:00:00.000Z'))

    const orderReference = 'zoom_commerce_individual_request-1'
    process.env.WAYFORPAY_MERCHANT_DOMAIN = 'old.starway.test'
    const oldPayment = buildPaymentRequest({
      userId: 'user-1', productId: 'zoom_individual', amount: 1, currency: 'UAH', payRef: orderReference,
    })
    process.env.WAYFORPAY_MERCHANT_DOMAIN = 'merchant.starway.test'

    const refreshed = refreshCheckoutPayloadForRetry({
      ...oldPayment,
      paymentKind: 'zoom_individual',
      zoomCommerceRequestId: 'request-1',
      zoomSessionId: 'session-1',
      userId: 'user-1',
    })

    expect(refreshed).toMatchObject({
      merchantDomainName: 'merchant.starway.test',
      orderReference,
      paymentKind: 'zoom_individual',
      zoomCommerceRequestId: 'request-1',
      zoomSessionId: 'session-1',
      userId: 'user-1',
    })
    expect(refreshed.merchantSignature).not.toBe(oldPayment.merchantSignature)
  })

  it('renders the refreshed individual payload as a hosted Purchase form with exactly signed values', () => {
    process.env.NODE_ENV = 'test'
    process.env.WAYFORPAY_MERCHANT = 'merchant-account'
    process.env.WAYFORPAY_SECRET = 'merchant-secret'
    process.env.WAYFORPAY_MERCHANT_DOMAIN = 'merchant.starway.test'
    process.env.WAYFORPAY_CALLBACK_URL = 'https://api.starway.test/callback'
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-21T12:00:00.000Z'))

    const orderReference = 'zoom_commerce_individual_request-1'
    const payment = refreshCheckoutPayloadForRetry({
      ...buildPaymentRequest({
        userId: 'user-1', productId: 'zoom_individual', amount: 1, currency: 'UAH', payRef: orderReference,
        product_name: ['Індивідуальна Zoom-сесія'], product_count: [1], product_price: [1],
      }),
      transactionType: 'CREATE_INVOICE',
      paymentKind: 'zoom_individual',
      zoomCommerceRequestId: 'request-1',
      zoomSessionId: 'session-1',
      userId: 'user-1',
    })
    const formInputs = buildHostedWayForPayFormInputs(payment)
    const html = buildHostedWayForPayCheckoutHtml(payment)
    const posted = (name: string) => Array.from(
      html.matchAll(new RegExp(`name="${name}" value="([^"]*)"`, 'g')),
      match => match[1],
    )
    const postedPayload = {
      merchantAccount: posted('merchantAccount')[0],
      merchantDomainName: posted('merchantDomainName')[0],
      orderReference: posted('orderReference')[0],
      orderDate: posted('orderDate')[0],
      amount: posted('amount')[0],
      currency: posted('currency')[0],
      productName: posted('productName\\[\\]'),
      productCount: posted('productCount\\[\\]'),
      productPrice: posted('productPrice\\[\\]'),
    }

    expect(html).toContain('action="https://secure.wayforpay.com/pay"')
    expect(formInputs).not.toContain('transactionType')
    expect(formInputs).toContain('name="merchantTransactionSecureType" value="AUTO"')
    expect(formInputs).toContain('name="merchantAccount" value="merchant-account"')
    expect(formInputs).toContain('name="merchantDomainName" value="merchant.starway.test"')
    expect(formInputs).toContain(`name="orderReference" value="${orderReference}"`)
    expect(formInputs).toContain(`name="orderDate" value="${payment.orderDate}"`)
    expect(formInputs).toContain('name="amount" value="1"')
    expect(formInputs).toContain('name="currency" value="UAH"')
    expect(formInputs).toContain('name="productName[]" value="Індивідуальна Zoom-сесія"')
    expect(formInputs).toContain('name="productCount[]" value="1"')
    expect(formInputs).toContain('name="productPrice[]" value="1"')
    expect(generatePaymentSignatureFromPayload(postedPayload)).toBe(payment.merchantSignature)
  })

  it('keeps the calendar commerce projection read-only', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const transaction = vi.fn()

    await expect(getCalendarRequests({
      zoomSessionIds: ['session-1'],
      requesterUserId: 'user-1',
    }, {
      zoomCommerceRequest: { findMany },
      $transaction: transaction,
    } as never)).resolves.toEqual([])

    expect(findMany).toHaveBeenCalledOnce()
    expect(transaction).not.toHaveBeenCalled()
  })
})
