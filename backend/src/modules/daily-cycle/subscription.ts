// backend/src/modules/daily-cycle/subscription.ts

import type { SubscriptionStatus } from '@starway/db/prisma-client';
import type { DailyAccess } from './types.js';

// Інтерфейс для перевірки юзера (витягується з Prisma)
export interface DailyCheckUser {
  subscriptionStatus?: SubscriptionStatus | null;
  trialEndsAt?: Date | null;
}

// Результат перевірки доступу
export interface DailyAccessResult {
  canCreateEntry: boolean;
  historyLimit: number;
}

// Функція перевірки доступу
export function checkDailyAccess(user: DailyCheckUser): DailyAccessResult {
  const now = new Date();
  const isActive = user.subscriptionStatus === 'ACTIVE';

  // Якщо trialEndsAt існує і ще не закінчився
  const inTrial = user.trialEndsAt ? now < user.trialEndsAt : false;

  return {
    canCreateEntry: isActive || inTrial,
    historyLimit: isActive ? 365 : 30, // 365 для ACTIVE, 30 для TRIAL
  };
}