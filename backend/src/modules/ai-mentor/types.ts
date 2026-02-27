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
  | 'CHOICE'
  | 'ACTIONS'
  | 'GOAL'
  | 'VISION'
  | 'COMPLETED';

export const ONBOARDING_STAGES: OnboardingStage[] = [
  'ENTRY',
  'CHOICE',
  'ACTIONS',
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
    nextStage: 'CHOICE'
  },
  CHOICE: {
    title: 'Вибір',
    description: 'Уточнення поточних виборів і патернів',
    prompt: 'Які повторювані вибори зараз найсильніше впливають на твій результат?',
    nextStage: 'ACTIONS'
  },
  ACTIONS: {
    title: 'Дії',
    description: 'Фіксація перших кроків',
    prompt: 'Які 1-2 конкретні дії ти готова зробити вже сьогодні?',
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
  systemPrompt: string;
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

export interface MentorSession {
  id: string;
  userId: string;
  startedAt: Date;
  lastMessageAt: Date;
  onboardingStage: OnboardingStage | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorMessage {
  id: string;
  mentorId: string;
  sessionId: string | null;
  userId: string;
  role: 'USER' | 'MENTOR' | 'SYSTEM';
  text: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface SendMessageDto {
  userId: string;
  userName: string;
  message: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

export interface ChatResponse {
  session: MentorSession;
  userMessage: MentorMessage;
  mentorMessage: MentorMessage;
}

export interface QuestionsConfig {
  frequency: 'morning_evening' | 'daily' | 'custom';
  morningTime?: string;
  eveningTime?: string;
  timezone?: string;
  promptStyle?: 'soft' | 'direct' | 'supportive' | 'analytical';
  customPrompts?: string[];
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

