// packages/backend/src/payments/wayforpay.ts

import crypto from 'crypto';

export interface PaymentData {
  orderReference: string;
  amount: number;
  currency: string;
  productName: string[];
  productPrice: number[];
  productCount: number[];
  clientEmail: string;
  clientFirstName: string;
  clientLastName: string;
}

export default function generateSignature(data: PaymentData): string {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT || '';
  const merchantSecret = process.env.WAYFORPAY_SECRET_KEY || '';

  const signatureString = [
    merchantAccount,
    data.orderReference,
    data.amount.toString(),
    data.currency,
    ...data.productName,
    ...data.productCount.map(String),
    ...data.productPrice.map(String)
  ].join(';');

  return crypto
    .createHmac('md5', merchantSecret)
    .update(signatureString)
    .digest('hex');
}

export async function handlePaymentCallback(callbackData: any) {
  try {
    const { orderReference, transactionStatus, reasonCode } = callbackData;

    console.log('💰 Payment callback:', { orderReference, transactionStatus });

    if (transactionStatus === 'Approved') {
      const [userId, productSlug] = orderReference.split('_');
      console.log('✅ Payment approved:', { userId, productSlug });
      
      // TODO: Implement after database models are ready
      // const product = await getProductBySlug(productSlug);
      // await createEnrollment(userId, product.id);
      // await logPayment(orderReference, transactionStatus, userId, callbackData.amount);
    } else {
      console.log('❌ Payment failed:', { orderReference, reasonCode });
    }

    return { success: true };

  } catch (error) {
    const err = error as Error;
    console.error('❌ Payment callback error:', err.message);
    throw err;
  }
}