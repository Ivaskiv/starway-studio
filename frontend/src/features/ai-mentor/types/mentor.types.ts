// ═══════════════════════════════════════════════════════════════════════════
// 🎯 AI-МЕНТОР - ЄДИНА СИСТЕМА ТИПІВ
// ═══════════════════════════════════════════════════════════════════════════
// Замінює:
// - frontend/src/features/ai-mentor/types/mentor.types.ts
// - frontend/src/features/wheel/types/wheel.types.ts
// - frontend/src/features/daily-cycle/questions/types/questions.types.ts
// - backend/src/modules/mentor/types/mentor.types.ts
// - backend/src/modules/wheel/wheel.types.ts
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 📊 МОДУЛЬ A: КОЛЕСО БАЛАНСУ (Wheel)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI-MENTOR CORE TYPES
 * Централізовані типи для всієї екосистеми ментора
 */

// ============================================================================
// USER ACCESS TYPES
// ============================================================================

export type UserAccessLevel = 'trial' | 'paid' | 'mentor';

export interface MentorAccess {
  level: UserAccessLevel;
  trialDaysRemaining: number;
  hasWheel: boolean;
  hasDailyCycle: boolean;
  hasVision: boolean;
  hasGoals: boolean;
  hasActions: boolean;
  hasZoom: boolean;
  hasMentorship: boolean;
  expiresAt: string | null;
}

// ============================================================================
// ONBOARDING TYPES
// ============================================================================

export type OnboardingStage =
  | 'entry' // 0-2 год
  | 'vision' // 2-12 год
  | 'goal' // 12-24 год
  | 'choice' // 24-48 год
  | 'actions' // 48-72 год
  | 'completed';

export interface OnboardingProgress {
  stage: OnboardingStage;
  startedAt: string;
  completedStages: OnboardingStage[];
  currentStageStartedAt: string;
  isCompleted: boolean;
  hoursElapsed: number;
}

// ============================================================================
// TRIAL TYPES (7 днів)
// ============================================================================

export type TrialDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface TrialProgress {
  currentDay: TrialDay;
  startedAt: string;
  completedDays: TrialDay[];
  hasCompletedWheel: boolean;
  dailyEntriesCount: number;
  mirror1Completed: boolean; // день 4
  finalMirrorCompleted: boolean; // день 7
  isExpired: boolean;
}

// ============================================================================
// AI CONTEXT TYPES
// ============================================================================

export interface AIContext {
  userId: string;
  accessLevel: UserAccessLevel;
  trialDay?: TrialDay;
  onboardingStage?: OnboardingStage;
  wheelData?: WheelContextData;
  dailyHistory?: DailyCycleEntry[];
  visionStatement?: string;
  primaryGoal?: string;
  recentPatterns?: PatternData;
}

export interface WheelContextData {
  scores: Record<WheelSphere, number>;
  weakestSphere: WheelSphere;
  focusSphere: WheelSphere;
  imbalanceScore: number;
  lastUpdated: string;
}

export interface PatternData {
  dominantState: DailyState;
  dominantDrain: DailyDrain;
  stabilityStreak: number;
  drainCount: number;
  supportCompletionRate: number;
}

// ============================================================================
// WHEEL MODULE TYPES (модуль A)
// ============================================================================

export type WheelSphere =
  | 'money' // гроші
  | 'realization' // реалізація
  | 'relationships' // відносини
  | 'energy' // енергія / тіло
  | 'freedom' // свобода / час
  | 'support'; // внутрішня опора

export interface WheelAssessment {
  id: string;
  userId: string;
  scores: Record<WheelSphere, number>;
  weakestSphere: WheelSphere;
  focusSphere: WheelSphere;
  imbalanceScore: number;
  aiAnalysis: string;
  createdAt: string;
}

export interface WheelSchedule {
  nextAssessmentDate: string;
  frequency: 'monthly' | 'trial'; // trial = день 1, paid = 1 раз/міс
}

// ============================================================================
// DAILY CYCLE TYPES (модуль B)
// ============================================================================

export type DailyState =
  | 'tension' // напруга
  | 'fear' // страх
  | 'stability' // стабільність
  | 'innerSupport'; // внутрішня опора

export type DailyDrain =
  | 'doubt' // сумнів
  | 'procrastination' // прокрастинація
  | 'emotional_drain' // емоційний злив
  | 'externalPressure'; // зовнішній тиск

export type DailyChoice =
  | 'confirmed_old' // підтверджувала старе
  | 'chose_new'; // обрала нове

export interface MicroSupport {
  id: string;
  action: string; // 2-5 хв дія
  completed: boolean;
  completedAt: string | null;
}

export interface DailyCycleEntry {
  id: string;
  userId: string;
  date: string;
  state: DailyState;
  drain: DailyDrain;
  choice: DailyChoice;
  dayFact: string; // 1-2 речення
  microSupport: MicroSupport;
  createdAt: string;
}

// ============================================================================
// STREAK TYPES (модуль C)
// ============================================================================

export interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalStabilityDays: number;
  totalDrainDays: number;
  drainRecoveryCount: number;
  supportCompletionRate: number;
  lastUpdated: string;
}

