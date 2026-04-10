import { DailyChoice, DailyDrain, DailyState } from "@/modules/daily-cycle/types.js";

/**
 * 📐 ABsystem types
 * Centralizes DTOs and domain models for trial/paid/onboarding/chat/daily/wheel flows.
 */
export type OnboardingStage = 'ENTRY' | 'CHOICE' | 'ACTIONS' | 'GOAL' | 'VISION' | 'COMPLETED';

export interface StageConfig {
  title: string;
  description: string;
  prompt: string;
  nextStage?: OnboardingStage;
}

export const STAGE_CONFIGS: Record<OnboardingStage, StageConfig> = {
  ENTRY: {
    title: 'Вітання',
    description: 'Знайомство з ABsystemом',
    prompt: 'Привіт! Я твій ABsystem. Я скажу суворі правди, але тільки після запитання.',
    nextStage: 'CHOICE',
  },
  CHOICE: {
    title: 'Вибір',
    description: 'Розбираємо поточні вибори й патерни',
    prompt: 'Який вибір ти вимушена повторювати, але не хочеш?',
    nextStage: 'ACTIONS',
  },
  ACTIONS: {
    title: 'Дії',
    description: 'Блок дій для наступного прогресу',
    prompt: 'Назви два конкретні кроки, які зробиш зараз.',
    nextStage: 'GOAL',
  },
  GOAL: {
    title: 'Ціль',
    description: 'Фіксуємо головну ціль',
    prompt: 'Що має статись, щоб ти сказала: «Я досягла»?',
    nextStage: 'VISION',
  },
  VISION: {
    title: 'Бачення',
    description: 'Формуємо довгострокове бачення',
    prompt: 'Опиши себе після 5 років. Що ти бачиш?',
    nextStage: 'COMPLETED',
  },
  COMPLETED: {
    title: 'Завершено',
    description: 'Онбординг завершено, ментор активний',
    prompt: 'Маєш 72 години. Що зробиш наступними?',
  },
};

export interface MentorRuleSet {
  tone?: 'friendly' | 'professional' | 'harsh';
  goals?: string[];
  morningQuestions?: string[];
  eveningQuestions?: string[];
}

export interface MentorContext {
  userName?: string;
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

export interface AIGenerationRequest {
  prompt: string;
  context?: string[];
  userId?: string;
}

export interface AIGenerationResponse {
  text: string;
  summary: string;
  tone: string;
}

// Chat/admission
export interface MentorSession {
  id: string;
  userMentorId: string;
  createdAt: Date;
  endedAt: Date | null;
}

export interface MentorMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: Date;
}

export interface SendMessageDto {
  userId: string;
  message: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

export interface ChatResponse {
  session: MentorSession;
  userMessage: MentorMessage;
  mentorMessage: MentorMessage;
}

export interface MentorChatContext {
  lastState?: string;
  focusSphere?: string;
  wheelScore?: number;
  primaryGoal?: string;
  streakDays?: number;
  activeTasks?: string[];
}

export interface MentorExtendedContext extends MentorChatContext {
  userId: string
  visionText?: string | null
  recentDrains: string[]
}

export interface StreamChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamChatInput {
  userId: string
  message: string
  history: StreamChatMessage[]
  context?: MentorExtendedContext
}

// Daily cycle

export interface DailyCycleInput {
  userId: string;
  expertId: string;
  state: DailyState;
  choice: DailyChoice;
  drain?: DailyDrain;
  dayFact: string;
  microSupport?: MicroSupportItem[];
  aiAnalysis?: string;
}

export interface DailyCycleResponse {
  id: string;
  userId: string;
  expertId: string;
  date: Date;
  state: DailyState;
  choice: DailyChoice;
  drain?: DailyDrain | null;
  dayFact: string | null;
  aiAnalysis?: string | null;
  microSupport: MicroSupportItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MicroSupportItem {
  id: string;
  action: string;
  durationDays: number;
  completed?: boolean;
  note?: string;
}

// Wheel balance
export interface WheelScore {
  categoryId: string;
  score: number;
}

export interface WheelAnalysis {
  weakestSphere: string;
  focusSphere: string;
  imbalance: string;
  scores: WheelScore[];
}

// Onboarding/trial
export interface OnboardingTimer {
  startedAt: Date;
  expiresAt: Date;
  canSkip: boolean;
}

export interface CompleteStageDto {
  userId: string;
  stage: OnboardingStage;
}

export interface UpdateProgressDto {
  userId: string;
  stage: OnboardingStage;
}

export type TrialState = 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

export interface TrialStatus {
  state: TrialState;
  daysLeft: number;
  streak: number;
}

export interface PaidModule {
  name: string;
  enabled: boolean;
  completedAt?: Date;
}

export interface PaidAccessStatus {
  hasAccess: boolean;
  modules: PaidModule[];
}

export type GenerationIntent = 'morning' | 'evening' | 'wheel' | 'weekly' | 'chat' | 'pdf';

export interface GenerationRequest {
  userId: string;
  type: GenerationIntent;
  productId?: string;
  params?: Record<string, unknown>;
}

export interface GenerationResponse {
  intent: GenerationIntent;
  payload: Record<string, unknown> | string;
  raw?: string;
}

export interface WheelScore {
  category: string;
  score: number;
}

// Affirmations / schedules
export interface AffirmationDto {
  text: string;
  category: string;
  generatedAt: Date;
}
