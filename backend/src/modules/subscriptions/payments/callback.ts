// backend/src/modules/subscriptions/payments/callback.ts
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { prisma } from '@/db/client.js';
import { processPayment } from './business.js';
import { verifySignature } from './crypto.js';
import type { PaymentCallbackData } from '../types.js';

export const wayForPayCallback = async (req: Request, res: Response) => {
  try {
    const data = req.body as PaymentCallbackData;

    if (!verifySignature(data)) return res.status(400).send('FAIL');

    if (data.transaction_status === 'Approved') {
      const userId = data.clientAccountId!;
      const productId = data.product_name?.[0]!;
      const payRef = data.order_reference;
      const amount = Number(data.amount);

      const result = await processPayment({ userId, productId, amount, payRef });
      console.log('✅ Payment processed', result);

      await prisma.paymentLog.create({
        data: { id: randomUUID(), userId, productId, amount, payRef, status: 'approved' },
      });

      return res.status(200).send('OK');
    }

    console.log('⚠️ Payment status', data.transaction_status);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('💥 Payment callback error', err);
    return res.status(500).send('FAIL');
  }
};
