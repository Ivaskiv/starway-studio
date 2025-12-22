// /starway-studio/packages/shared/src/types/modules.ts

// core
export type ID = string
export type ISODate = string

// blocks / funnel
export type BlockType = 'video' | 'text' | 'task' | 'ai_session' | 'bonus' | 'quiz'

export interface Block {
  id: ID
  type: BlockType
  order: number
  title: string
  description: string
  duration?: number
  points?: number
  settings?: Record<string, unknown>
}

export type FunnelStage =
  | 'Discovery'
  | 'Value'
  | 'Habit'
  | 'Depth'
  | 'Monetization'

export interface FunnelStep {
  id: ID
  order: number
  stage: FunnelStage
  title: string
  description: string
  blocks: Block[]
}

export interface FunnelDraft {
  name: string
  audience: string
  niche: string
  goal: string
  steps: FunnelStep[]
}

// AI
export type AIFieldFocus =
  | 'name'
  | 'audience'
  | 'niche'
  | 'goal'
  | 'funnel-structure'

export interface AIGenerateRequest {
  prompt: string
  context?: Partial<FunnelDraft>
}

export interface AIGenerateResponse {
  data: string | Block[]
  remainingGenerations: number
  error?: string
}

// API responses
export interface ProductItem {
  slug: string
  title: string
  type: 'free' | 'paid'
  payment_url: string | null
  is_active: boolean
  progress: number
}

export interface MiniappItem {
  id: number
  title: string
  description: string | null
  icon_url: string | null
  is_free: boolean
  status: 'active' | 'locked'
  url: string
}

export interface CabinetResponse {
  products: ProductItem[]
  miniapps: MiniappItem[]
}
