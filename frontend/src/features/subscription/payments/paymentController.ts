// backend/src/modules/subscriptions/payments/paymentController.ts
import { Request, Response } from 'express';
import { buildPaymentRequest } from './wayforpay';

export async function initiateWayforpayPayment(req: Request, res: Response) {
  const { userId, productId, amount, currency, product_name } = req.body;

  if (!userId || !productId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const payRef = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const paymentData = buildPaymentRequest({
    userId,
    productId,
    amount,
    currency,
    payRef,
    product_name: product_name ? [product_name] : undefined,
  });

  res.json({ payment: paymentData });
}
