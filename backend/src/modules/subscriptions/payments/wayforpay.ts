// backend/src/modules/subscriptions/payments/wayforpay.ts
// Ініціалізація платежу WayForPay — генерує форму/посилання для оплати
// Приклад: buildPaymentForm({ userId, productId, amount, payRef }) → { url, signature }

import crypto from 'crypto';
import type { PaymentData } from '../types.js';

const MERCHANT_ACCOUNT  = process.env.WAYFORPAY_MERCHANT_ACCOUNT  ?? '';
const MERCHANT_DOMAIN   = process.env.WAYFORPAY_MERCHANT_DOMAIN   ?? '';
const MERCHANT_SECRET   = process.env.WAYFORPAY_SECRET_KEY        ?? '';
const CALLBACK_URL      = process.env.WAYFORPAY_CALLBACK_URL      ?? '';

/** Генерує HMAC-MD5 підпис для ініціалізаційного запиту WayForPay */
export function generatePaymentSignature(data: PaymentData): string {
  const str = [
    MERCHANT_ACCOUNT,
    MERCHANT_DOMAIN,
    data.payRef,
    Math.floor(Date.now() / 1000).toString(),
    data.amount.toString(),
    data.currency ?? 'EUR',
    ...(data.product_name  ?? [data.productId]),
    ...(data.product_count ?? [1]).map(String),
    ...(data.product_price ?? [data.amount]).map(String),
  ].join(';');

  return crypto.createHmac('md5', MERCHANT_SECRET).update(str).digest('hex');
}

/** Формує тіло запиту для WayForPay Purchase API */
export function buildPaymentRequest(data: PaymentData): Record<string, unknown> {
  const orderDate = Math.floor(Date.now() / 1000);

  const productNames  = data.product_name  ?? [data.productId];
  const productPrices = data.product_price ?? [data.amount];
  const productCounts = data.product_count ?? [1];

  const signature = generatePaymentSignature(data);

  return {
    transactionType:  'CREATE_INVOICE',
    merchantAccount:   MERCHANT_ACCOUNT,
    merchantDomainName: MERCHANT_DOMAIN,
    merchantSignature: signature,
    apiVersion:        1,
    language:          'UK',
    serviceUrl:        CALLBACK_URL,
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