import { SubscriptionContext } from '@/features/subscription/types';

// upsellResolver.ts
export const resolveUpsell = (ctx: SubscriptionContext) => {
  if (ctx.plan !== 'trial') return null;

  if (ctx.trialDay === 4) {
    return {
      type: 'subscription',
      message: 'Ти бачиш патерн. Без дій він повториться.',
    };
  }

  if (ctx.streakDays >= 5) {
    return {
      type: 'course',
      product: 'Стан — ключ до змін',
    };
  }

  return null;
};
