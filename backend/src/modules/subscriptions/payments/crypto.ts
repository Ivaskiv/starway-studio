// backend/src/modules/subscriptions/payments/crypto.ts
// HMAC-MD5 підпис для WayForPay (генерація + верифікація)
// Приклад: verifySignature(req.body) → true/false

import crypto from 'crypto';
import type { PaymentCallbackData } from '../types.js';

const MERCHANT_ACCOUNT = process.env.WAYFORPAY_MERCHANT_ACCOUNT ?? process.env.WAYFORPAY_MERCHANT ?? '';
const MERCHANT_SECRET  = process.env.WAYFORPAY_SECRET_KEY       ?? process.env.WAYFORPAY_SECRET ?? '';

/** Будує рядок підпису за специфікацією WayForPay та хешує HMAC-MD5 */
export function generateSignature(data: PaymentCallbackData): string {
  const str = [
    MERCHANT_ACCOUNT,
    data.order_reference,
    data.amount.toString(),
    data.currency,
    ...(data.product_name  ?? []),
    ...(data.product_count ?? []).map(String),
    ...(data.product_price ?? []).map(String),
  ].join(';');

  return crypto.createHmac('md5', MERCHANT_SECRET).update(str).digest('hex');
}

/** Порівнює merchant_signature з обчисленим підписом */
export function verifySignature(data: PaymentCallbackData): boolean {
  if (!data.merchant_signature) return false;
  return crypto.timingSafeEqual(
    Buffer.from(generateSignature(data)),
    Buffer.from(data.merchant_signature),
  );
}
