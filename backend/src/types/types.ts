// backend/src/types/types.ts

// ======================= AUTH =======================

export type SocialPlatform =
  | 'app'
  | 'telegram'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'tiktok'

  export type UserRole = 'super_admin' | 'admin' | 'user';

export interface User {
  id: string;
  email?: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  avatar?: string;
  is_active?: boolean;
  auth_provider?: SocialPlatform;
  telegram_id?: string;
  telegram_username?: string;
  instagram_id?: string;
  instagram_username?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserSocialData {
  auth_provider?: SocialPlatform;
  telegram_id?: string;
  telegram_username?: string;
  instagram_id?: string;
  instagram_username?: string;
  whatsapp_id?: string;
  facebook_id?: string;
}

// ======================= PRODUCTS =======================

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  type: string;
  modules: string[];
  free: boolean;
  trial: boolean;
  upsell: boolean;
  published: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
  category: string;
  duration_days: number;
  access_type: string;
}

// Для сумісності зі старим кодом
export type Products = Product;

export interface ProductWithEnrollment extends Product {
  enrollment_id: string | null;
  enrolled_at: string | null;
}

// ======================= ENROLLMENTS =======================

export interface Enrollment {
  id: string;
  user_id: string;
  product_id: string;
  purchased: boolean;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
}

// ======================= PAYMENTS =======================

export interface PaymentCallbackData {
  order_reference: string;
  amount: number;
  currency: string;
  product_name: string[];
  product_price: number[];
  product_count: number[];
  client_email: string;
  client_first_name: string;
  client_last_name: string;
  merchant_signature: string;
  transaction_status: 'Approved' | 'Declined' | 'Pending';
  reason_code?: string;
}

export interface PaymentResult {
  status: 'approved' | 'failed';
  user_id: string;
  product: Product;
}

export interface PaymentData {
  order_reference: string;
  amount: number;
  currency: string;
  product_name: string[];
  product_price: number[];
  product_count: number[];
  client_email: string;
  client_first_name: string;
  client_last_name: string;
}

// ======================= AI / CHAT =======================

export interface AIRequest {
  system_prompt?: string;
  user_prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface PromptAnalysis {
  theme: string;
  targetAudience: string;
  mainProblem: string;
  solution: string;
  uniqueValue: string;
  duration: string;
  platform: string;
  monetization: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ======================= SESSIONS =======================

export interface SessionContext {
  wheel_scores?: Array<{ category_id: string; score: number }>;
  streak_days?: number;
  recent_wins?: string[];
  recent_blocks?: string[];
  focus_area?: string;
  user_name?: string;
}

export interface MorningResponse {
  affirmation: string;
  micro_actions: Array<{
    title: string;
    description: string;
    category: string;
    estimated_minutes: number;
  }>;
  motivation: string;
}

export interface EveningResponse {
  reflection: string;
  wins: string[];
  lessons: string;
  tomorrow_focus: string;
}