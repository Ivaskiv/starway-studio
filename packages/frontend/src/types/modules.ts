// packages/frontend/src/types/modules.ts

import type { Block } from './Block'

// ═══════════════════════════════════════════════════════════════
// USER & AUTH
// ═══════════════════════════════════════════════════════════════

export interface FrontendUser {
  id: string
  name: string
  email?: string
  token?: string
  demo?: boolean
}

export interface AuthState {
  isAuthenticated: boolean
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT TYPE
// ═══════════════════════════════════════════════════════════════

export type ProductType = 
  | 'digital_product'
  | 'course'
  | 'coaching'
  | 'service'
  | 'physical_product'
  | 'membership'
  | 'other'

// ═══════════════════════════════════════════════════════════════
// FUNNEL DRAFT
// ═══════════════════════════════════════════════════════════════

export interface FunnelDraft {
  id?: string
  name: string
  audience: string
  niche: string
  goal?: string
  productType?: ProductType | string | null
  blocks: Block[]
}

// ═══════════════════════════════════════════════════════════════
// AI FIELDS
// ═══════════════════════════════════════════════════════════════

export type AIFieldFocus =
  | 'name'
  | 'audience'
  | 'niche'
  | 'productType'
  | 'goal'
  | 'headline'
  | 'description'
  | 'cta'
  | 'structure'

// ═══════════════════════════════════════════════════════════════
// GENERATIONS
// ═══════════════════════════════════════════════════════════════

export interface GenerationsBalance {
  base: number
  bonus: number
  total: number
  used_today: number
}

// ═══════════════════════════════════════════════════════════════
// AI ASSISTANT PROPS
// ═══════════════════════════════════════════════════════════════

export interface AIFunnelAssistantProps {
  currentField: AIFieldFocus
  funnelDraft: Partial<FunnelDraft>
  generations: {
    base: number
    bonus: number
  }
  isGenerating: boolean
  onGenerate: (result: string) => void
}