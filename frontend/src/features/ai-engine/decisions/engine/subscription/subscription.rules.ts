import { DecisionContext } from '../../types/decisions.types';

export const questionsSchedulerRule = async (ctx: DecisionContext) => {
  return {
    generateMicroTask: true,
    generateSupport: true,
    allowUpsell: ctx.subscriptionTier === 'trial',
    allowPDF: ctx.streakDays >= 3,
  };
};
