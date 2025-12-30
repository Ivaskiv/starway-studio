// packages/shared/src/types/funnel.types.ts

export enum FunnelStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived'
}

export type FunnelTheme = 'orange' | 'green' | 'blue' | 'red' | 'purple' | 'yellow';

export type FunnelStepType = 
  | 'trigger'      // Початок воронки
  | 'email'        // Email повідомлення
  | 'telegram'     // Telegram повідомлення
  | 'payment'      // Оплата (WayForPay)
  | 'gift'         // Видати доступ/подарунок
  | 'segment'      // Розділити аудиторію
  | 'notify'       // Push нотифікація
  | 'delay'        // Затримка
  | 'condition';   // Умова (if/else)

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
  conditions?: StepCondition[];
  nextStepId?: string;
  isActive: boolean;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StepConfig {
  // MESSAGE
  message?: {
    text: string;
    buttons?: Button[];
    media?: Media[];
  };
  
  // FORM
  form?: {
    fields: FormField[];
    submitText: string;
    successMessage?: string;
  };
  
  // PAYMENT
  payment?: {
    amount: number;
    currency: string;
    description: string;
    provider: PaymentProvider;
    successUrl?: string;
    cancelUrl?: string;
  };
  
  // CONDITION
  condition?: {
    rules: ConditionRule[];
    defaultNextStepId?: string;
  };
  
  // DELAY
  delay?: {
    duration: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  
  // WEBHOOK
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    body?: any;
  };
  
  // AI_MENTOR
  aiMentor?: {
    type: 'wheel_of_life' | 'morning_questions' | 'evening_questions' | 'goal_setting';
    questions: string[];
    analysisPrompt: string;
  };
  
  // GAMIFICATION
  gamification?: {
    type: 'points' | 'badge' | 'level' | 'streak';
    reward: number;
    condition?: string;
    badgeIcon?: string;
  };
  
  // EMAIL
  email?: {
    subject: string;
    body: string;
    from?: string;
  };
  
  // SMS
  sms?: {
    text: string;
    from?: string;
  };
}

export interface StepCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater' | 'less' | 'greater_or_equal' | 'less_or_equal';
  value: any;
  nextStepId: string;
}

export interface ConditionRule {
  field: string;
  operator: string;
  value: any;
  nextStepId: string;
}

export interface Button {
  id: string;
  text: string;
  action: 'next' | 'url' | 'callback' | 'payment';
  value?: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface Media {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio';
  url: string;
  filename?: string;
  size?: number;
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: SelectOption[];
  defaultValue?: any;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  errorMessage?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

// export enum PaymentProvider {
//   WAYFORPAY = 'wayforpay',
//   STRIPE = 'stripe',
//   LIQPAY = 'liqpay',
//   FONDY = 'fondy'
// }

export type PaymentProvider = 'wayforpay' | 'stripe' | 'liqpay' | 'fondy';


export interface FunnelSettings {
  domain?: string;
  theme: {
    primaryColor: string;
    fontFamily: string;
  };
  seo?: {
    title: string;
    description: string;
    keywords: string[];
  };
  integrations?: {
    googleAnalytics?: string;
    facebookPixel?: string;
    telegramBotToken?: string;
  };
}

export interface FunnelAnalytics {
  views: number;
  uniqueVisitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  avgTimeToComplete: number;
  stepAnalytics: StepAnalytics[];
}

export interface StepAnalytics {
  stepId: string;
  views: number;
  completions: number;
  dropoffRate: number;
  avgTimeSpent: number;
}

export interface CreateFunnelRequest {
  name: string;
  description?: string;
  theme?: FunnelTheme; // Додали theme
  template?: string;
}

export interface UpdateFunnelRequest {
  name?: string;
  description?: string;
  theme?: FunnelTheme; // Додали theme
  status?: FunnelStatus;
  steps?: FunnelStep[];
  settings?: Partial<FunnelSettings>;
}

/**
 * Конфігурація теми воронки (Tailwind класи для кольорів)
 */
export const FUNNEL_THEME_CONFIG: Record<FunnelTheme, {
  name: string;
  gradient: string;
  button: string;
  icon: string;
  bg: string;
  text: string;
  border: string;
}> = {
  orange: {
    name: '🟠 Помаранчева',
    gradient: 'bg-gradient-orange',
    button: 'gradient-button',
    icon: 'icon-container-orange',
    bg: 'bg-orange-500/20',
    text: 'text-orange-500',
    border: 'border-orange-500/30',
  },
  green: {
    name: '🟢 Зелена',
    gradient: 'bg-gradient-green',
    button: 'button-green',
    icon: 'icon-container-green',
    bg: 'bg-green-500/20',
    text: 'text-green-500',
    border: 'border-green-500/30',
  },
  blue: {
    name: '🔵 Синя',
    gradient: 'bg-gradient-blue',
    button: 'button-blue',
    icon: 'icon-container-blue',
    bg: 'bg-blue-500/20',
    text: 'text-blue-500',
    border: 'border-blue-500/30',
  },
  red: {
    name: '🔴 Червона',
    gradient: 'bg-gradient-red',
    button: 'button-red',
    icon: 'icon-container-red',
    bg: 'bg-red-500/20',
    text: 'text-red-500',
    border: 'border-red-500/30',
  },
  purple: {
    name: '🟣 Фіолетова',
    gradient: 'bg-gradient-purple',
    button: 'button-purple',
    icon: 'icon-container-purple',
    bg: 'bg-purple-500/20',
    text: 'text-purple-500',
    border: 'border-purple-500/30',
  },
  yellow: {
    name: '🟡 Жовта',
    gradient: 'bg-gradient-yellow',
    button: 'button-yellow',
    icon: 'icon-container-yellow',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-500',
    border: 'border-yellow-500/30',
  },
};

/**
 * Хелпер для отримання конфігурації теми
 */
export const getFunnelThemeConfig = (theme: FunnelTheme = 'orange') => {
  return FUNNEL_THEME_CONFIG[theme];
};

/**
 * Список всіх доступних тем для вибору
 */
export const AVAILABLE_THEMES: FunnelTheme[] = ['orange', 'green', 'blue', 'red', 'purple', 'yellow'];