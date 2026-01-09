// packages/frontend/src/types/modules.ts

import { ProductType } from '@/features/products/types/product.types'
import type { Block } from './Block'

// ═══════════════════════════════════════════════════════════════
// USER & AUTH
// ═══════════════════════════════════════════════════════════════
export type FieldType = 'input' | 'email' | 'textarea' | 'select' | 'number' | 'checkbox' | 'radio' | 'date' | 'time' | 'datetime-local' | 'month' | 'week' | 'range' | 'color' | 'file' | 'password' |'text'

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