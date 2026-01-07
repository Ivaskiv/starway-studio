// packages/frontend/src/pages/admin/adminTypes.ts

import type { Node } from 'reactflow';

/* =======================
   AB Testing
======================= */

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface ABTest {
  id: string;
  name: string;
  status: ABTestStatus;
  metric: string;
  traffic: number;
  variants: ABVariant[];
  startDate?: string;
  endDate?: string;
  results?: ABTestResults;
}

export interface ABVariant {
  id: string;
  name: string;
  isControl: boolean;
  traffic: number;
  visitors: number;
  conversions: number;
  revenue: number;
}

export interface ABTestResults {
  winnerId?: string;
  confidence: number;
  improvement: number;
}

/* =======================
   Admin Dashboard
======================= */

export interface AdminStats {
  totalFunnels: number;
  activeFunnels: number;
  totalUsers: number;
  totalRevenue: number;
  conversionRate: number;
}

export type ActivityType = 'purchase' | 'progress' | 'signup' | 'review';

export interface AdminActivity {
  user: string;
  action: string;
  time: string;
  type: ActivityType;
  amount?: string;
}

export type Trend = 'up' | 'neutral' | 'down';

export interface TopProduct {
  name: string;
  students: number;
  revenue: string;
  completion: number;
  trend: Trend;
}

/* =======================
   Block Types
======================= */

export const BLOCK_TYPES = [
  { 
    id: 'awareness',
    type: 'awareness', 
    label: 'Обізнаність', 
    icon: 'Users',
    color: 'from-blue-500 to-cyan-500',
    description: 'Перше знайомство з аудиторією'
  },
  { 
    id: 'interest',
    type: 'interest', 
    label: 'Інтерес', 
    icon: 'Target',
    color: 'from-purple-500 to-pink-500',
    description: 'Виховування зацікавлення'
  },
  { 
    id: 'decision',
    type: 'decision', 
    label: 'Рішення', 
    icon: 'TrendingUp',
    color: 'from-green-500 to-emerald-500',
    description: 'Підштовхування до покупки'
  },
  { 
    id: 'action',
    type: 'action', 
    label: 'Дія', 
    icon: 'DollarSign',
    color: 'from-orange-500 to-red-500',
    description: 'Здійснення покупки'
  },
  { 
    id: 'retention',
    type: 'retention', 
    label: 'Утримання', 
    icon: 'Gift',
    color: 'from-pink-500 to-rose-500',
    description: 'Повторні продажі'
  }
] as const;

export type BlockTypeId = typeof BLOCK_TYPES[number]['id'];

/* =======================
   Channels
======================= */

export const CHANNELS = [
  { id: 'landing', label: '🌐 Landing Page', color: 'blue' },
  { id: 'telegram', label: '✈️ Telegram', color: 'cyan' },
  { id: 'email', label: '📧 Email', color: 'purple' },
  { id: 'payment', label: '💳 Payment', color: 'green' },
  { id: 'ai-mentor', label: '🤖 AI-ментор', color: 'orange' }
] as const;

export type ChannelId = typeof CHANNELS[number]['id'];
export type Channel = typeof CHANNELS[number];

/* =======================
   Funnel Block Data
======================= */

export interface FunnelBlockData {
  type: string;
  label: string;
  channels: ChannelId[];
  product?: {
    name: string;
    price: number;
  };
  duration?: number;
  aiConfig?: AIConfig;
  [key: string]: any;
}

/* =======================
   Funnel Block (extends ReactFlow Node)
======================= */

export interface FunnelBlock extends Node {
  id: string;
  type: string;
  data: FunnelBlockData;
  position: { x: number; y: number };
}

/* =======================
   Funnel
======================= */

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  blocks: FunnelBlock[];
  connections?: Array<{
    from: string;
    to: string;
  }>;
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt?: string;
  userId: string;
}

/* =======================
   AI Configuration
======================= */

export interface AIConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo';
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

/* =======================
   Funnel Statistics
======================= */

export interface FunnelStats {
  views: number;
  conversions: number;
  revenue: number;
  activeUsers: number;
}

/* =======================
   Block Type Helpers
======================= */

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
  | 'automation';