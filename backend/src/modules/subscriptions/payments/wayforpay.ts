// backend/src/modules/subscriptions/payments/wayforpay.ts
// Ініціалізація платежу WayForPay — генерує форму/посилання для оплати
// Приклад: buildPaymentForm({ userId, productId, amount, payRef }) → { url, signature }

import crypto from 'crypto';
import type { PaymentData } from '../types.js';
import { getWayForPayCallbackUrl } from './callbackUrl.js';

function readWayForPayCredentials() {
  return {
    merchantAccount: process.env.WAYFORPAY_MERCHANT ?? '',
    merchantDomain: process.env.WAYFORPAY_MERCHANT_DOMAIN ?? '',
    merchantSecret: process.env.WAYFORPAY_SECRET ?? '',
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
