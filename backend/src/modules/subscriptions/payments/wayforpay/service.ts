// backend/src/modules/subscriptions/payments/wayforpay.ts
// Ініціалізація платежу WayForPay — генерує форму/посилання для оплати
// Приклад: buildPaymentForm({ userId, productId, amount, payRef }) → { url, signature }

import crypto from 'crypto';
import type { PaymentData } from '../../types.js';
import { getWayForPayCallbackUrl } from '../callback-url.js';

function extractMerchantDomainFromUrl(raw: string | null | undefined): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''

  try {
    return new URL(value).hostname.trim()
  } catch {
    return value
      .replace(/^[a-z]+:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .trim()
  }
}

export function readWayForPayCredentials() {
  const merchantAccount =
    process.env.WAYFORPAY_MERCHANT?.trim() ||
    process.env.WAYFORPAY_MERCHANT_ACCOUNT?.trim() ||
    ''
  const merchantDomainFromEnv =
    process.env.WAYFORPAY_MERCHANT_DOMAIN?.trim() ||
    process.env.WAYFORPAY_DOMAIN?.trim() ||
    ''
  return {
    merchantAccount,
    merchantDomain: extractMerchantDomainFromUrl(merchantDomainFromEnv),
    merchantSecret:
      process.env.WAYFORPAY_SECRET?.trim() ||
      process.env.WAYFORPAY_MERCHANT_SECRET?.trim() ||
      '',
  }
}

function requireWayForPayCredentials() {
  const credentials = readWayForPayCredentials()

  if (!credentials.merchantAccount || !credentials.merchantDomain || !credentials.merchantSecret) {
    throw new Error('WAYFORPAY_CONFIGURATION_MISSING')
  }

  return credentials
}

type WayForPaySignedPayload = Record<string, unknown>

const WAYFORPAY_API_ENDPOINT = 'https://api.wayforpay.com/api'

export type WayForPayInvoiceResult = {
  invoiceUrl: string
  payload: Record<string, unknown>
}

export type WayForPayCheckStatusResult = {
  orderReference: string
  transactionStatus: string
  amount: number
  currency: string
  clientAccountId?: string
  transactionId?: string
}

function isWayForPayInvoiceSuccess(body: Record<string, unknown>): boolean {
  return body.reason === 'Ok'
    || body.reasonCode === 1100
    || String(body.reasonCode ?? '') === '1100'
}

function wayForPayInvoiceFailureMessage(body: Record<string, unknown>): string {
  const reasonCode = body.reasonCode === undefined ? 'unknown' : String(body.reasonCode)
  const reason = body.reason === undefined ? 'unknown' : String(body.reason)
  return `WAYFORPAY_INVOICE_CREATION_FAILED: reasonCode=${reasonCode}, reason=${reason}`
}

function normalizedArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => item === null || item === undefined)) {
    throw new Error(`WAYFORPAY_INVALID_${field.toUpperCase()}`)
  }
  return value.map(String)
}

export function buildWayForPaySignatureFieldsFromPayload(payload: WayForPaySignedPayload): string[] {
  const merchantAccount = String(payload.merchantAccount ?? '').trim()
  const merchantDomainName = String(payload.merchantDomainName ?? '').trim()
  const orderReference = String(payload.orderReference ?? '').trim()
  const orderDate = String(payload.orderDate ?? '').trim()
  const amount = String(payload.amount ?? '').trim()
  const currency = String(payload.currency ?? '').trim()

  if (!merchantAccount || !merchantDomainName || !orderReference || !orderDate || !amount || !currency) {
    throw new Error('WAYFORPAY_INVALID_SIGNED_PAYLOAD')
  }

  return [
    merchantAccount,
    merchantDomainName,
    orderReference,
    orderDate,
    amount,
    currency,
    ...normalizedArray(payload.productName, 'product_name'),
    ...normalizedArray(payload.productCount, 'product_count'),
    ...normalizedArray(payload.productPrice, 'product_price'),
  ]
}

export function buildWayForPaySignatureFields(data: PaymentData, orderDate: number): string[] {
  const { merchantAccount, merchantDomain } = requireWayForPayCredentials()
  return buildWayForPaySignatureFieldsFromPayload({
    merchantAccount,
    merchantDomainName: merchantDomain,
    orderReference: data.payRef,
    orderDate,
    amount: data.amount,
    currency: data.currency ?? 'EUR',
    productName: data.product_name ?? [data.productId],
    productCount: data.product_count ?? [1],
    productPrice: data.product_price ?? [data.amount],
  })
}

/** Генерує HMAC-MD5 підпис для ініціалізаційного запиту WayForPay */
export function generatePaymentSignature(data: PaymentData, orderDate: number): string {
  const { merchantSecret } = requireWayForPayCredentials()
  const str = buildWayForPaySignatureFields(data, orderDate).join(';');

  return crypto.createHmac('md5', merchantSecret).update(str).digest('hex');
}

export function generatePaymentSignatureFromPayload(payload: WayForPaySignedPayload): string {
  const { merchantSecret } = requireWayForPayCredentials()
  return crypto
    .createHmac('md5', merchantSecret)
    .update(buildWayForPaySignatureFieldsFromPayload(payload).join(';'))
    .digest('hex')
}

/** Signs a WayForPay CHECK_STATUS request for one existing provider order. */
export function generateWayForPayCheckStatusSignature(orderReference: string): string {
  const { merchantAccount, merchantSecret } = requireWayForPayCredentials()
  const normalizedOrderReference = String(orderReference ?? '').trim()
  if (!normalizedOrderReference) throw new Error('WAYFORPAY_CHECK_STATUS_ORDER_REFERENCE_MISSING')

  return crypto
    .createHmac('md5', merchantSecret)
    .update(`${merchantAccount};${normalizedOrderReference}`)
    .digest('hex')
}

