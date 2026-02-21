// subscriptionEngine/types.ts
export type SubscriptionPlan =
  | 'trial'
  | 'paid'
  | 'mentor'
  | 'admin';

export type ModuleKey =
  | 'wheel'
  | 'dailyCycle'
  | 'questionsScheduler'
  | 'vision'
  | 'goals'
  | 'actions'
  | 'zoom'
  | 'courses';

export interface SubscriptionContext {
  userId: string;
  plan: SubscriptionPlan;
  streakDays: number;
  trialDay?: number;
  metrics: {
    drains: number;
    stability: number;
  };
}
