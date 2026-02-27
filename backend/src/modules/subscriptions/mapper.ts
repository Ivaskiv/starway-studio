// backend/src/modules/subscriptions/mapper.ts
// Маппер підписок: plan/trial/paid логіка — використовується в service.ts та auth
// Приклад: resolvePlan(user) → { plan: 'trial', isPaid: false, isTrial: true }

import type { PrismaUserSubscriptionLike } from './types.js';

export type SubscriptionPlanResult = 'free' | 'trial' | 'paid';

export interface PlanInfo {
  plan:     SubscriptionPlanResult;
  isPaid:   boolean;
  isTrial:  boolean;
  trialEnd?: Date;
}

/** Визначає поточний план юзера на основі статусу підписки */
export function resolvePlan(user: PrismaUserSubscriptionLike): PlanInfo {
  const now = new Date();

  if (user.subscriptionStatus === 'ACTIVE') {
    return { plan: 'paid', isPaid: true, isTrial: false };
  }

  if (
    user.subscriptionStatus === 'TRIAL' &&
    'trialEndsAt' in user &&
    user.trialEndsAt &&
    user.trialEndsAt > now
  ) {
    return { plan: 'trial', isPaid: false, isTrial: true, trialEnd: user.trialEndsAt };
  }

  return { plan: 'free', isPaid: false, isTrial: false };
}

/** true якщо підписка ACTIVE */
export function hasPaidAccess(user: PrismaUserSubscriptionLike): boolean {
  return resolvePlan(user).isPaid;
}

/** Формує відповідь для frontend (RTK Query) */
export function toAccessResponse(
  user:      PrismaUserSubscriptionLike,
  abilities: Record<string, boolean>,
) {
  const { plan, trialEnd } = resolvePlan(user);
  return {
    plan,
    role:     user.role,
    trialEnd: trialEnd?.toISOString() ?? null,
    abilities,
  };
}