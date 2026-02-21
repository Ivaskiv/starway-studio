// backend/src/modules/subscriptions/payments/wayforpay.ts

import { PaymentData } from '@/types/types.js';
import crypto from 'crypto';

export default function generateSignature(data: PaymentData): string {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT || '';
  const merchantSecret = process.env.WAYFORPAY_SECRET_KEY || '';

  const str = [
    merchantAccount,
    data.order_reference,
    data.amount.toString(),
    data.currency,
    ...data.product_name,
    ...data.product_count.map(String),
    ...data.product_price.map(String),
  ].join(';');

  return crypto.createHmac('md5', merchantSecret).update(str).digest('hex');
}

export async function handlePaymentCallback(data: PaymentData) {
  console.log('💰 Payment callback', data);
  // тут можна інтегрувати processPayment, коли product ready
  return { success: true };
}
