import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildPaymentRequest,
  buildWayForPaySignatureFields,
  checkWayForPayTransactionStatus,
  createWayForPayInvoice,
  generatePaymentSignature,
  generateWayForPayCheckStatusSignature,
} from '../../../../../../src/modules/subscriptions/payments/wayforpay/service.js'

const environmentKeys = [
  'WAYFORPAY_MERCHANT',
  'WAYFORPAY_MERCHANT_ACCOUNT',
  'WAYFORPAY_SECRET',
  'WAYFORPAY_MERCHANT_SECRET',
  'WAYFORPAY_MERCHANT_DOMAIN',
  'WAYFORPAY_DOMAIN',
  'TELEGRAM_WEBAPP_BASE_URL',
  'TELEGRAM_PUBLIC_FRONTEND_URL',
  'PUBLIC_FRONTEND_URL',
  'FRONTEND_URL',
  'WAYFORPAY_CALLBACK_URL',
  'PUBLIC_API_URL',
] as const
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]])
)

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

function configureCredentials() {
  process.env.WAYFORPAY_MERCHANT = 'merchant-account'
  process.env.WAYFORPAY_SECRET = 'test-secret'
  process.env.WAYFORPAY_MERCHANT_DOMAIN = 'merchant.starway.test'
  process.env.WAYFORPAY_CALLBACK_URL =
    'https://api.starway.test/api/subscriptions/payments/wayforpay/callback'
  delete process.env.WAYFORPAY_MERCHANT_ACCOUNT
  delete process.env.WAYFORPAY_MERCHANT_SECRET
  delete process.env.WAYFORPAY_DOMAIN
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const key of environmentKeys) {
    const value = originalEnvironment[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('canonical WayForPay request signer', () => {
  it('uses the configured merchant domain and preserves the WayForPay signature field order', () => {
    configureCredentials()
    vi.spyOn(Date, 'now').mockReturnValue(1_789_850_000_000)

    const payment = buildPaymentRequest(input)
    const orderDate = Number(payment.orderDate)

    expect(payment).toMatchObject({
      merchantAccount: 'merchant-account',
      merchantDomainName: 'merchant.starway.test',
      orderReference: input.payRef,
      amount: 1,
      currency: 'UAH',
      merchantTransactionSecureType: 'AUTO',
    })
    expect(payment).not.toHaveProperty('transactionType')
    expect(buildWayForPaySignatureFields(input, orderDate)).toEqual([
      'merchant-account',
      'merchant.starway.test',
      input.payRef,
      String(orderDate),
      '1',
      'UAH',
      'zoom_individual',
      '1',
      '1',
    ])
    expect(payment.merchantSignature).toBe(
      generatePaymentSignature(input, orderDate)
    )
  })

  it('does not derive merchant domain or signature from rotating tunnel URLs', () => {
    configureCredentials()
    vi.spyOn(Date, 'now').mockReturnValue(1_789_850_000_000)

    const before = buildPaymentRequest(input)
    process.env.TELEGRAM_WEBAPP_BASE_URL = 'https://first.trycloudflare.com'
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL =
      'https://second.trycloudflare.com'
    process.env.PUBLIC_FRONTEND_URL = 'https://third.trycloudflare.com'
    process.env.PUBLIC_API_URL = 'https://fourth.trycloudflare.com'
    process.env.WAYFORPAY_CALLBACK_URL =
      'https://fifth.trycloudflare.com/callback'
    const after = buildPaymentRequest(input)

    expect(after.merchantDomainName).toBe('merchant.starway.test')
    expect(after.merchantSignature).toBe(before.merchantSignature)
  })

  it('fails before signing when the merchant domain is missing', () => {
    configureCredentials()
    delete process.env.WAYFORPAY_MERCHANT_DOMAIN
    process.env.PUBLIC_FRONTEND_URL = 'https://rotating.trycloudflare.com'

    expect(() => buildPaymentRequest(input)).toThrow(
      'WAYFORPAY_CONFIGURATION_MISSING'
    )
  })

  it('creates a signed CREATE_INVOICE request with the exact dynamic Zoom reference', async () => {
    configureCredentials()
    vi.spyOn(Date, 'now').mockReturnValue(1_789_850_000_000)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reason: 'Ok',
        reasonCode: 1100,
        invoiceUrl:
          'https://secure.wayforpay.com/pay/invoice?token=invoice-token',
      }),
    })

    const result = await createWayForPayInvoice(input, fetchMock as never)
    const [endpoint, options] = fetchMock.mock.calls[0]
    const payload = JSON.parse(String(options.body))

    expect(endpoint).toBe('https://api.wayforpay.com/api')
    expect(options).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(payload).toMatchObject({
      transactionType: 'CREATE_INVOICE',
      merchantAccount: 'merchant-account',
      merchantAuthType: 'SimpleSignature',
      merchantDomainName: 'merchant.starway.test',
      orderReference: input.payRef,
      amount: 1,
      currency: 'UAH',
      productName: ['zoom_individual'],
      productPrice: [1],
      productCount: [1],
      serviceUrl:
        'https://api.starway.test/api/subscriptions/payments/wayforpay/callback',
    })
    expect(payload.merchantSignature).toBe(
      generatePaymentSignature(input, payload.orderDate)
    )
    expect(result.invoiceUrl).toBe(
      'https://secure.wayforpay.com/pay/invoice?token=invoice-token'
    )
    expect(result.payload.orderReference).toBe(input.payRef)
  })

  it.each([{ reason: 'Ok', reasonCode: '1100' }, { reasonCode: 1100 }])(
    'accepts another confirmed CREATE_INVOICE success representation %#',
    async (success) => {
      configureCredentials()

      await expect(
        createWayForPayInvoice(
          input,
          vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              ...success,
              invoiceUrl: 'https://secure.wayforpay.com/invoice/invoice-token',
            }),
          }) as never
        )
      ).resolves.toMatchObject({
        invoiceUrl: 'https://secure.wayforpay.com/invoice/invoice-token',
      })
    }
  )

  it('fails closed with provider diagnostics when CREATE_INVOICE is rejected', async () => {
    configureCredentials()
    await expect(
      createWayForPayInvoice(
        input,
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            reason: 'Some error',
            reasonCode: 1113,
            invoiceUrl: 'https://secure.wayforpay.com/invoice/invoice-token',
          }),
        }) as never
      )
    ).rejects.toThrow(
      'WAYFORPAY_INVOICE_CREATION_FAILED: reasonCode=1113, reason=Some error'
    )
  })

  it('fails closed when CREATE_INVOICE does not return a secure invoice URL', async () => {
    configureCredentials()
    await expect(
      createWayForPayInvoice(
        input,
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            reason: 'Ok',
            reasonCode: 1100,
            invoiceUrl: 'http://insecure.example',
          }),
        }) as never
      )
    ).rejects.toThrow(
      'WAYFORPAY_INVOICE_CREATION_FAILED: reasonCode=1100, reason=Ok'
    )
  })

  it('fails closed on a non-success HTTP response', async () => {
    configureCredentials()
    await expect(
      createWayForPayInvoice(
        input,
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            reason: 'Some error',
            reasonCode: 1113,
            invoiceUrl: 'https://secure.wayforpay.com/invoice/invoice-token',
          }),
        }) as never
      )
    ).rejects.toThrow(
      'WAYFORPAY_INVOICE_CREATION_FAILED: reasonCode=1113, reason=Some error'
    )
  })

  it('reads one exact Approved CHECK_STATUS result with the canonical HMAC-MD5 signature', async () => {
    configureCredentials()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        orderReference: input.payRef,
        transactionStatus: 'Approved',
        amount: 1,
        currency: 'UAH',
        clientAccountId: input.userId,
        transactionId: 'wayforpay-transaction-1',
      }),
    })

    await expect(checkWayForPayTransactionStatus(input.payRef, fetchMock as never)).resolves.toEqual({
      orderReference: input.payRef,
      transactionStatus: 'Approved',
      amount: 1,
      currency: 'UAH',
      clientAccountId: input.userId,
      transactionId: 'wayforpay-transaction-1',
    })

    const [endpoint, options] = fetchMock.mock.calls[0]
    expect(endpoint).toBe('https://api.wayforpay.com/api')
    expect(JSON.parse(String(options.body))).toEqual({
      transactionType: 'CHECK_STATUS',
      merchantAccount: 'merchant-account',
      orderReference: input.payRef,
      merchantSignature: generateWayForPayCheckStatusSignature(input.payRef),
      apiVersion: 1,
    })
  })
})
