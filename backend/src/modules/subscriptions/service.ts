// backend/src/modules/subscriptions/service.ts
import { prisma } from '@/db/client.js';
import {
  resolvePlan,
  hasPaidAccess,
  type PrismaUserSubscriptionLike,
} from './subscription.mapper.js';

export class SubscriptionService {
  // ==============================
  // Get raw subscription snapshot
  // ==============================
  static async getUserSubscription(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscription: {
          select: {
            startsAt: true,
            endsAt: true,
            autoRenew: true,
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user) return null;

    const snapshot: PrismaUserSubscriptionLike = {
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
    };

    const planInfo = resolvePlan(snapshot);

    return {
      plan: planInfo.plan,
      isPaid: planInfo.isPaid,
      isTrial: planInfo.isTrial,
      trialEnd: planInfo.trialEnd?.toISOString() ?? null,

      // raw subscription (якщо треба UI)
      subscription: user.subscription
        ? {
            startsAt: user.subscription.startsAt?.toISOString(),
            endsAt: user.subscription.endsAt?.toISOString(),
            autoRenew: user.subscription.autoRenew,
          }
        : null,
    };
  }

  // ==============================
  // Paid access (single source)
  // ==============================
  static async hasPaidAccess(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });

    if (!user) return false;

    return hasPaidAccess(user);
  }
}
