import type { DecisionContext } from '@/features/ai-engine/decisions/types/decisions.types';

// Subscription-specific decision rules
export const questionsSchedulerRule = async (ctx: DecisionContext) => {
  return {
    generateMicroTask: true,
    generateSupport: true,
    allowUpsell: ctx.subscriptionTier === 'trial',
    allowPDF: ctx.streakDays >= 3,
  };
};
