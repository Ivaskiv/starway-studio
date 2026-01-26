// frontend/src/templates/ai-mentor/constants/aiMentor.constants.ts

// ============ TRIAL LOGIC (Кастомізується адміном) ============

// DEFAULT значення для темплейту
export const TRIAL_DEFAULTS = {
  DURATION_DAYS: 7,
  MIN_DURATION_DAYS: 3,
  MAX_DURATION_DAYS: 14
} as const;

// TEMPLATE структури (адмін може змінити при створенні продукту)
export const TRIAL_TIMELINE_TEMPLATE = {
  DAY_1: {
    day: 1,
    module: 'wheel',
    required: true,
    title: 'Колесо балансу',
    description: 'Оцінка 6 сфер життя'
  },
  DAY_1_3: {
    days: [1, 2, 3],
    module: 'daily_cycle',
    required: true,
    title: 'Щоденний цикл',
    description: 'Стан → Злив → Вибір → Факт → Опора'
  },
  DAY_4: {
    day: 4,
    module: 'mirror_1',
    required: false,
    title: 'Дзеркало 1',
    description: 'AI аналіз перших 3 днів'
  },
  DAY_5_7: {
    days: [5, 6, 7],
    module: 'daily_cycle',
    required: true,
    title: 'Продовження циклу',
    description: 'Фіксація змін'
  },
  FINAL_DAY: {
    day: 'last',  // динамічно підставляється
    module: 'final_mirror',
    required: false,
    title: 'Фінальне дзеркало + CTA',
    description: 'Контраст до/після → Paid'
  }
} as const;

// Helper для генерації timeline на основі duration
export const generateTrialTimeline = (durationDays: number) => {
  const timeline = { ...TRIAL_TIMELINE_TEMPLATE };
  
  // Підставити фінальний день
  timeline.FINAL_DAY = {
    ...timeline.FINAL_DAY,
    day: durationDays
  };
  
  // Якщо тривалість інша, адаптувати середні дні
  if (durationDays !== 7) {
    const middleDay = Math.floor(durationDays / 2);
    timeline.DAY_4 = {
      ...timeline.DAY_4,
      day: middleDay
    };
    timeline.DAY_5_7 = {
      ...timeline.DAY_5_7,
      days: Array.from(
        { length: durationDays - middleDay - 1 }, 
        (_, i) => middleDay + 1 + i
      )
    };
  }
  
  return timeline;
};

// ============ PAID ONBOARDING (Кастомізується адміном) ============

// DEFAULT значення для темплейту
export const PAID_DEFAULTS = {
  ONBOARDING_HOURS: 72,
  MIN_ONBOARDING_HOURS: 24,
  MAX_ONBOARDING_HOURS: 168  // 7 днів
} as const;

// TEMPLATE структури
export const PAID_TIMELINE_TEMPLATE = {
  PHASE_1: {
    percentage: 0.03,  // 0-3% від загального часу
    module: 'entry_fix',
    title: 'Фіксація входу',
    description: 'Збереження моменту рішення'
  },
  PHASE_2: {
    percentage: 0.17,  // 3-17% (2-12 год при 72h)
    module: 'vision',
    title: 'Бачення життя',
    description: '3 питання про точку Б'
  },
  PHASE_3: {
    percentage: 0.33,  // 17-33% (12-24 год при 72h)
    module: 'goal',
    title: 'Головна ціль',
    description: '5 цілей → 1 primary'
  },
  PHASE_4: {
    percentage: 0.67,  // 33-67% (24-48 год при 72h)
    module: 'choice',
    title: 'Вибір і рішення',
    description: 'AI перевірка alignment'
  },
  PHASE_5: {
    percentage: 1.0,   // 67-100% (48-72 год при 72h)
    module: 'actions',
    title: 'Дії',
    description: '2-3 дії на 7/14 днів'
  }
} as const;

// Helper для генерації timeline на основі hours
export const generatePaidTimeline = (onboardingHours: number) => {
  return Object.entries(PAID_TIMELINE_TEMPLATE).reduce((acc, [key, phase]) => {
    const startHour = Math.floor(onboardingHours * (phase.percentage - 0.14)); // попередня фаза
    const endHour = Math.floor(onboardingHours * phase.percentage);
    
    acc[key] = {
      ...phase,
      hours: [Math.max(0, startHour), endHour]
    };
    
    return acc;
  }, {} as Record<string, any>);
};

// ============ КОЛЕСО БАЛАНСУ ============

export const WHEEL_AREAS = [
  'money',
  'realization', 
  'relationships',
  'energy',
  'freedom',
  'inner_support'
] as const;

export type WheelArea = typeof WHEEL_AREAS[number];

export const WHEEL_LABELS: Record<WheelArea, string> = {
  money: 'Гроші',
  realization: 'Реалізація',
  relationships: 'Відносини',
  energy: 'Енергія / Тіло',
  freedom: 'Свобода / Час',
  inner_support: 'Внутрішня опора'
};

