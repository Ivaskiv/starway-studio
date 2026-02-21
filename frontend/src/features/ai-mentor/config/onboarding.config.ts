/**
 * ONBOARDING CONFIGURATION
 * Жорстка послідовність 72 години для paid користувачів
 */

import type { OnboardingStage } from '../types/mentor.types';

// ============================================================================
// ONBOARDING STAGES CONFIG
// ============================================================================

export interface OnboardingStageConfig {
  stage: OnboardingStage;
  title: string;
  description: string;
  timeWindow: {
    startHour: number;
    endHour: number;
  };
  required: boolean;
  nextStage: OnboardingStage | null;
  component: string; // назва компонента для рендерингу
}

export const ONBOARDING_STAGES: Record<OnboardingStage, OnboardingStageConfig> = {
  entry: {
    stage: 'entry',
    title: 'Фіксація входу',
    description: 'Початок роботи з AI-ментором',
    timeWindow: { startHour: 0, endHour: 2 },
    required: true,
    nextStage: 'vision',
    component: 'EntryStep'
  },
  vision: {
    stage: 'vision',
    title: 'Бачення життя',
    description: 'Як ти хочеш жити? Що більше не норма? Опис точки Б',
    timeWindow: { startHour: 2, endHour: 12 },
    required: true,
    nextStage: 'goal',
    component: 'VisionStep'
  },
  goal: {
    stage: 'goal',
    title: 'Головна ціль',
    description: '5 цілей → вибір 1 головної',
    timeWindow: { startHour: 12, endHour: 24 },
    required: true,
    nextStage: 'choice',
    component: 'GoalStep'
  },
  choice: {
    stage: 'choice',
    title: 'Вибір і рішення',
    description: 'Фіксація рішень та перевірка вибору',
    timeWindow: { startHour: 24, endHour: 48 },
    required: true,
    nextStage: 'actions',
    component: 'ChoiceStep'
  },
  actions: {
    stage: 'actions',
    title: 'Дії',
    description: '2-3 дії на 7 або 14 днів',
    timeWindow: { startHour: 48, endHour: 72 },
    required: true,
    nextStage: 'completed',
    component: 'ActionsStep'
  },
  completed: {
    stage: 'completed',
    title: 'Завершено',
    description: 'Онбординг пройдено, доступ до всіх модулів',
    timeWindow: { startHour: 72, endHour: Infinity },
    required: false,
    nextStage: null,
    component: 'CompletedStep'
  }
};

// ============================================================================
// ONBOARDING RULES
// ============================================================================

export const ONBOARDING_RULES = {
  // Жорстка послідовність - не можна скіпати
  STRICT_SEQUENCE: true,
  
  // Максимальний час на весь онбординг
  MAX_TOTAL_HOURS: 72,
  
  // Автоматичний перехід між етапами
  AUTO_ADVANCE: false, // користувач сам переходить після завершення
  
  // Нагадування якщо користувач застряг
  REMINDER_AFTER_HOURS: 6,
  
  // Блокування доступу до інших модулів до завершення
  BLOCK_OTHER_MODULES: true,
  
  // Допустимі модулі під час онбордингу
  ALLOWED_MODULES_DURING_ONBOARDING: ['daily_cycle', 'wheel'] as const
};

// ============================================================================
// ONBOARDING MESSAGES
// ============================================================================

