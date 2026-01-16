// packages/frontend/src/templates/ai-mentor/types/aiMentor.types.ts

import type {
  WheelArea,
  DailyState,
  DailySlip,
  DailyChoice
} from '../constants/aiMentor.constants';

// ============ SUBSCRIPTION ============

export type SubscriptionTier = 'trial' | 'paid';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface Subscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate?: string;
  trialDaysRemaining?: number;
}

// ============ КОЛЕСО БАЛАНСУ ============

export interface WheelScore {
  area: WheelArea;
  score: number; // 1-10
}

export interface WheelSubmission {
  id: string;
  user_id: string;
  product_id: string;
  scores: WheelScore[];
  average: number;
  weakest_area: WheelArea;
  focus_area: WheelArea;
  completed_at: string;
  ai_analysis?: string;
}

// ============ ЩОДЕННИЙ ЦИКЛ ============

export interface DailyCycleEntry {
  id: string;
  user_id: string;
  product_id: string;
  date: string;
  
  // Основні поля з ТЗ
  state: DailyState;                // Стан
  slip: DailySlip;                  // Злив
  choice: DailyChoice;              // Вибір
  fact_of_day: string;              // Факт дня (1-2 речення)
  micro_support: string;            // Мікро-опора (дія 2-5 хв)
  micro_support_done: boolean;      // Чи зроблено
  
  created_at: string;
}

// ============ STREAK ============

export interface Streak {
  user_id: string;
  product_id: string;
  current_streak: number;
  longest_streak: number;
  total_slips: number;
  returns_after_slip: number;
  supports_completed: number;
  last_entry_date: string;
}

// ============ ДЗЕРКАЛО (Mirror) ============

export interface Mirror {
  id: string;
  user_id: string;
  product_id: string;
  type: 'trial_day4' | 'trial_final' | 'weekly' | 'monthly';
  created_at: string;
  
  analysis: {
    repeated_states: DailyState[];
    main_slip: DailySlip;
    imbalance_area?: WheelArea;
    stability_trend: 'improving' | 'stable' | 'declining';
  };
  
  ai_summary: string;
}

// ============ PAID: БАЧЕННЯ ============

export interface Vision {
  id: string;
  user_id: string;
  product_id: string;
  
  // 3 питання з ТЗ
  how_i_want_to_live: string;
  what_is_no_longer_normal: string;
  point_b_description: string;
  
  created_at: string;
  updated_at: string;
}

// ============ PAID: ЦІЛІ ============

export interface Goal {
  id: string;
  user_id: string;
  product_id: string;
  title: string;
  is_primary: boolean;
  created_at: string;
}

// ============ PAID: ДІЇ ============

export interface Action {
  id: string;
  user_id: string;
  product_id: string;
  title: string;
  deadline: string;          // 7 або 14 днів від created_at
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

// ============ МІНІ-КУРСИ ============

export interface MiniCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  trigger_pattern: string;
  min_days_required: number;
  price: number;
}

export interface UserCourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed: boolean;
  completed_at?: string;
  effectiveness_rating?: number; // 1-10
}

// ============ КОНСУЛЬТАЦІЯ ============

export interface Consultation {
  id: string;
  user_id: string;
  product_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  ai_pre_summary?: string;
  ai_post_decision?: string;
}

// ============ ZOOM ============

export interface ZoomSession {
  id: string;
  product_id: string;
  scheduled_at: string;
  participants: string[];      // user_ids
  requests: string[];          // AI-зібрані запити
  decisions: string[];         // після Zoom
  recording_url?: string;
}

// ============ AI CONTEXT ============

export interface AIContext {
  user_id: string;
  product_id: string;
  subscription: Subscription;
  current_wheel?: WheelSubmission;
  recent_entries: DailyCycleEntry[];
  streak: Streak;
  vision?: Vision;
  primary_goal?: Goal;
  active_actions: Action[];
}

// ============ API REQUESTS ============

export interface SubmitWheelRequest {
  user_id: string;
  product_id: string;
  scores: WheelScore[];
}

export interface SubmitWheelResponse {
  submission: WheelSubmission;
  ai_analysis: string;
}

export interface SubmitDailyCycleRequest {
  user_id: string;
  product_id: string;
  state: DailyState;
  slip: DailySlip;
  choice: DailyChoice;
  fact_of_day: string;
  micro_support: string;
}

export interface SubmitDailyCycleResponse {
  entry: DailyCycleEntry;
  streak_updated: Streak;
}

export interface GenerateMirrorRequest {
  user_id: string;
  product_id: string;
  type: Mirror['type'];
}

export interface GenerateMirrorResponse {
  mirror: Mirror;
}

export interface CreateVisionRequest {
  user_id: string;
  product_id: string;
  how_i_want_to_live: string;
  what_is_no_longer_normal: string;
  point_b_description: string;
}

export interface CreateGoalsRequest {
  user_id: string;
  product_id: string;
  goals: string[];           // 5 цілей
  primary_goal_index: number; // 0-4
}

export interface CreateActionsRequest {
  user_id: string;
  product_id: string;
  actions: Array<{
    title: string;
    days: 7 | 14;
  }>;
}