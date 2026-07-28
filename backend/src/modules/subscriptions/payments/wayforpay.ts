// backend/src/modules/subscriptions/payments/wayforpay.ts
// Ініціалізація платежу WayForPay — генерує форму/посилання для оплати
// Приклад: buildPaymentForm({ userId, productId, amount, payRef }) → { url, signature }

import crypto from 'crypto';
import type { PaymentData } from '../types.js';
import { getWayForPayCallbackUrl } from './callbackUrl.js';

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
  const merchantDomainFromEnv =
    process.env.WAYFORPAY_MERCHANT_DOMAIN?.trim() ||
    process.env.WAYFORPAY_DOMAIN?.trim() ||
    ''
  const merchantDomainFallback = extractMerchantDomainFromUrl(
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
      process.env.PUBLIC_FRONTEND_URL?.trim() ||
      process.env.FRONTEND_URL?.trim() ||
      process.env.WAYFORPAY_CALLBACK_URL?.trim() ||
      process.env.PUBLIC_API_URL?.trim() ||
      process.env.INTERNAL_API_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      process.env.TELEGRAM_WEBHOOK_URL?.trim() ||
      process.env.RENDER_EXTERNAL_URL?.trim() ||
      ''
  )

  return {
    merchantAccount:
      process.env.WAYFORPAY_MERCHANT?.trim() ||
      process.env.WAYFORPAY_MERCHANT_ACCOUNT?.trim() ||
      '',
    merchantDomain:
      merchantDomainFromEnv ||
      merchantDomainFallback ||
      '',
    merchantSecret:
      process.env.WAYFORPAY_SECRET?.trim() ||
      process.env.WAYFORPAY_MERCHANT_SECRET?.trim() ||
      '',
  }
}

/** Генерує HMAC-MD5 підпис для ініціалізаційного запиту WayForPay */
export function generatePaymentSignature(data: PaymentData, orderDate: number): string {
  const { merchantAccount, merchantDomain, merchantSecret } = readWayForPayCredentials()
  const str = [
    merchantAccount,
    merchantDomain,
    data.payRef,
    orderDate.toString(),
    data.amount.toString(),
    data.currency ?? 'EUR',
    ...(data.product_name  ?? [data.productId]),
    ...(data.product_count ?? [1]).map(String),
    ...(data.product_price ?? [data.amount]).map(String),
  ].join(';');

  return crypto.createHmac('md5', merchantSecret).update(str).digest('hex');
}

/** Формує тіло запиту для WayForPay Purchase API */
export function buildPaymentRequest(data: PaymentData): Record<string, unknown> {
  const { merchantAccount, merchantDomain } = readWayForPayCredentials()
  const orderDate = Math.floor(Date.now() / 1000);

  const productNames  = data.product_name  ?? [data.productId];
  const productPrices = data.product_price ?? [data.amount];
  const productCounts = data.product_count ?? [1];

  const signature = generatePaymentSignature(data, orderDate);

  return {
    transactionType:  'CREATE_INVOICE',
    merchantAccount,
    merchantDomainName: merchantDomain,
    merchantSignature: signature,
    apiVersion:        1,
    language:          'UK',
    serviceUrl:        getWayForPayCallbackUrl(),
    orderReference:    data.payRef,
    orderDate,
    amount:            data.amount,
    currency:          data.currency ?? 'EUR',
    clientAccountId:   data.userId,
    productName:       productNames,
    productPrice:      productPrices,
    productCount:      productCounts,
  };
}
