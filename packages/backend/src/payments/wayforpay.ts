// packages/backend/src/payments/wayforpay.ts

import crypto from 'crypto';

export interface PaymentData {
  order_reference: string;
  amount: number;
  currency: string;
  product_name: string[];
  product_price: number[];
  product_count: number[];
  client_email: string;
  client_first_name: string;
  client_last_name: string;
}

export default function generateSignature(data: PaymentData): string {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT || '';
  const merchantSecret = process.env.WAYFORPAY_SECRET_KEY || '';

  const signatureString = [
    merchantAccount,
    data.order_reference,
    data.amount.toString(),
    data.currency,
    ...data.product_name,
    ...data.product_count.map(String),
    ...data.product_price.map(String)
  ].join(';');

  return crypto
    .createHmac('md5', merchantSecret)
    .update(signatureString)
    .digest('hex');
}

export async function handlePaymentCallback(callbackData: any) {
  try {
    const { order_reference, transaction_status, reason_code } = callbackData;

    console.log('💰 Payment callback:', { order_reference, transaction_status });

    if (transaction_status === 'Approved') {
      const [user_id, product_slug] = order_reference.split('_');
      console.log('✅ Payment approved:', { user_id, product_slug });
      
      // TODO: Implement after database models are ready
      // const product = await getProductBySlug(product_slug);
      // await createEnrollment(user_id, product.id);
      // await logPayment(order_reference, transaction_status, user_id, callbackData.amount);
    } else {
      console.log('❌ Payment failed:', { order_reference, reason_code });
    }

    return { success: true };

  } catch (error) {
    const err = error as Error;
    console.error('❌ Payment callback error:', err.message);
    throw err;
  }
}