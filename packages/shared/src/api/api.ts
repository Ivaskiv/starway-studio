// /packages/frontend/src/types/api.ts

import { ReactNode } from "react"
import { AIFieldFocus, GenerationHistory } from "../ai/ai"

// ─────────────────────────────────────────
// BASE
// ─────────────────────────────────────────

export type ISODate = string
// ─────────────────────────────────────────
// MODULES
// ─────────────────────────────────────────

export type ModuleId =
  | 'ai-mentor'
  | 'courses'
  | 'tasks'
  | 'progress-tracker'
  | 'analytics'
  | 'payments'
  | 'support-chat'

export type ModuleCategory =
  | 'ai'
  | 'automation'
  | 'analytics'
  | 'monetization'
  | 'communication'
  | 'productivity'

export interface Module {
  id: ModuleId
  name: string
  description: string
  icon: string
  enabled: boolean
  isPremium: boolean
  version: string
  dependencies?: ModuleId[]
  settings?: Record<string, unknown>
}

export const AVAILABLE_MODULES: Module[] = [
  {
    id: 'ai-mentor',
    name: 'AI-Ментор',
    description: 'Персональний асистент на базі GPT',
    category: 'ai',
    icon: '🤖',
    enabled: true,
    isPremium: true,
    version: '1.0.0'
  },
  {
    id: 'telegram-bot',
    name: 'Telegram-бот',
    description: 'Автоматизація через Telegram',
    category: 'automation',
    icon: '✈️',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  }
]

// ─────────────────────────────────────────
// FUNNELS
// ─────────────────────────────────────────

export type FunnelStatus = 'draft' | 'active' | 'paused' | 'archived'
export type FunnelStageType = 'awareness' | 'interest' | 'decision' | 'action' | 'retention'

export interface Funnel {
  id: ID
  description: string
  stages: FunnelStage[]
  userId: ID
  updatedAt: ISODate
}

export interface FunnelStage {
  id: ID
  name: string
  type: FunnelStageType
  order: number
  durationDays?: number
}

// BLOCKS / CONTENT
// ─────────────────────────────────────────

export type BlockType = 'video' | 'text' | 'task' | 'ai_session' | 'bonus' | 'quiz'

export interface Block {
 id: string
  step_id?: string
  phase?: string
  title: string
  goal?: string
  type?: string
  content_type?: string
  description?: string
  gamification?: string
  cta?: string
  order: number
  duration: number
}
// ─────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────

export type ProductAccessType = 'free' | 'paid'
export type ProductKind = 'course' | 'practicum' | 'ai_mentor'
export type PaymentAccessType = 'one_time' | 'subscription'

export interface Product {
  id: number
  slug: string
  title: string
  description: string
  price: number
  accessType: ProductAccessType
  published: boolean
  updatedAt: ISODate

// ─────────────────────────────────────────
// ─────────────────────────────────────────

export interface CabinetUser {
  id: number
  telegramId: string
  username?: string
  name?: string
  email?: string
  createdAt: ISODate
}

// ─────────────────────────────────────────
// INTEGRATIONS
// ─────────────────────────────────────────

export type IntegrationType = 'telegram' | 'email' | 'payment' | 'landing'

  id: ID
  type: IntegrationType
  status: 'connected' | 'disconnected' | 'error'
  config: Record<string, unknown>
  lastSync?: ISODate
}

// ─────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────

export interface FunnelAnalytics {
  funnelId: ID
  conversions: number
  revenue: number

// ─────────────────────────────────────────
// API CORE
// ─────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ApiError {
  message: string
}

// // ═══════════════════════════════════════════════════════════
// // IDS & CATEGORIES
// // ═══════════════════════════════════════════════════════════

// export type ModuleId =
//   | 'ai-mentor'
//   | 'courses'
//   | 'progress-tracker'
//   | 'analytics'
//   | 'payments'
//   | 'email-automation'
//   | 'notifications'
//   | 'resources'
//   | 'quizzes'
//   | 'gamification'
//   | 'calendar'
//   | 'support-chat'

