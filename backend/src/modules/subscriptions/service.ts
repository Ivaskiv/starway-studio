// backend/src/modules/subscriptions/service.ts
// Сервіс підписок: cooldown колеса, plan resolver, getUserSubscriptionInfo
// Приклад: getUserSubscriptionInfo(userId) → { subscription, cooldown }

import { prisma } from '../../db/client.js';
import type { SubscriptionInfo } from './types.js';

export type SubscriptionSnapshot = {
  status: string;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
};

// ── Plan resolver ─────────────────────────────────────────────────────────────

/** Повертає SubscriptionInfo із запису підписки Prisma */
export function toSubscriptionInfo(sub: {
  status:          string;
  trialEndsAt?:    Date | null;
  currentPeriodEnd?: Date | null;
}): SubscriptionInfo {
  const now = new Date();

  if (sub.status === 'ACTIVE') {
    return {
      status:   'active',
      endsAt:   sub.currentPeriodEnd?.toISOString(),
      daysLeft: sub.currentPeriodEnd
        ? Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / 86400000))
        : undefined,
    };
  }

  if (sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt > now) {
    return {
      status:   'trial',
      endsAt:   sub.trialEndsAt.toISOString(),
      daysLeft: Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / 86400000)),
    };
  }

  return { status: 'inactive' };
}

// ── Cooldown ──────────────────────────────────────────────────────────────────

export function resolveWheelCooldownFromSnapshot(
  subscription: SubscriptionSnapshot | null,
  lastEntryAt: Date | null,
  now = new Date(),
): { canFill: boolean; daysLeft: number } {
  if (!subscription) return { canFill: false, daysLeft: 0 };

  const info = toSubscriptionInfo(subscription);

  if (info.status === 'trial') return { canFill: !lastEntryAt, daysLeft: 0 };
  if (info.status !== 'active') return { canFill: false, daysLeft: 0 };
  if (!lastEntryAt) return { canFill: true, daysLeft: 0 };

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (lastEntryAt < monthStart) return { canFill: true, daysLeft: 0 };

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    canFill: false,
    daysLeft: Math.max(0, Math.ceil((nextMonth.getTime() - now.getTime()) / 86400000)),
  };
}

/** Перевіряє чи може юзер заповнити колесо (trial=один раз, paid=раз на місяць) */
export async function getWheelCooldown(userId: string): Promise<{ canFill: boolean; daysLeft: number }> {
  const [sub, lastEntry] = await Promise.all([
    prisma.subscription.findFirst({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      select:  { status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
    prisma.userBalanceEntry.findFirst({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      select:  { createdAt: true },
    }),
  ]);

  return resolveWheelCooldownFromSnapshot(
    sub,
    lastEntry?.createdAt ?? null,
  );
}

// ── getUserSubscriptionInfo ───────────────────────────────────────────────────

/** RTK Query-ready: subscription info + cooldown для frontend */
export async function getUserSubscriptionInfo(userId: string): Promise<{
  subscription: SubscriptionInfo;
  cooldown:     { canFill: boolean; daysLeft: number };
}> {
  const sub = await prisma.subscription.findFirst({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    select:  { status: true, trialEndsAt: true, currentPeriodEnd: true },
  });

  return {
    subscription: sub ? toSubscriptionInfo(sub) : { status: 'inactive' },
    cooldown:     await getWheelCooldown(userId),
  };
}

/** Всі активні підписки юзера (для admin/dashboard) */
export async function getUserSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
  });
}
