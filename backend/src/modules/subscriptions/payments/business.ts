// backend/src/modules/subscriptions/payments/business.ts
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client.js';

export type PaymentData = {
  userId: string;
  productId: string;
  amount: number;
  payRef: string;
};

export async function processPayment({ userId, productId, amount, payRef }: PaymentData) {
  console.log('💰 Payment start', { userId, productId, amount, payRef });

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_productId: { userId, productId } },
    update: { payRef, amount, updatedAt: new Date() },
    create: { id: randomUUID(), userId, productId, payRef, amount },
  });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { status: 'failed', reason: 'PRODUCT_NOT_FOUND', userId };

  console.log('✅ Enrollment & product OK', enrollment.id, product.id);
  return { status: 'approved', userId, product, enrollment };
}