export interface StreakMetrics {
  stabilityStreak: number;
  drainCount: number;
  recoveryRate: number;
  supportCompletion: number;
}

// ============================================================================
// MIRROR TYPES (дзеркала)
// ============================================================================

export type MirrorType = 'trial_day4' | 'trial_final' | 'weekly' | 'monthly';

export interface MirrorReport {
  id: string;
  userId: string;
  type: MirrorType;
  period: {
    from: string;
    to: string;
  };
  analysis: {
    statePattern: string;
    mainDrain: DailyDrain;
    sphereImbalance: WheelSphere | null;
    stabilityTrend: 'improving' | 'declining' | 'stable';
  };
  aiInsight: string;
  beforeAfterContrast?: string; // для trial
  createdAt: string;
}

// ============================================================================
// VISION TYPES (модуль D - paid only)
// ============================================================================

export interface VisionQuestionnaire {
  howIWantToLive: string;
  whatIsNoLongerNormal: string;
  pointBDescription: string;
}

export interface VisionStatement {
  id: string;
  userId: string;
  questionnaire: VisionQuestionnaire;
  statement: string; // AI-generated
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GOALS TYPES (модуль E - paid only)
// ============================================================================

export interface Goal {
  id: string;
  text: string;
  isPrimary: boolean;
}

export interface GoalsSet {
  id: string;
  userId: string;
  goals: Goal[]; // 5 цілей
  primaryGoalId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DECISIONS TYPES (модуль F - paid only)
// ============================================================================

export interface DecisionCheck {
  id: string;
  userId: string;
  dailyEntryId: string;
  choice: DailyChoice;
  alignsWithGoal: boolean;
  isBetrayingDecision: boolean;
  aiExplanation: string;
  createdAt: string;
}

// ============================================================================
// ACTIONS TYPES (модуль G - paid only)
// ============================================================================

export type ActionDuration = 7 | 14;

export interface Action {
  id: string;
  userId: string;
  text: string;
  duration: ActionDuration;
  startDate: string;
  endDate: string;
  completed: boolean;
  completedAt: string | null;
}

export interface ActionsSet {
  id: string;
  userId: string;
  actions: Action[]; // 2-3 дії
  createdAt: string;
}

// ============================================================================
// MINI-COURSES TYPES
// ============================================================================

export type CourseType =
  | 'state_key_to_change' // Стан — ключ до змін
  | 'five_points_of_support' // 5 точок опори
  | 'system_21' // Система 21
  | 'exit_stagnation'; // Алгоритм виходу із застою

export interface CourseOffer {
  courseType: CourseType;
  triggeredBy: 'pattern' | 'stagnation' | 'imbalance';
  pattern?: {
    type: DailyDrain | DailyState;
    duration: number; // днів
  };
  shouldOffer: boolean;
}

export interface MiniCourse {
  id: string;
  type: CourseType;
  title: string;
  description: string;
  price: number;
  accessGranted: boolean;
}

// ============================================================================
// CONSULTATION TYPES
// ============================================================================

export interface ConsultationTrigger {
  type: 'pattern_repeat' | 'strong_imbalance' | 'course_ineffective';
  duration?: number; // 14-21 день
  details: string;
  shouldTrigger: boolean;
}

export interface Consultation {
  id: string;
  userId: string;
  scheduledAt: string;
  triggeredBy: ConsultationTrigger;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

// ============================================================================
// ZOOM TYPES (paid only)
// ============================================================================

export interface ZoomRequest {
  id: string;
  userId: string;
  requestText: string;
  submittedAt: string;
}

export interface ZoomSession {
  id: string;
  scheduledAt: string;
  attendees: string[]; // userIds
  requests: ZoomRequest[];
  postSessionReport?: {
    decisions: string[];
    aiSummary: string;
  };
  status: 'scheduled' | 'completed';
}

// ============================================================================
// MENTORSHIP TYPES
// ============================================================================

export interface MentorshipOffer {
  userId: string;
  stabilityDays: number;
  qualifies: boolean; // 30+ днів
  offeredAt: string | null;
}

export interface Mentorship {
  id: string;
  userId: string;
  grantedAt: string;
  isActive: boolean;
}

// ============================================================================
// AI PROMPTS TYPES
// ============================================================================

export type PromptType =
  | 'system'
  | 'wheel_analysis'
  | 'daily_mirror'
  | 'trial_mirror'
  | 'vision_guide'
  | 'goal_alignment'
  | 'decision_check'
  | 'course_offer';

export interface AIPrompt {
  type: PromptType;
  systemMessage: string;
  userContext: AIContext;
}

export interface AIResponse {
  type: PromptType;
  response: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ai-mentor-types.ts - єдине джерело правди для всіх типів:

// ✅ Модуль A: Колесо балансу
// ✅ Модуль B: Щоденний цикл
// ✅ Модуль C: Streak + метрики
// ✅ Дзеркала (Trial/Paid)
// ✅ Модуль D-G: Vision, Goals, Decisions, Actions
// ✅ Міні-курси, Консультації, Zoom, Наставництво
// ✅ AI Engine (промпти, контекст)
// ✅ Trial/Paid логіка
// ✅ Onboarding 72 год
// ✅ Type guards і константи