// export type ModuleCategory =
//   | 'ai'
//   | 'automation'
//   | 'content'
//   | 'analytics'
//   | 'communication'

// // ═══════════════════════════════════════════════════════════
// // FUNNEL SETUP
// // ═══════════════════════════════════════════════════════════

export type FunnelStepKey =
  | 'funnel-name'
  | 'audience'
  | 'funnel-structure'
  | 'step'
  | 'video'
  | 'task'
  | 'bonus'

// export type FunnelStatus = 'draft' | 'active' | 'paused' | 'archived'

// export type FunnelStageType =
//   | 'awareness'
//   | 'interest'
//   | 'decision'
//   | 'action'
//   | 'retention'

// // INTEGRATIONS

// export type IntegrationType =
//   | 'email'
//   | 'landing'

// // ═══════════════════════════════════════════════════════════
// // ═══════════════════════════════════════════════════════════

// export type BlockType =
//   | 'video'
//   | 'text'
//   | 'task'
//   | 'ai_session'
//   | 'reminder'
//   | 'bonus'
//   | 'quiz'

// // ═══════════════════════════════════════════════════════════
// // PRODUCTS
// // ═══════════════════════════════════════════════════════════

// export type ProductAccessType = 'free' | 'paid'
// export type PaymentAccessType = 'one_time' | 'subscription'
// // MODULE CONFIG (LOCAL TYPE)

// export interface AvailableModuleConfig {
//   id: ModuleId
//   name: string
//   description: string
//   category: ModuleCategory
//   icon: string
//   enabled: boolean
//   isPremium: boolean
//   version: string
//   dependencies?: ModuleId[]
//   settings?: {
//     model?: string
//     temperature?: number
//   }

// // AVAILABLE MODULES

//   {
//     name: 'AI-Ментор',
//     description: 'Персональний асистент на базі GPT',
//     category: 'ai',
//     icon: '🤖',
//     enabled: true,
//     isPremium: true,
//     version: '1.0.0',
//     settings: {
//       model: 'gpt-4',
//       temperature: 0.7,
//       maxTokens: 2000
//     }
//   },
//   {
//     id: 'telegram-bot',
//     name: 'Telegram-бот',
//     category: 'automation',
//     icon: '✈️',
//     enabled: true,
//     isPremium: false,
//     version: '1.0.0'
//   },
//   {
//     id: 'courses',
//     name: 'Курси',
//     description: 'Навчальні програми та уроки',
//     category: 'content',
//     icon: '📚',
//     enabled: true,
//     isPremium: false,
//     version: '1.0.0'
//   },
//   {
//     id: 'tasks',
//     name: 'Завдання',
//     description: 'Чек-листи та трекінг виконання',
//     category: 'productivity',
//     icon: '✅',
//     enabled: true,
//     isPremium: false,
//     version: '1.0.0'
//   },
//   {
//     id: 'progress-tracker',
//     name: 'Прогрес',
//     description: 'Візуалізація досягнень',
//     category: 'analytics',
//     icon: '📊',
//     enabled: true,
//     isPremium: false,
//     version: '1.0.0'
//   },
//   {
//     id: 'analytics',
//     name: 'Аналітика',
//     description: 'Детальна статистика',
//     category: 'analytics',
//     icon: '📈',
//     enabled: true,
//     isPremium: true,
//     version: '1.0.0'
//   },
//   {
//     id: 'payments',
//     name: 'Платежі',
//     description: 'Stripe та WayForPay',
//     category: 'monetization',
//     icon: '💳',
//     enabled: true,
//     isPremium: false,
//     version: '1.0.0'
//   },
//   {
//     id: 'support-chat',
//     name: 'Підтримка',
//     description: 'Чат з командою',
//     category: 'communication',
//     icon: '💬',
//     enabled: true,
//     isPremium: false,
//     version: '1.0.0'
//   }
// ]


