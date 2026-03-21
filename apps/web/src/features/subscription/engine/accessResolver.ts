import { ModuleKey, SubscriptionContext } from '@/features/subscription/types';

export const ACCESS_MATRIX: Record<'trial' | 'paid' | 'mentor' | 'admin', Record<ModuleKey, boolean>> = {
  trial: {
    wheel: false,
    dailyCycle: true,
    questionsScheduler: true,
    vision: false,
    goals: false,
    actions: false,
    zoom: false,
    courses: false,
  },
  paid: {
    wheel: true,
    dailyCycle: true,
    questionsScheduler: true,
    vision: true,
    goals: true,
    actions: true,
    zoom: true,
    courses: true,
  },
  mentor: {
    wheel: true,
    dailyCycle: true,
    questionsScheduler: true,
    vision: true,
    goals: true,
    actions: true,
    zoom: true,
    courses: true,
  },
  admin: {
    wheel: true,
    dailyCycle: true,
    questionsScheduler: true,
    vision: true,
    goals: true,
    actions: true,
    zoom: true,
    courses: true,
  },
};

export const resolveModuleAccess = (ctx: SubscriptionContext): Record<ModuleKey, boolean> => {
  const access = ACCESS_MATRIX[ctx.plan as keyof typeof ACCESS_MATRIX];
  if (!access) {
    return {} as Record<ModuleKey, boolean>;
  }

  if (ctx.plan === 'trial') {
    return { ...access, wheel: ctx.trialDay === 1 };
  }

  return access;
};
