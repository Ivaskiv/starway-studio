// backend/src/modules/subscriptions/subscription.mapper.ts
/**
 * Subscription mapper (backend-only)
 *
 * ЄДИНЕ джерело правди для визначення доступу:
 * - subscriptionStatus
 * - trialEndsAt
 * - role
 */

/* =======================
   TYPES
======================= */

export type SubscriptionPlanResult = 'free' | 'trial' | 'paid';

export interface PlanInfo {
  plan: SubscriptionPlanResult;
  isPaid: boolean;
  isTrial: boolean;
  trialEnd?: Date;
}

/**
 * Мінімальний User з Prisma
 * (нічого зайвого)
 */
export interface PrismaUserSubscriptionLike {
  role: string;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
}

/* =======================
   CORE LOGIC
======================= */

/**
 * Визначає план користувача
 * — ЄДИНА бізнес-логіка
 */
export function resolvePlan(user: PrismaUserSubscriptionLike): PlanInfo {
  const now = new Date();

  // 🟢 ACTIVE subscription
  if (user.subscriptionStatus === 'ACTIVE') {
    return {
      plan: 'paid',
      isPaid: true,
      isTrial: false,
    };
  }

  // 🟡 TRIAL
  if (user.trialEndsAt && user.trialEndsAt > now) {
    return {
      plan: 'trial',
      isPaid: false,
      isTrial: true,
      trialEnd: user.trialEndsAt,
    };
  }

  // ⚪ FREE
  return {
    plan: 'free',
    isPaid: false,
    isTrial: false,
  };
}

/* =======================
   HELPERS
======================= */

/**
 * Швидка перевірка paid-доступу
 */
export function hasPaidAccess(user: PrismaUserSubscriptionLike): boolean {
  return resolvePlan(user).isPaid;
}

/**
 * Mapper для API /access/me або /auth/me
 */
export function toAccessResponse(
  user: PrismaUserSubscriptionLike,
  abilities: Record<string, boolean>,
) {
  const planInfo = resolvePlan(user);

  return {
    plan: planInfo.plan,
    role: user.role,
    trialEnd: planInfo.trialEnd
      ? planInfo.trialEnd.toISOString()
      : null,
    abilities,
  };
}