/**
 * Reads the provider state of an existing order. This does not create an
 * invoice or alter any local payment state.
 */
export async function checkWayForPayTransactionStatus(
  orderReference: string,
  fetchFn: typeof fetch = fetch,
): Promise<WayForPayCheckStatusResult> {
  const { merchantAccount } = requireWayForPayCredentials()
  const normalizedOrderReference = String(orderReference ?? '').trim()
  if (!normalizedOrderReference) throw new Error('WAYFORPAY_CHECK_STATUS_ORDER_REFERENCE_MISSING')

  const payload = {
    transactionType: 'CHECK_STATUS',
    merchantAccount,
    orderReference: normalizedOrderReference,
    merchantSignature: generateWayForPayCheckStatusSignature(normalizedOrderReference),
    apiVersion: 1,
  }

  let response: Response
  try {
    response = await fetchFn(WAYFORPAY_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('WAYFORPAY_CHECK_STATUS_REQUEST_FAILED')
  }

  let body: Record<string, unknown> | null = null
  try {
    const parsed = await response.json()
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    throw new Error('WAYFORPAY_CHECK_STATUS_RESPONSE_INVALID')
  }

  if (!response.ok || !body) throw new Error('WAYFORPAY_CHECK_STATUS_RESPONSE_INVALID')

  const returnedOrderReference = String(body.orderReference ?? body.order_reference ?? '').trim()
  const transactionStatus = String(body.transactionStatus ?? body.transaction_status ?? '').trim()
  const amount = Number(body.amount)
  const currency = String(body.currency ?? '').trim()

  if (returnedOrderReference !== normalizedOrderReference) {
    throw new Error('WAYFORPAY_CHECK_STATUS_ORDER_REFERENCE_MISMATCH')
  }
  if (transactionStatus !== 'Approved') {
    throw new Error(`WAYFORPAY_CHECK_STATUS_NOT_APPROVED: transactionStatus=${transactionStatus || 'unknown'}`)
  }
  if (!Number.isFinite(amount) || amount <= 0 || !currency) {
    throw new Error('WAYFORPAY_CHECK_STATUS_RESPONSE_INVALID')
  }

  const clientAccountId = String(body.clientAccountId ?? body.client_account_id ?? '').trim()
  const transactionId = String(body.transactionId ?? body.transaction_id ?? '').trim()
  return {
    orderReference: returnedOrderReference,
    transactionStatus,
    amount,
    currency,
    ...(clientAccountId ? { clientAccountId } : {}),
    ...(transactionId ? { transactionId } : {}),
  }
}

/** Формує hosted Purchase payload for https://secure.wayforpay.com/pay. */
export function buildPaymentRequest(data: PaymentData): Record<string, unknown> {
  const { merchantAccount, merchantDomain } = requireWayForPayCredentials()
  const orderDate = Math.floor(Date.now() / 1000);

  const productNames  = data.product_name  ?? [data.productId];
  const productPrices = data.product_price ?? [data.amount];
  const productCounts = data.product_count ?? [1];

  const payment = {
    merchantAccount,
    merchantDomainName: merchantDomain,
    apiVersion:        1,
    language:          'UK',
    merchantTransactionSecureType: 'AUTO',
    serviceUrl:        getWayForPayCallbackUrl(),
    orderReference:    data.payRef,
    orderDate,
    amount:            data.amount,
    currency:          data.currency ?? 'EUR',
    clientAccountId:   data.userId,
    productName:       productNames,
    productPrice:      productPrices,
    productCount:      productCounts,
  }

  return {
    ...payment,
    merchantSignature: generatePaymentSignatureFromPayload(payment),
  }
}

/**
 * Creates a request-bound WayForPay invoice. Unlike the hosted /pay form,
 * CREATE_INVOICE returns a URL while preserving the caller's orderReference
 * for the provider callback.
 */
export async function createWayForPayInvoice(
  data: PaymentData,
  fetchFn: typeof fetch = fetch,
): Promise<WayForPayInvoiceResult> {
  const purchase = buildPaymentRequest(data)
  const payload: Record<string, unknown> = {
    transactionType: 'CREATE_INVOICE',
    merchantAccount: purchase.merchantAccount,
    merchantAuthType: 'SimpleSignature',
    merchantDomainName: purchase.merchantDomainName,
    merchantSignature: purchase.merchantSignature,
    apiVersion: 1,
    language: 'UA',
    serviceUrl: purchase.serviceUrl,
    orderReference: purchase.orderReference,
    orderDate: purchase.orderDate,
    amount: purchase.amount,
    currency: purchase.currency,
    productName: purchase.productName,
    productPrice: purchase.productPrice,
    productCount: purchase.productCount,
  }

  let response: Response
  try {
    response = await fetchFn(WAYFORPAY_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('WAYFORPAY_INVOICE_REQUEST_FAILED')
  }

  let body: Record<string, unknown> | null = null
  try {
    const parsed = await response.json()
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    throw new Error('WAYFORPAY_INVOICE_RESPONSE_INVALID')
  }

  if (!body) throw new Error('WAYFORPAY_INVOICE_RESPONSE_INVALID')

  const invoiceUrl = typeof body.invoiceUrl === 'string' ? body.invoiceUrl.trim() : ''
  let isSecureInvoiceUrl = false
  try {
    isSecureInvoiceUrl = new URL(invoiceUrl).protocol === 'https:'
  } catch {
    isSecureInvoiceUrl = false
  }

  if (!response.ok || !isWayForPayInvoiceSuccess(body) || !isSecureInvoiceUrl) {
    throw new Error(wayForPayInvoiceFailureMessage(body))
  }

  return { invoiceUrl, payload }
}