export const WHEEL_FREQUENCY = {
  TRIAL: 'once',      // День 1
  PAID: 'monthly'     // 1 раз на місяць
} as const;

// ============ ЩОДЕННИЙ ЦИКЛ ============

export const DAILY_STATES = [
  'tension',
  'fear', 
  'stability',
  'inner_support'
] as const;

export type DailyState = typeof DAILY_STATES[number];

export const STATE_LABELS: Record<DailyState, string> = {
  tension: 'Напруга',
  fear: 'Страх',
  stability: 'Стабільність',
  inner_support: 'Внутрішня опора'
};

export const DAILY_SLIPS = [
  'doubt',
  'procrastination',
  'emotional_slip',
  'external_pressure'
] as const;

export type DailySlip = typeof DAILY_SLIPS[number];

export const SLIP_LABELS: Record<DailySlip, string> = {
  doubt: 'Сумнів',
  procrastination: 'Прокрастинація',
  emotional_slip: 'Емоційний злив',
  external_pressure: 'Зовнішній тиск'
};

export const DAILY_CHOICES = [
  'confirmed_old',
  'chose_new'
] as const;

export type DailyChoice = typeof DAILY_CHOICES[number];

export const CHOICE_LABELS: Record<DailyChoice, string> = {
  confirmed_old: 'Підтверджувала старе',
  chose_new: 'Обрала нове'
};

// ============ МІНІ-КУРСИ (AI тригери) ============

export const MINI_COURSES = [
  {
    id: 'state_key',
    title: 'Стан — ключ до змін',
    trigger: 'state_pattern',
    minDays: 5,
    description: 'Розуміння зв\'язку стану та рішень'
  },
  {
    id: 'five_points',
    title: '5 точок опори',
    trigger: 'instability_pattern', 
    minDays: 7,
    description: 'Побудова внутрішньої стабільності'
  },
  {
    id: 'system_21',
    title: 'Система 21',
    trigger: 'habit_pattern',
    minDays: 14,
    description: 'Формування нових звичок'
  },
  {
    id: 'exit_stagnation',
    title: 'Алгоритм виходу із застою',
    trigger: 'stagnation_pattern',
    minDays: 21,
    description: 'Подолання внутрішніх блоків'
  }
] as const;

// ============ КОНСУЛЬТАЦІЯ (Тригери) ============

export const CONSULTATION_TRIGGERS = {
  REPEAT_PATTERN: 14,        // днів повтору сценарію
  STRONG_IMBALANCE: true,    // сильний перекіс у колесі
  COURSES_NO_SHIFT: 21       // курси не дали зсуву
} as const;

// ============ ZOOM (Paid only) ============

export const ZOOM_FREQUENCY = 'weekly' as const;

// ============ PRICING (Кастомізується адміном) ============

// DEFAULT значення для темплейту
export const PRICING_DEFAULTS = {
  TRIAL_DAYS: 7,
  MONTHLY_PRICE: 33,     // EUR
  YEARLY_PRICE: 316,     // EUR (знижка ~20%)
  CURRENCY: 'EUR',
  MIN_MONTHLY_PRICE: 9,
  MAX_MONTHLY_PRICE: 199
} as const;

// Helper для розрахунку yearly з знижкою
export const calculateYearlyPrice = (monthlyPrice: number, discountPercent: number = 20) => {
  const yearlyFull = monthlyPrice * 12;
  return Math.round(yearlyFull * (1 - discountPercent / 100));
};

// ============ МОДУЛІ ТЕМПЛЕЙТУ ============

export const AI_MENTOR_MODULES = [
  {
    id: 'wheel',
    name: 'Колесо балансу',
    required: false,
    customizable: true,
    trial: true,
    paid: true
  },
  {
    id: 'daily_cycle',
    name: 'Щоденний цикл',
    required: true,
    customizable: true,
    trial: true,
    paid: true
  },
  {
    id: 'trial',
    name: 'Trial період (7 днів)',
    required: false,
    customizable: true,
    trial: true,
    paid: false
  },
  {
    id: 'paid_onboarding',
    name: 'Paid onboarding (72 години)',
    required: false,
    customizable: true,
    trial: false,
    paid: true
  },
  {
    id: 'vision',
    name: 'Бачення життя',
    required: false,
    customizable: false,
    trial: false,
    paid: true
  },
  {
    id: 'goals',
    name: 'Головна ціль',
    required: false,
    customizable: false,
    trial: false,
    paid: true
  },
  {
    id: 'actions',
    name: 'Дії (2-3 на 7/14 днів)',
    required: false,
    customizable: false,
    trial: false,
    paid: true
  },
  {
    id: 'zoom',
    name: 'Zoom сесії (щотижня)',
    required: false,
    customizable: false,
    trial: false,
    paid: true
  }
] as const;