// backend/src/modules/subscriptions/payments/callback.ts
// Express handler для WayForPay webhook — верифікує підпис, обробляє платіж, логує
// Приклад: POST /api/subscriptions/payments/wayforpay/callback

import type { Request, Response } from 'express';
import { prisma } from '@/db/client.js';
import type { PaymentCallbackData } from '../types.js';
import { processPayment } from './business.js';
import { verifySignature } from './crypto.js';

/** WayForPay callback handler — публічний ендпоінт (без authRequired) */
export async function wayForPayCallback(req: Request, res: Response) {
  try {
    const data = req.body as PaymentCallbackData;

    // fix: timingSafeEqual в crypto.ts захищає від timing attack
    if (!verifySignature(data)) {
      console.warn('⚠️ Invalid WayForPay signature');
      return res.status(400).send('FAIL');
    }

    if (data.transaction_status !== 'Approved') {
      return res.status(200).send('OK'); // non-Approved — ігноруємо без помилки
    }

    const userId   = data.clientAccountId;
    const productId = data.product_name?.[0];
    const payRef   = data.order_reference;
    const amount   = Number(data.amount);

    if (!userId || !productId || !payRef || isNaN(amount)) {
      console.error('❌ Missing required callback fields', { userId, productId, payRef, amount });
      return res.status(400).send('FAIL');
    }

    const result = await processPayment({ userId, productId, amount, payRef });

    // Логуємо в PaymentLog незалежно від результату
    await prisma.paymentLog.create({
      data: {
        userId,
        expertId:   productId, // тимчасово — productId як expertId поки не маємо expertId в callback
        amountCents: Math.round(amount * 100),
        currency:   data.currency ?? 'EUR',
        status:     result.status === 'approved' ? 'SUCCESS' : 'FAILED',
        metadata:   { payRef, transaction_id: data.transaction_id ?? null, result },
      },
    });

    return res.status(200).send('OK');
  } catch (err) {
    console.error('💥 Payment callback error', err);
    return res.status(500).send('FAIL');
  }
}