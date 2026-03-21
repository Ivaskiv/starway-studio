import { SubscriptionContext } from '@/features/subscription/types';
import type { UpsellResult } from '@/features/ai-engine/decisions/types/decisions.types';

export type SubscriptionUpsellResult = UpsellResult & {
  type?: 'subscription' | 'course';
  message?: string;
  product?: string;
};

// upsellResolver.ts
export const resolveUpsell = (ctx: SubscriptionContext): SubscriptionUpsellResult | null => {
  if (ctx.plan !== 'trial') return null;

  if (ctx.trialDay === 4) {
    return {
      type: 'subscription',
      message: 'Ти бачиш патерн. Без дій він повториться.',
      upsell: {
        productIds: ['subscription-paid'],
        reason: 'Trial Day 4 - пропонуємо підписку',
      },
    };
  }

  if (ctx.streakDays >= 5) {
    return {
      type: 'course',
      product: 'Стан — ключ до змін',
      upsell: {
        productIds: ['course-state-key'],
        reason: 'Streak 5+ днів - пропонуємо курс',
      },
    };
  }

  return null;
};
