import { prisma } from '../../../db/client.js';
import type { PaymentData, PaymentResult } from '../types.js';

/** Upsert enrollment + активація підписки після підтвердження платежу */
export async function processPayment({
  userId,
  productId,
  amount,
  payRef,
}: PaymentData): Promise<PaymentResult> {
  const product = await prisma.product.findUnique({
    where:  { id: productId },
    select: { id: true, durationDays: true, ownerId: true },
  });
  if (!product) return { status: 'failed', userId, reason: 'PRODUCT_NOT_FOUND' };

  // Upsert enrollment — purchased = true після оплати
  const enrollment = await prisma.enrollment.upsert({
    where:  { userId_productId: { userId, productId } },
    update: { purchased: true },
    create: { userId, productId, purchased: true },
    select: { id: true, enrolledAt: true, trialEnd: true },
  });

  // Активація або продовження підписки
  const existingSub = await prisma.subscription.findFirst({
    where:   { userId, expertId: product.ownerId },
    orderBy: { createdAt: 'desc' },
    select:  { id: true },
  });

  const now       = new Date();
  const periodEnd = new Date(now.getTime() + product.durationDays * 86400000);

  if (existingSub) {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data:  { status: 'ACTIVE', currentPeriodEnd: periodEnd },
    });
  } else {
    await prisma.subscription.create({
      data: {
        expertId:        product.ownerId,
        userId,
        status:          'ACTIVE',
        planCode:        payRef,
        currentPeriodEnd: periodEnd,
        startsAt:        now,
      },
    });
  }

  return { status: 'approved', userId, productId, enrollmentId: enrollment.id };
}