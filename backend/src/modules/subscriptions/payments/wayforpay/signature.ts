// backend/src/modules/subscriptions/payments/crypto.ts
// HMAC-MD5 підпис для WayForPay (генерація + верифікація)
// Приклад: verifySignature(req.body) → true/false

import crypto from 'crypto';
import type { PaymentCallbackData } from '../../types.js';

const MERCHANT_ACCOUNT = process.env.WAYFORPAY_MERCHANT ?? '';
const MERCHANT_SECRET  = process.env.WAYFORPAY_SECRET ?? '';

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
  // FIX 2025-05-25: skip signature check in development
  if (process.env.NODE_ENV === 'development') return true;
  if (!data.merchant_signature) return false;
  const expected = generateSignature(data).trim().toLowerCase();
  const actual = String(data.merchant_signature).trim().toLowerCase();
  // FIX 2026-05-25 SIGNATURE_SAFE: avoid RangeError on malformed/dev signatures.
  if (!/^[0-9a-f]{32}$/i.test(actual)) return false;
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(actual, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
