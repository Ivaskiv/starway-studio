// backend/src/types/types.ts

import { Product } from '@/modules/products/types.js';
import { SocialPlatform } from '@/modules/social/types.js';

// ======================= AUTH =======================


export interface UserSocialData {
  authProvider?: SocialPlatform;
  telegramId?: string;
  telegramUserName?: string;
  instagramId?: string;
  instagramUserName?: string;
  whatsapp_id?: string;
  facebook_id?: string;
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
  client_firstName: string;
  client_lastName: string;
  merchant_signature: string;
  transaction_status: 'Approved' | 'Declined' | 'Pending';
  reason_code?: string;
}

export interface PaymentResult {
  status: 'approved' | 'failed';
  userId: string;
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
  client_firstName: string;
  client_lastName: string;
}

// ======================= AI / CHAT =======================

export interface AIRequest {
  system_prompt?: string;
  user_prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
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

// export interface SessionContext {
//   wheelScores?: Array<{ categoryId: string; score: number }>;
//   streakDays?: number;
//   recentWins?: string[];
//   recent_blocks?: string[];
//   focusArea?: string;
//   userName?: string;
// }

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
  tomorrowFocus: string;
}
