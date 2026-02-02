// /features/aiDecisionEngine/types.ts

// =======================================
// CORE ENUMS / TYPES
// =======================================

export type DecisionSource =
  | 'questionsScheduler'
  | 'aiMentor'
  | 'course'
  | 'challenge'
  | 'wheel'
  | 'manual';

export type SubscriptionPlan =
  | 'free'
  | 'trial'
  | 'paid'
  | 'mentor';

// =======================================
// WHEEL
// =======================================

export type WheelArea =
  | 'health'
  | 'career'
  | 'finance'
  | 'relationships'
  | 'personal_growth'
  | 'fun'
  | 'environment'
  | 'inner_support'
  | 'spirituality';

// =======================================
// DECISION CONTEXT (вхід для AI)
// =======================================

export interface DecisionContext {
  userId: string;

  feature: string;        // наприклад: 'daily-question'
  module?: string;        // наприклад: 'wheel', 'mentor'

  source: DecisionSource;
  subscriptionTier: SubscriptionPlan;

  streakDays: number;
  trialDay?: number;

  metrics: {
    stability: number;    // 0..10
    drains: number;       // 0..10
    consistency: number;  // 0..10
  };

  payload?: unknown;      // сирі дані (answers, scores і т.д.)
}

// =======================================
// MICRO TASK — КЛЮЧОВА СУТНІСТЬ
// =======================================

export type MicroTaskReason =
  | 'low_score'
  | 'instability'
  | 'growth'
  | 'wheel_gap'
  | 'stagnation';

export interface MicroTask {
  id?: string; // зʼявляється після збереження

  title: string;
  description?: string;

  type: 'actionable' | 'reflection';

  // 🔑 якщо true → зберігаємо в БД
  persist: boolean;

  source: DecisionSource;
  reason: MicroTaskReason;

  // прямий вплив на колесо
  wheelImpact?: {
    area: WheelArea;
    delta: number; // +1, -1, +0.5
  };

  relatedEntity?: {
    type: 'question' | 'wheel' | 'mentor' | 'manual';
    id?: string;
  };

  status?: 'pending' | 'completed' | 'skipped';
  completedAt?: string;
}

// =======================================
// DECISION RESULT (вихід AI)
// =======================================

export interface DecisionResult {
  supportMessage?: string;

  microTasks?: MicroTask[];

  recommendations?: {
    enabled: boolean;
    reason?: string;
  };

  upsell?: {
    productIds: string[];
    reason?: string;
  };

  pdf?: {
    type: 'weekly' | 'trial' | 'custom';
  };

  generateReport?: boolean;
}

// =======================================
// AI ANALYSIS (низькорівневий результат)
// =======================================

export interface AiAnalysisResult {
  supportMessage?: string;

  microTasks?: Array<{
    title: string;
    description?: string;
  }>;

  stats?: Record<string, string | number>;
}

// =======================================
// UPSELL (як окремий результат)
// =======================================

export interface UpsellResult {
  upsell?: {
    productIds: string[];
    reason?: string;
  };
}
