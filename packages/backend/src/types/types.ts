// packages/backend/src/payments/types.ts

export interface Products {
  id: string;
  title: string;
  slug: string;
  description: string;
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
  product: Products;
}

// PaymentData для створення підпису
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

export interface AIRequest {
  system_prompt?: string
  user_prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface PromptAnalysis {
  theme: string
  targetAudience: string
  mainProblem: string
  solution: string
  uniqueValue: string
  duration: string
  platform: string
  monetization: string
}
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
export interface SessionContext {
  wheel_scores?: Array<{ category_id: string; score: number }>
  streak_days?: number
  recent_wins?: string[]
  recent_blocks?: string[]
  focus_area?: string
  user_name?: string
}

export interface MorningResponse {
  affirmation: string
  micro_actions: Array<{
    title: string
    description: string
    category: string
    estimated_minutes: number
  }>
  motivation: string
}

export interface EveningResponse {
  reflection: string
  wins: string[]
  lessons: string
  tomorrow_focus: string
}
