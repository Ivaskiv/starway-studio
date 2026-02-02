import { ModuleKey, SubscriptionContext } from "@/features/subscriptionEngine/types";

// accessResolver.ts
export const resolveModuleAccess = (
  ctx: SubscriptionContext,
): Record<ModuleKey, boolean> => {
  if (ctx.plan === 'trial') {
    return {
      wheel: ctx.trialDay === 1,
      dailyCycle: true,
      questionsScheduler: true,
      vision: false,
      goals: false,
      actions: false,
      zoom: false,
      courses: false,
    };
  }

  if (ctx.plan === 'paid') {
    return {
      wheel: true,
      dailyCycle: true,
      questionsScheduler: true,
      vision: true,
      goals: true,
      actions: true,
      zoom: true,
      courses: true,
    };
  }

  return {} as any;
};
