// frontend/src/features/aiDecisionEngine/engine/subscription/upsell.logic.ts
import { DecisionContext, UpsellResult } from '../../types/decisions.types';

export const resolveUpsell = (ctx: DecisionContext): UpsellResult | null => {
  if (ctx.subscriptionTier !== 'trial') return null;

  if (ctx.trialDay === 4) {
    return {
      upsell: {
        productIds: ['subscription-paid'],
        reason: 'Trial Day 4 - пропонуємо підписку',
      },
    };
  }

  if (ctx.streakDays >= 5) {
    return {
      upsell: {
        productIds: ['course-state-key'],
        reason: 'Streak 5+ днів - пропонуємо курс',
      },
    };
  }

  return null;
};
