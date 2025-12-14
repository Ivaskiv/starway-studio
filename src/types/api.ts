// src/types/api.ts

// ═══════════════════════════════════════════════════════════
// FUNNEL API
// ═══════════════════════════════════════════════════════════

export interface Funnel {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  stages: FunnelStage[]
  createdAt: string
  updatedAt: string
  userId: string
}

export interface FunnelStage {
  id: string
  name: string
  type: 'awareness' | 'interest' | 'decision' | 'action' | 'retention'
  order: number
  duration: number
  channels: string[]
  product?: StageProduct
  automation: StageAutomation
}

export interface StageProduct {
  id: string
  name: string
  price: number
  description: string
  type: 'lead-magnet' | 'tripwire' | 'core' | 'upsell' | 'backend'
}

export interface StageAutomation {
  triggers: AutomationTrigger[]
  messages: AutomationMessage[]
  aiConfig?: AIConfig
}

export interface AutomationTrigger {
  id: string
  event: string
  action: string
  delay: number
  enabled: boolean
}

export interface AutomationMessage {
  id: string
  type: 'email' | 'telegram' | 'ai'
  subject?: string
  content: string
  sendAfter: number
}

export interface AIConfig {
  personality: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS API
// ═══════════════════════════════════════════════════════════

export interface FunnelAnalytics {
  funnelId: string
  period: 'today' | '7d' | '30d' | '90d' | 'all'
  metrics: {
    totalVisitors: number
    totalConversions: number
    conversionRate: number
    revenue: number
    averageOrderValue: number
  }
  stageMetrics: StageMetrics[]
  timeline: TimelineData[]
}

export interface StageMetrics {
  stageId: string
  stageName: string
  visitors: number
  conversions: number
  conversionRate: number
  dropoffRate: number
  avgTimeSpent: number
}

export interface TimelineData {
  date: string
  visitors: number
  conversions: number
  revenue: number
}

// ═══════════════════════════════════════════════════════════
// INTEGRATION API
// ═══════════════════════════════════════════════════════════

export interface Integration {
  id: string
  type: 'telegram' | 'email' | 'payment' | 'landing'
  name: string
  status: 'connected' | 'disconnected' | 'error'
  config: IntegrationConfig
  lastSync?: string
}

export interface IntegrationConfig {
  // Telegram
  botToken?: string
  webhookUrl?: string
  
  // Email
  apiKey?: string
  fromEmail?: string
  emailProvider?: 'sendpulse' | 'mailchimp' | 'custom'
  
  // Payment
  merchantAccount?: string
  secretKey?: string
  paymentProvider?: 'wayforpay' | 'stripe' | 'liqpay'
  
  // Landing
  url?: string
  landingType?: 'miniapp' | 'tilda' | 'external'
}

// ═══════════════════════════════════════════════════════════
// API RESPONSES
// ═══════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}