// export type ISODate = string
// // ─────────────────────────────────────────
// // ─────────────────────────────────────────
// export interface CabinetUser {
//   id: number
//   telegramId: string
//   username?: string
//   name?: string
//   email?: string
//   createdAt: ISODate
// }

// export interface CabinetResponse {
//   user: CabinetUser
//   products: ProductItem[]
//   miniapps: MiniappItem[]
// }

// // ─────────────────────────────────────────
// // PRODUCTS
// // ─────────────────────────────────────────

// export interface ProductItem {
//   id: number
//   slug: string
//   title: string
//   accessType: ProductAccessType
//   paymentUrl?: string
//   isActive: boolean
//   progress: number
// }

// export interface Product {
//   id: number
//   slug: string
//   title: string
//   description: string
//   price: number
//   category: string
//   published: boolean
//   authorId: number
//   createdAt: ISODate
//   updatedAt: ISODate
// }

// export interface CreateProductRequest {
//   title: string
//   description?: string
//   accessType: ProductAccessType
//   price?: number
//   durationDays?: number
//   category?: string
// }

// export interface UpdateProductRequest {
//   title?: string
//   description?: string
//   durationDays?: number
//   published?: boolean
// }

// export interface ProductForm {
//   title: string
//   kind: ProductKind
//   durationDays?: number
//   price: number
//   accessType: PaymentAccessType

// export interface SaveProductRequest extends ProductForm {
//   blocks: Block[]
// }

// // ─────────────────────────────────────────
// // BLOCKS
// // ─────────────────────────────────────────

// export interface Block {
//   id: ID
//   type: BlockType
//   order: number
//   title: string
//   content: string
//   duration?: number
//   points?: number
//   deadlineHours?: number
//   settings?: BlockSettings
// }

// export interface BlockSettings {
//   videoUrl?: string
//   taskType?: 'text' | 'file' | 'photo' | 'video'
//   aiPrompt?: string
// }

// export interface QuizQuestion {
//   id: ID
//   question: string
//   answers: string[]
//   correctAnswerIndex: number

// // MINI APPS

// export interface MiniappItem {
//   id: number
//   slug: string
//   title: string
//   description?: string
//   iconUrl?: string
//   isFree: boolean
//   url: string
// }

// // ─────────────────────────────────────────
// // FUNNELS
// // ─────────────────────────────────────────

// export interface Funnel {
//   id: ID
//   name: string
//   status: FunnelStatus
//   stages: FunnelStage[]
//   createdAt: ISODate
//   updatedAt: ISODate
//   userId: ID
// }

// export interface FunnelStage {
//   id: ID
//   name: string
//   type: FunnelStageType
//   order: number
//   durationDays?: number
//   channels: string[]
//   product?: StageProduct
// }
// export interface StageProduct {
//   id: ID
//   name: string
//   price: number
//   type: 'lead_magnet' | 'tripwire' | 'core' | 'upsell' | 'backend'
// }

// export interface StageAutomation {
//   triggers: AutomationTrigger[]
//   messages: AutomationMessage[]
// }
//   id: ID
//   event: string
//   action: string
//   delayHours: number
//   enabled: boolean
// }

// export interface AutomationMessage {
//   id: ID
//   type: 'email' | 'telegram' | 'ai'
//   subject?: string
//   sendAfterHours: number
// }

// export interface AIConfig {
//   personality: string
//   model: string
//   temperature: number
//   maxTokens: number
//   systemPrompt: string
// }

// // ─────────────────────────────────────────
// // ANALYTICS
// // ─────────────────────────────────────────

// export interface FunnelAnalytics {
//   funnelId: ID
//   period: 'today' | '7d' | '30d' | '90d' | 'all'
//   metrics: AnalyticsMetrics
//   stageMetrics: StageMetrics[]
//   timeline: TimelineData[]
// }

