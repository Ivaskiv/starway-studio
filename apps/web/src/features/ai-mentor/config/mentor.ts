// frontend/src/features/ai-mentor/config/mentor.ts
/**
 * AI-MENTOR CONSTANTS
 * Фіксовані значення для всіх модулів
 */

import type {
  CourseType,
  DailyChoice,
  DailyDrain,
  DailyState,
  WheelSphere,
} from '../types/mentor.types';

// ============================================================================
// WHEEL SPHERES (модуль A)
// ============================================================================

export const WHEEL_SPHERES: Record<WheelSphere, { label: string; description: string }> = {
  money: {
    label: 'Гроші',
    description: 'Фінансова стабільність та достаток',
  },
  realization: {
    label: 'Реалізація',
    description: 'Професійні досягнення та самореалізація',
  },
  relationships: {
    label: 'Відносини',
    description: 'Якість особистих та соціальних звʼязків',
  },
  energy: {
    label: 'Енергія / Тіло',
    description: 'Фізичний стан та життєва сила',
  },
  freedom: {
    label: 'Свобода / Час',
    description: 'Часові ресурси та особиста автономія',
  },
  support: {
    label: 'Внутрішня опора',
    description: 'Психологічна стійкість та впевненість',
  },
};

export const WHEEL_SCORE_MIN = 1;
export const WHEEL_SCORE_MAX = 10;

// ============================================================================
// DAILY CYCLE ENUMS (модуль B)
// ============================================================================

export const DAILY_STATES: Record<DailyState, { label: string; emoji: string }> = {
  tension: { label: 'Напруга', emoji: '😰' },
  fear: { label: 'Страх', emoji: '😨' },
  stability: { label: 'Стабільність', emoji: '😌' },
  innerSupport: { label: 'Внутрішня опора', emoji: '💪' },
};

export const DAILY_DRAINS: Record<DailyDrain, { label: string; emoji: string }> = {
  doubt: { label: 'Сумнів', emoji: '🤔' },
  procrastination: { label: 'Прокрастинація', emoji: '⏰' },
  emotional_drain: { label: 'Емоційний злив', emoji: '😢' },
  externalPressure: { label: 'Зовнішній тиск', emoji: '🔥' },
};

export const DAILY_CHOICES: Record<DailyChoice, { label: string; color: string }> = {
  confirmed_old: { label: 'Підтверджувала старе', color: 'text-red-500' },
  chose_new: { label: 'Обрала нове', color: 'text-green-500' },
};

export const MICRO_SUPPORT_DURATION = {
  MIN_MINUTES: 2,
  MAX_MINUTES: 5,
};

export const DAY_FACT_MAX_LENGTH = 200; // символів для 1-2 речень

// ============================================================================
// TRIAL CONFIGURATION (7 днів)
// ============================================================================

export const TRIAL_CONFIG = {
  DURATION_DAYS: 7,
  MIRROR_1_DAY: 4,
  MIRROR_FINAL_DAY: 7,
  DAYS_BEFORE_UPSELL: [5, 6, 7],
} as const;

export const TRIAL_SCHEDULE = {
  1: ['wheel', 'daily_cycle'],
  2: ['daily_cycle'],
  3: ['daily_cycle'],
  4: ['daily_cycle', 'mirror_1'],
  5: ['daily_cycle'],
  6: ['daily_cycle'],
  7: ['daily_cycle', 'final_mirror', 'upsell'],
} as const;

// ============================================================================
// ONBOARDING PAID (72 години)
// ============================================================================

export const ONBOARDING_CONFIG = {
  TOTAL_HOURS: 72,
  STAGES: {
    entry: { start: 0, end: 2 },
    vision: { start: 2, end: 12 },
    goal: { start: 12, end: 24 },
    choice: { start: 24, end: 48 },
    actions: { start: 48, end: 72 },
  },
} as const;

// ============================================================================
// STREAK THRESHOLDS
// ============================================================================

