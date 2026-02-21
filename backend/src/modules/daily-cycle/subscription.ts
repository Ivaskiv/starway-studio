// backend/src/modules/daily-cycle/daily.subscription.ts
import type { User } from '@prisma/client';
import type { DailyAccess } from './types.js';

export function checkDailyAccess(user: User): DailyAccess {
  const now = new Date();

  // ACTIVE subscription
  if (user.subscriptionStatus === 'ACTIVE') {
    return {
      canCreateEntry: true,
      historyLimit: null, // unlimited
      microTaskLimit: null,
      pdfAccess: true,
    };
  }

  // TRIAL
  if (user.trialEndsAt && user.trialEndsAt > now) {
    const daysLeft = Math.floor((user.trialEndsAt.getTime() - now.getTime()) / 86400000);

    return {
      canCreateEntry: true,
      historyLimit: 7,
      microTaskLimit: 3,
      pdfAccess: false,
      daysLeft,
    };
  }

  // EXPIRED
  return {
    canCreateEntry: false,
    historyLimit: 0,
    microTaskLimit: 0,
    pdfAccess: false,
  };
}