// export interface AnalyticsMetrics {
//   totalVisitors: number
//   totalConversions: number
//   conversionRate: number
//   revenue: number
//   averageOrderValue: number
// }

// export interface StageMetrics {
//   stageId: ID
//   stageName: string
//   visitors: number
//   conversions: number
//   conversionRate: number
//   avgTimeSpentSeconds: number
// }

// export interface TimelineData {
//   date: ISODate
//   visitors: number
//   conversions: number
//   revenue: number

// // ─────────────────────────────────────────
// // INTEGRATIONS
// // ─────────────────────────────────────────

// export interface Integration {
//   type: IntegrationType
//   name: string
//   status: 'connected' | 'disconnected' | 'error'
//   config: IntegrationConfig
//   lastSync?: ISODate
// }

// export interface IntegrationConfig {
//   webhookUrl?: string

//   fromEmail?: string

//   merchantAccount?: string
//   secretKey?: string
//   paymentProvider?: 'wayforpay' | 'stripe' | 'liqpay'

//   landingType?: 'miniapp' | 'tilda' | 'external'
// }

// // ─────────────────────────────────────────
// // API
// // ─────────────────────────────────────────

// export interface ApiResponse<T> {
//   success: boolean
//   data?: T
//   error?: ApiError
//   message?: string
// }

// export interface ApiError {
//   code: string
//   message: string
//   details?: unknown
// }

//   data: T[]
//   pagination: Pagination
// }

// export interface Pagination {
//   page: number
//   total: number
// }
// // ─────────────────────────────────────────
// // AI / FUNNEL BUILDER
// // ─────────────────────────────────────────
export interface FunnelStep {
  id: string 
  order: number
  stage: 'Discovery' | 'Value' | 'Habit' | 'Depth' | 'Monetization'
  title: string
  description: string
  details: string[] | string
  isCore?: boolean
  isCustom?: boolean
  price: 'Free' | 'Paid' | 'Premium' | 'Custom' | 'Unknown' | string
  color: string
   icon: ReactNode
 miniApp?: boolean | string[] 
 
}

export interface FunnelStats {
  visitors: number
  buyers: number
}

// //   niche?: string
// //   goal?: string
// //   audience?: string
// //   productType?: ProductKind
// // }
// export interface AIFunnelAssistantProps {
// }

// // ─────────────────────────────────────────
// // MODULES
// // ─────────────────────────────────────────


//   id: ModuleId
//   name: string
//   description: string
//   category: ModuleCategory
//   icon: string
//   enabled: boolean
//   isPremium: boolean
//   version: string
//   dependencies?: ModuleId[]
//   settings?: ModuleSettings
// }

// export interface UserModuleProgress {
//   moduleId: ModuleId
//   userId: string
//   startedAt: string
//   data?: unknown
// }

// // ─────────────────────────────────────────
// // DEMO
// // ─────────────────────────────────────────
// export interface DemoState {
//   active: boolean
//   step: number
//   mentor: any | null
// }



// // ─────────────────────────────────────────
// // ─────────────────────────────────────────

  bonus: number
}

// export interface GenerationHistory {
//   stepKey: FunnelStepKey
//   timestamp: ISODate
// }

export interface AIAssistantState {
  currentField: AIFieldFocus
  isGenerating: boolean
  generationsUsed: number

// // ─────────────────────────────────────────
// // AI FUNNEL ASSISTANT CONFIG
// // ─────────────────────────────────────────

// export interface AIFieldConfig {
//   title: string
//   placeholder: string
//   tips: string[]
//   systemPrompt: string
// }

// // ─────────────────────────────────────────
// // ─────────────────────────────────────────

export interface FunnelDraft {
  name: string
  audience: string
  productType?: ProductKind
  steps: Block[]
}

// // ─────────────────────────────────────────
// // AI GENERATION REQUEST/RESPONSE

//   context: Partial<FunnelDraft>
// }

//   data: string | Block[]
//   remainingGenerations: number
//   error?: string
// }