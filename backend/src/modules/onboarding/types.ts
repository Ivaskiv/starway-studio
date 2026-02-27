/**
 * ONBOARDING TYPES — CLEAN & ISOLATED
 */

// ==========================================
// STAGES
// ==========================================

export const ONBOARDING_STAGES = [
  'ENTRY',
  'VISION',
  'GOAL',
  'CHOICE',
  'ACTIONS',
  'COMPLETED',
  'SETUP'
] as const;

export type OnboardingStage = typeof ONBOARDING_STAGES[number];

// ==========================================
// PROGRESS
// ==========================================

export interface OnboardingProgress {
  userId: string;
  currentStage: OnboardingStage;
  completedStages: OnboardingStage[];
  isCompleted: boolean;

  startedAt: Date | null;
  completedAt: Date | null;
  lastActivityAt?: Date | null;

  metadata?: Record<string, any>;
}

// ==========================================
// DTOs
// ==========================================

export interface CompleteStageDto {
  userId: string;
  stage: OnboardingStage;
}

export interface UpdateProgressDto {
  userId: string;
  stage: OnboardingStage;
  metadata?: Record<string, any>;
}

// ==========================================
// ACCESS / RULES
// ==========================================

export interface StageConfig {
  stage: OnboardingStage;
  name: string;
  prompt: string;
  nextStage?: OnboardingStage;
  delayMinutes?: number;
}

export const STAGE_CONFIGS: Record<OnboardingStage, StageConfig> = {
  ENTRY: {
    stage: 'ENTRY',
    name: 'Вхід',
    prompt: 'Тепло привітай користувача та поясни, що буде далі.',
    nextStage: 'VISION',
    delayMinutes: 0,
  },
  VISION: {
    stage: 'VISION',
    name: 'Бачення',
    prompt: 'Допоможи сформулювати бачення життя.',
    nextStage: 'GOAL',
    delayMinutes: 60,
  },
  GOAL: {
    stage: 'GOAL',
    name: 'Цілі',
    prompt: 'Допоможи визначити конкретні цілі.',
    nextStage: 'CHOICE',
    delayMinutes: 120,
  },
  CHOICE: {
    stage: 'CHOICE',
    name: 'Вибір',
    prompt: 'Поясни концепцію усвідомлених виборів.',
    nextStage: 'ACTIONS',
    delayMinutes: 240,
  },
  ACTIONS: {
    stage: 'ACTIONS',
    name: 'Дії',
    prompt: 'Сформуй план перших дій.',
    nextStage: 'COMPLETED',
    delayMinutes: 360,
  },
  COMPLETED: {
    stage: 'COMPLETED',
    name: 'Завершено',
    prompt: 'Привітай з завершенням онбордингу.',
  },
  SETUP: {
    stage: 'SETUP',
    name: 'Підготовка',
    prompt: 'Поясни, що буде на етапі налаштування і що він отримує.',
    nextStage: 'ENTRY',
    delayMinutes: 5,
  },
};
