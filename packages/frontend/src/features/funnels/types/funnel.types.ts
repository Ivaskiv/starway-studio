// packages/frontend/src/features/funnels/funnel.types.ts

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

export const TOTAL_FUNNEL_STEPS = 8
export const ATTEMPTS_PER_FUNNEL_STEP = 3

export const FUNNEL_STEP_DEFINITIONS = [
  {
    order: 1,
    title: 'Назва воронки',
    description: 'Коротка, продаюча назва для твоєї воронки',
    placeholder: 'Наприклад: "AI-Аудит: Де ти втрачаєш гроші за 5 хвилин"',
  },
  {
    order: 2,
    title: 'Цільова аудиторія',
    description: 'Хто саме купить у тебе',
    placeholder: 'Наприклад: Експерти та фрілансери з продуктом, але без стабільних продажів',
  },
  {
    order: 3,
    title: 'Головна біль',
    description: 'Проблема, за яку платять прямо зараз',
    placeholder: 'Наприклад: Продукт є, але продажі нестабільні',
  },
  {
    order: 4,
    title: 'Швидкий результат',
    description: 'Що клієнт отримає за 1–7 днів',
    placeholder: 'Наприклад: PDF-звіт з 3 головними помилками + AI-коментар',
  },
  {
    order: 5,
    title: 'Тип воронки',
    description: 'Який формат тобі ближчий',
    options: ['Швидкий low-ticket', 'Діагностика + консультація', 'Evergreen з підписками'],
  },
  {
    order: 6,
    title: 'Формат основного продукту',
    description: 'Що ти будеш продавати',
    options: ['Консультація', 'Курс/шаблони', 'AI-супровід', 'Чат-бот', 'Підписка'],
  },
  {
    order: 7,
    title: 'Джерело трафіку',
    description: 'Звідки прийдуть ліди',
    options: ['Соцмережі', 'Реклама', 'Органіка', 'База', 'Партнери'],
  },
  {
    order: 8,
    title: 'Фінансова мета',
    description: 'Скільки хочеш заробляти на місяць',
    placeholder: 'Наприклад: 100000 грн',
  },
] as const

export type FunnelStepDefinition = {
  readonly order: number
  readonly title: string
  readonly description: string
  readonly placeholder?: string
  readonly options?: readonly string[]
  readonly rows?: number
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

export interface FunnelGenerationAttempt {
  id: string
  content: string
  isSelected: boolean
}

// export interface FunnelBlueprint {
// name: string
//   audience: string
//   pain: string
//   quickWin: string
//   type: string
//   productFormat: string
//   trafficSource: string
//   targetRevenue: number
//   structure: string[]
// }

export interface Button { id: string; text: string; action: 'next' | 'url' | 'callback' | 'payment'; value?: string; style?: 'primary' | 'secondary' | 'danger' }
export interface FormField { id: string; name: string; type: string; label: string; required: boolean; placeholder?: string; validation?: FieldValidation }
export interface FieldValidation { min?: number; max?: number; pattern?: string; errorMessage?: string }
export interface ConditionRule { field: string; operator: string; value: any; nextStepId: string }
export type PaymentProvider = 'wayforpay' | 'stripe' | 'liqpay' | 'fondy';

export interface FunnelSettings { domain?: string; theme: { primaryColor: string; fontFamily: string } }
export interface FunnelAnalytics { views: number; uniqueVisitors: number; conversions: number; revenue: number; stepAnalytics: StepAnalytics[] }
export interface StepAnalytics { stepId: string; views: number; completions: number; dropoffRate: number; avgTimeSpent: number }
