// backend/src/payments/crypto.ts
import crypto from 'crypto';
import { PaymentCallbackData } from '../../../types/types.js';

const MERCHANT_ACCOUNT = process.env.WAYFORPAY_MERCHANT_ACCOUNT || '';
const MERCHANT_SECRET = process.env.WAYFORPAY_SECRET_KEY || '';

export function generateSignature(data: PaymentCallbackData): string {
  const signatureString = [
    MERCHANT_ACCOUNT,
    data.order_reference,
    data.amount.toString(),
    data.currency,
    ...(data.product_name || []),
    ...(data.product_count || []).map(String),
    ...(data.product_price || []).map(String),
  ].join(';');

  return crypto.createHmac('md5', MERCHANT_SECRET).update(signatureString).digest('hex');
}

export function verifySignature(data: PaymentCallbackData): boolean {
  const calculated = generateSignature(data);
  return calculated === data.merchant_signature;
}
