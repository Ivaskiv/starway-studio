import { prisma } from '../../../db/client.js';
import { syncLifecycleForUser } from '../../flow-control/service.js';
import { invalidateFunnelStage } from '../../../lib/funnel/getUserFunnelStage.js';
import type { PaymentData, PaymentResult } from '../types.js';

const CORE_SUBSCRIPTION_DURATIONS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
  yearly_plus: 365,
}

/** Upsert enrollment + активація підписки після підтвердження платежу */
export async function processPayment({
  userId,
  productId,
  amount,
  payRef,
}: PaymentData): Promise<PaymentResult> {
  if (productId in CORE_SUBSCRIPTION_DURATIONS) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    })

    if (!user) return { status: 'failed', userId, reason: 'USER_NOT_FOUND' }

    const now = new Date()
    const periodEnd = new Date(now.getTime() + CORE_SUBSCRIPTION_DURATIONS[productId] * 86400000)
    const existingSub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: 'ACTIVE',
          planCode: productId,
          startsAt: now,
          trialEndsAt: null,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
          expertId: user.expertId ?? undefined,
          productId: null,
        },
      })
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          expertId: user.expertId ?? undefined,
          status: 'ACTIVE',
          planCode: productId,
          startsAt: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
      })
    }

    await prisma.purchaseHistory.create({
      data: {
        userId,
        expertId: user.expertId ?? undefined,
        amountCents: Math.round(amount * 100),
        currency: 'EUR',
        metadata: {
          kind: 'core_subscription',
          planCode: productId,
          payRef,
        },
      },
    })

    await syncLifecycleForUser(userId)
    await invalidateFunnelStage(userId)

    return {
      status: 'approved',
      userId,
      productId,
      enrollmentId: null,
      expertId: user.expertId ?? null,
    }
  }

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

  await syncLifecycleForUser(userId)
  await invalidateFunnelStage(userId)

  return {
    status: 'approved',
    userId,
    productId,
    enrollmentId: enrollment.id,
    expertId: product.ownerId,
  };
}
