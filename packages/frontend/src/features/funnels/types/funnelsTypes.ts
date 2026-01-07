// packages/frontend/src/features/funnels/funnelsTypes.ts

export enum FunnelStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export type FunnelTheme = 'orange' | 'green' | 'blue' | 'red' | 'purple' | 'yellow';

export enum StepType {
  MESSAGE = 'message',
  FORM = 'form',
  PAYMENT = 'payment',
  CONDITION = 'condition',
  DELAY = 'delay',
  WEBHOOK = 'webhook',
  AI_MENTOR = 'ai_mentor',
  GAMIFICATION = 'gamification',
  EMAIL = 'email',
  SMS = 'sms',
  TELEGRAM = 'telegram',
}

export interface Funnel {
  id: string;
  userId: string;
  name: string;
  description?: string;
  theme: FunnelTheme;
  status: FunnelStatus;
  steps: FunnelStep[];
  settings: FunnelSettings;
  analytics: FunnelAnalytics;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelStep {
  id: string;
  type: StepType;
  name: string;
  order: number;
  config: StepConfig;
  nextStepId?: string;
  isActive: boolean;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StepConfig {
  message?: { text: string; buttons?: Button[] };
  form?: { fields: FormField[]; submitText: string; successMessage?: string };
  payment?: { amount: number; currency: string; provider: PaymentProvider; description: string };
  condition?: { rules: ConditionRule[]; defaultNextStepId?: string };
  delay?: { duration: number; unit: 'minutes' | 'hours' | 'days' };
  webhook?: { url: string; method: 'GET' | 'POST' | 'PUT'; headers?: Record<string,string>; body?: any };
  aiMentor?: { type: 'wheel_of_life' | 'morning_questions' | 'evening_questions' | 'goal_setting'; questions: string[]; analysisPrompt: string };
  gamification?: { type: 'points' | 'badge' | 'level' | 'streak'; reward: number };
  email?: { subject: string; body: string; from?: string };
  sms?: { text: string; from?: string };
}

export interface Button { id: string; text: string; action: 'next' | 'url' | 'callback' | 'payment'; value?: string; style?: 'primary' | 'secondary' | 'danger' }
export interface FormField { id: string; name: string; type: string; label: string; required: boolean; placeholder?: string; validation?: FieldValidation }
export interface FieldValidation { min?: number; max?: number; pattern?: string; errorMessage?: string }
export interface ConditionRule { field: string; operator: string; value: any; nextStepId: string }
export type PaymentProvider = 'wayforpay' | 'stripe' | 'liqpay' | 'fondy';

export interface FunnelSettings { domain?: string; theme: { primaryColor: string; fontFamily: string } }
export interface FunnelAnalytics { views: number; uniqueVisitors: number; conversions: number; revenue: number; stepAnalytics: StepAnalytics[] }
export interface StepAnalytics { stepId: string; views: number; completions: number; dropoffRate: number; avgTimeSpent: number }