export const ONBOARDING_MESSAGES = {
  entry: {
    welcome: 'Ти оплатила підписку. Тепер починається реальна робота. Жодної мотивації, жодних "ти молодець". Тільки система: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.',
    instruction: 'Наступні 72 години — критичні. Кожен етап відкривається у свій час. Не скіпається.',
    cta: 'Почати'
  },
  vision: {
    intro: 'Час визначити бачення. Без фантазій, без "мрій". Тільки конкретика.',
    questions: [
      'Як ти хочеш жити? (не "хочу бути щасливою", а конкретно)',
      'Що більше не норма в твоєму житті?',
      'Опиши точку Б — де ти хочеш бути через 6 місяців'
    ],
    cta: 'Зберегти бачення'
  },
  goal: {
    intro: 'Бачення є. Тепер — цілі. 5 конкретних цілей.',
    instruction: 'Пиши не "хочу схуднути", а "схуднути на 5 кг до 01.06". Після цього оберешь 1 головну ціль.',
    cta: 'Зберегти цілі'
  },
  choice: {
    intro: 'Кожен твій вибір або веде до головної цілі, або віддаляє від неї.',
    instruction: 'AI буде фіксувати "зраду рішенню" щоразу, коли ти обиратимеш старе замість нового.',
    cta: 'Зрозуміло'
  },
  actions: {
    intro: 'Час дій. 2-3 конкретні кроки.',
    instruction: 'Термін: 7 або 14 днів. AI перевірятиме виконання. Без дій — все залишається на папері.',
    cta: 'Встановити дії'
  },
  completed: {
    message: 'Онбординг завершено. Тепер у тебе є: бачення, ціль, система рішень, дії. Щодня AI буде тримати тебе в рамках системи. Без поблажок.',
    cta: 'Перейти до панелі'
  }
};

// ============================================================================
// ONBOARDING VALIDATION
// ============================================================================

export const ONBOARDING_VALIDATION = {
  entry: {
    required: []
  },
  vision: {
    required: ['howIWantToLive', 'whatIsNoLongerNormal', 'pointBDescription'],
    minLength: {
      howIWantToLive: 50,
      whatIsNoLongerNormal: 30,
      pointBDescription: 50
    }
  },
  goal: {
    required: ['goals'],
    goalsCount: 5,
    minLength: 10,
    mustHavePrimary: true
  },
  choice: {
    required: [], // ознайомлення, без вводу
    acknowledgement: true
  },
  actions: {
    required: ['actions'],
    actionsCount: { min: 2, max: 3 },
    minLength: 10,
    mustHaveDuration: true
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getOnboardingStageByHours(hoursElapsed: number): OnboardingStage {
  if (hoursElapsed < 2) return 'entry';
  if (hoursElapsed < 12) return 'vision';
  if (hoursElapsed < 24) return 'goal';
  if (hoursElapsed < 48) return 'choice';
  if (hoursElapsed < 72) return 'actions';
  return 'completed';
}

export function isOnboardingStageAccessible(
  currentStage: OnboardingStage,
  requestedStage: OnboardingStage,
  hoursElapsed: number
): boolean {
  const stageOrder: OnboardingStage[] = ['entry', 'vision', 'goal', 'choice', 'actions', 'completed'];
  const currentIndex = stageOrder.indexOf(currentStage);
  const requestedIndex = stageOrder.indexOf(requestedStage);
  
  // Можна тільки на поточний або попередні етапи
  if (requestedIndex > currentIndex) return false;
  
  // Перевірка часового вікна
  const stageConfig = ONBOARDING_STAGES[requestedStage];
  return hoursElapsed >= stageConfig.timeWindow.startHour;
}

export function getNextOnboardingStage(currentStage: OnboardingStage): OnboardingStage | null {
  return ONBOARDING_STAGES[currentStage].nextStage;
}

export function calculateOnboardingProgress(
  startedAt: string,
  completedStages: OnboardingStage[]
): number {
  const total = Object.keys(ONBOARDING_STAGES).length - 1; // мінус 'completed'
  const completed = completedStages.filter(s => s !== 'completed').length;
  return Math.round((completed / total) * 100);
}

export function shouldShowOnboardingReminder(
  currentStage: OnboardingStage,
  stageStartedAt: string
): boolean {
  if (currentStage === 'completed') return false;
  
  const hoursInStage = (Date.now() - new Date(stageStartedAt).getTime()) / (1000 * 60 * 60);
  return hoursInStage >= ONBOARDING_RULES.REMINDER_AFTER_HOURS;
}