export const STREAK_THRESHOLDS = {
  MENTORSHIP_QUALIFICATION: 30, // днів для пропозиції наставництва
  STRONG_STREAK: 21,
  MEDIUM_STREAK: 14,
  WEAK_STREAK: 7,
  DRAIN_WARNING: 3, // підряд
  RECOVERY_BONUS: 5, // днів після відновлення
} as const;

// ============================================================================
// MINI-COURSES
// ============================================================================

export const MINI_COURSES: Record<
  CourseType,
  {
    title: string;
    description: string;
    price: number;
    triggerPattern: {
      type: 'state' | 'drain' | 'imbalance';
      minDuration: number;
    };
  }
> = {
  state_key_to_change: {
    title: 'Стан — ключ до змін',
    description: 'Навчися керувати своїм станом',
    price: 15,
    triggerPattern: { type: 'state', minDuration: 7 },
  },
  five_points_of_support: {
    title: '5 точок опори',
    description: 'Побудуй надійну систему підтримки',
    price: 20,
    triggerPattern: { type: 'drain', minDuration: 14 },
  },
  system_21: {
    title: 'Система 21',
    description: '21 день до нової звички',
    price: 25,
    triggerPattern: { type: 'drain', minDuration: 21 },
  },
  exit_stagnation: {
    title: 'Алгоритм виходу із застою',
    description: 'Розблокуй своє життя',
    price: 30,
    triggerPattern: { type: 'imbalance', minDuration: 14 },
  },
};

// ============================================================================
// CONSULTATION TRIGGERS
// ============================================================================

export const CONSULTATION_TRIGGERS = {
  PATTERN_REPEAT_MIN_DAYS: 14,
  PATTERN_REPEAT_MAX_DAYS: 21,
  STRONG_IMBALANCE_THRESHOLD: 3, // різниця між сферами
  COURSE_INEFFECTIVE_DAYS: 7, // після завершення курсу
} as const;

// ============================================================================
// ZOOM CONFIGURATION
// ============================================================================

export const ZOOM_CONFIG = {
  FREQUENCY: 'weekly',
  REQUEST_COLLECTION_WINDOW: 48, // годин до сесії
  MAX_REQUESTS_PER_USER: 3,
} as const;

// ============================================================================
// SUBSCRIPTION PRICES
// ============================================================================

export const SUBSCRIPTION_PRICES = {
  MONTHLY: 33,
  YEARLY: 33 * 12 * 0.8, // 20% знижка
  CURRENCY: '€',
} as const;

// ============================================================================
// AI TONE SETTINGS
// ============================================================================

export const AI_TONE = {
  STYLE: 'жорстка ясність',
  AVOID: ['мотивація', 'підтримка', 'ти молодець', 'все буде добре'],
  FOCUS: ['СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ'],
  ROLE: 'керуючий модуль, не психолог',
} as const;

// ============================================================================
// ACCESS MATRIX
// ============================================================================

export const ACCESS_MATRIX = {
  trial: {
    wheel: true,
    daily_cycle: true,
    streak: true,
    mirrors: true,
    vision: false,
    goals: false,
    actions: false,
    zoom: false,
    mentorship: false,
    mini_courses: false,
    consultation: false,
  },
  paid: {
    wheel: true,
    daily_cycle: true,
    streak: true,
    mirrors: true,
    vision: true,
    goals: true,
    actions: true,
    zoom: true,
    mentorship: false, // ручне підключення
    mini_courses: true,
    consultation: true,
  },
  mentor: {
    wheel: true,
    daily_cycle: true,
    streak: true,
    mirrors: true,
    vision: true,
    goals: true,
    actions: true,
    zoom: true,
    mentorship: true,
    mini_courses: true,
    consultation: true,
  },
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION = {
  GOALS_COUNT: { MIN: 5, MAX: 5 },
  ACTIONS_COUNT: { MIN: 2, MAX: 3 },
  DAY_FACT_MIN_CHARS: 10,
  DAY_FACT_MAX_CHARS: 200,
  MICRO_SUPPORT_MIN_CHARS: 5,
  MICRO_SUPPORT_MAX_CHARS: 100,
} as const;
