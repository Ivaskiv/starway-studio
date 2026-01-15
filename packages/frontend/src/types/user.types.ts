// /frontend/src/features/auth/types/user.types.ts

import type { Node } from 'reactflow'

/* ======================================================
   AUTH / USER — ЄДИНЕ ДЖЕРЕЛО ПРАВДИ
====================================================== */

export type UserRole = 'user' | 'admin'
export type UserType = 'admin' | 'user' | 'guest'

export interface User {
  id: string
  email: string
  first_name: string
  last_name?: string
  role: UserRole
  created_at: string
  settings?: UserSettings;

  trial_ends_at?: string        
  subscription_status?: 'active' | 'inactive' | 'canceled'

  timezone?: string
  telegram_id?: string   
  discord_id?: string    
  instagram_id?: string  

  // =================================
  // Гейміфікація / статистика
  // =================================
  streak?: number             // Поточний стрік користувача
  completed_blocks?: number   // Кількість виконаних блоків
  total_points?: number       // Загальна кількість балів
  level?: number              // Рівень користувача (можна рахувати як total_points / 500)

}

/* ================= TOKENS ================= */

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/* ================= RESPONSES ================= */

export interface AuthResponse {
  success: boolean
  user: User
  tokens: AuthTokens
}

/* ================= REQUESTS ================= */

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
}

/* ================= SETTINGS ================= */

export interface UserSettings {
  theme: 'light' | 'dark'
  language: 'uk' | 'en'
}

export interface UpdateUserPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  settings?: UserSettings;
}
/* ======================================================
   AB TESTING
====================================================== */

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed'

export interface ABTest {
  id: string
  name: string
  status: ABTestStatus
  metric: string
  traffic: number
  variants: ABVariant[]
  startDate?: string
  endDate?: string
  results?: ABTestResults
}

export interface ABVariant {
  id: string
  name: string
  isControl: boolean
  traffic: number
  visitors: number
  conversions: number
  revenue: number
}

export interface ABTestResults {
  winnerId?: string
  confidence: number
  improvement: number
}

/* ======================================================
   ADMIN DASHBOARD
====================================================== */

export interface AdminStats {
  total_funnels: number
  active_funnels: number
  total_users: number
  total_revenue: number
  conversion_rate: number
}

export type ActivityType = 'purchase' | 'progress' | 'signup' | 'review'

export interface AdminActivity {
  user: string
  action: string
  time: string
  type: ActivityType
  amount?: string
}

export type Trend = 'up' | 'neutral' | 'down'

export interface TopProduct {
  name: string
  students: number
  revenue: string
  completion: number
  trend: Trend
}

/* ======================================================
   FUNNEL BLOCK TYPES
====================================================== */

export const BLOCK_TYPES = [
  {
    id: 'awareness',
    type: 'awareness',
    label: 'Обізнаність',
    icon: 'Users',
    color: 'from-blue-500 to-cyan-500',
    description: 'Перше знайомство з аудиторією',
  },
  {
    id: 'interest',
    type: 'interest',
    label: 'Інтерес',
    icon: 'Target',
    color: 'from-purple-500 to-pink-500',
    description: 'Виховування зацікавлення',
  },
  {
    id: 'decision',
    type: 'decision',
    label: 'Рішення',
    icon: 'TrendingUp',
    color: 'from-green-500 to-emerald-500',
    description: 'Підштовхування до покупки',
  },
  {
    id: 'action',
    type: 'action',
    label: 'Дія',
    icon: 'DollarSign',
    color: 'from-orange-500 to-red-500',
    description: 'Здійснення покупки',
  },
  {
    id: 'retention',
    type: 'retention',
    label: 'Утримання',
    icon: 'Gift',
    color: 'from-pink-500 to-rose-500',
    description: 'Повторні продажі',
  },
] as const

export type BlockTypeId = (typeof BLOCK_TYPES)[number]['id']

/* ======================================================
   CHANNELS
====================================================== */

export const CHANNELS = [
  { id: 'landing', label: '🌐 Landing Page', color: 'blue' },
  { id: 'telegram', label: '✈️ Telegram', color: 'cyan' },
  { id: 'email', label: '📧 Email', color: 'purple' },
  { id: 'payment', label: '💳 Payment', color: 'green' },
  { id: 'ai-mentor', label: '🤖 AI-ментор', color: 'orange' },
] as const

export type ChannelId = (typeof CHANNELS)[number]['id']
export type Channel = (typeof CHANNELS)[number]

/* ======================================================
   FUNNEL BLOCKS
====================================================== */

export interface FunnelBlockData {
  type: string
  label: string
  channels: ChannelId[]
  product?: {
    name: string
    price: number
  }
  duration?: number
  aiConfig?: AIConfig
  [key: string]: unknown
}

export interface FunnelBlock extends Node {
  id: string
  type: string
  data: FunnelBlockData
  position: { x: number; y: number }
}

/* ======================================================
   FUNNEL
====================================================== */

export interface Funnel {
  id: string
  name: string
  description?: string
  blocks: FunnelBlock[]
  connections?: { from: string; to: string }[]
  status: 'draft' | 'active' | 'paused' | 'archived'
  created_at: string
  updated_at?: string
  user_id: string
}

/* ======================================================
   AI CONFIG
====================================================== */

export interface AIConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo'
  temperature: number
  maxTokens: number
  system_prompt?: string
}

/* ======================================================
   FUNNEL STATS
====================================================== */

export interface FunnelStats {
  views: number
  conversions: number
  revenue: number
  activeUsers: number
}

/* ======================================================
   BLOCK TYPE UNION
====================================================== */

export type BlockType =
  | 'awareness'
  | 'interest'
  | 'decision'
  | 'action'
  | 'retention'
  | 'landing'
  | 'telegram'
  | 'email'
  | 'payment'
  | 'ai-mentor'
  | 'product'
  | 'automation'
