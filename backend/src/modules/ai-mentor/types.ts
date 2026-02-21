// backend/src/modules/ai-mentor/types.ts

/**
 * 🎯 AI MENTOR TYPES
 * Centralized type definitions for AI Mentor module
 */

// ==========================================
// ONBOARDING STAGES
// ==========================================

export type OnboardingStage = 
  | 'ENTRY'
  | 'CONTEXT'
  | 'GOAL'
  | 'VISION'
  | 'COMPLETED';

export const ONBOARDING_STAGES: OnboardingStage[] = [
  'ENTRY',
  'CONTEXT',
  'GOAL',
  'VISION',
  'COMPLETED'
];

// ==========================================
// STAGE CONFIGS
// ==========================================

export interface StageConfig {
  title: string;
  description: string;
  prompt: string;
  nextStage?: OnboardingStage;
}

export const STAGE_CONFIGS: Record<OnboardingStage, StageConfig> = {
  ENTRY: {
    title: 'Вітання',
    description: 'Знайомство з AI Ментором',
    prompt: 'Привіт! Я твій AI Ментор. Готовий допомогти тобі досягти цілей.',
    nextStage: 'CONTEXT'
  },
  CONTEXT: {
    title: 'Контекст',
    description: 'Збір інформації про поточну ситуацію',
    prompt: 'Розкажи про свою поточну ситуацію. Що зараз відбувається у твоєму житті?',
    nextStage: 'GOAL'
  },
  GOAL: {
    title: 'Ціль',
    description: 'Визначення головної цілі',
    prompt: 'Яка твоя головна ціль на найближчий час? Що ти хочеш досягти?',
    nextStage: 'VISION'
  },
  VISION: {
    title: 'Бачення',
    description: 'Формування довгострокового бачення',
    prompt: 'Уяви своє ідеальне майбутнє через 5 років. Як виглядає твоє життя?',
    nextStage: 'COMPLETED'
  },
  COMPLETED: {
    title: 'Завершено',
    description: 'Онбординг пройдено',
    prompt: 'Чудово! Тепер ти готовий працювати з AI Ментором.',
  }
};

// ==========================================
// MENTOR CONTEXT
// ==========================================

export interface MentorContext {
  userName?: string;
  userGoal?: string;
  userVision?: string;
  currentStage?: OnboardingStage;
  wheelScores?: Record<string, number>;
  recentActions?: string[];
}

export interface SessionContext {
  userName: string;
  tone: string;
  goals: string[];
  morningQuestions: string[];
  eveningQuestions: string[];
}

// ==========================================
// MENTOR RULES
// ==========================================

export interface MentorRuleSet {
  tone?: 'friendly' | 'professional' | 'harsh' | 'supportive';
  goals?: string[];
  morningQuestions?: string[];
  eveningQuestions?: string[];
  focusAreas?: string[];
}

// ==========================================
// ONBOARDING PROGRESS
// ==========================================

export interface OnboardingProgress {
  userId: string;
  currentStage: OnboardingStage;
  completedStages: OnboardingStage[];
  startedAt: Date;
  completedAt: Date | null;
  lastActivityAt: Date | null;
  isCompleted: boolean;
}

export interface CompleteStageDto {
  userId: string;
  stage: OnboardingStage;
}

export interface UpdateProgressDto {
  userId: string;
  stage: OnboardingStage;
}

// ==========================================
// CHAT & MESSAGES
// ==========================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'mentor' | 'system';
  text: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// AI GENERATION
// ==========================================

export interface AIGenerationRequest {
  prompt: string;
  context?: MentorContext;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerationResponse {
  text: string;
  tokensUsed?: number;
  model?: string;
}

// ==========================================
// DAILY CYCLE
// ==========================================

export interface DailyCycleInput {
  userId: string;
  state: string;
  drain?: string;
  choice?: string;
  fact?: string;
  microAction?: string;
}

export interface DailyCycleResponse {
  entry: any; // DailyEntry from Prisma
  mentorResponse?: string;
  microTasks?: any[];
}

// ==========================================
// WHEEL BALANCE
// ==========================================

export interface WheelScore {
  categoryId: string;
  score: number;
}

export interface WheelAnalysis {
  weakest: WheelScore;
  strongest: WheelScore;
  focus: WheelScore;
  imbalance: number;
}

// ==========================================
// EXPORTS
// ==========================================

// export type {
//   StageConfig,
//   OnboardingStage,
//   MentorContext,
//   SessionContext,
//   MentorRuleSet,
//   OnboardingProgress,
//   CompleteStageDto,
//   UpdateProgressDto,
//   ChatMessage,
//   ChatSession,
//   AIGenerationRequest,
//   AIGenerationResponse,
//   DailyCycleInput,
//   DailyCycleResponse,
//   WheelScore,
//   WheelAnalysis
// };

// export {
//   ONBOARDING_STAGES,
//   STAGE_CONFIGS
// };