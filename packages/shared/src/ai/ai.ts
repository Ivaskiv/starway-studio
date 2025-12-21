// /starway-studio/packages/shared/src/types/ai.ts

import { Block, FunnelStepKey, ISODate, ProductKind } from "../api/api"
import { LucideIcon } from 'lucide-react'

// ─────────────────────────────────────────
// AI FIELD FOCUS
// ─────────────────────────────────────────

  | 'name'
  | 'audience'
  | 'niche'
  | 'goal'
  | 'funnel-structure'

// ─────────────────────────────────────────
// AI ASSISTANT & GENERATIONS
// ─────────────────────────────────────────

export interface StepGenerations {
  bonus: number
}

export interface GenerationHistory {
  stepKey: FunnelStepKey
  result: string
  timestamp: ISODate
}

export interface AIAssistantState {
  currentField: AIFieldFocus
  isGenerating: boolean
  history: GenerationHistory[]
}

// ─────────────────────────────────────────
// AI FUNNEL ASSISTANT CONFIG
// ─────────────────────────────────────────

export interface AIFieldConfig {
  title: string
  placeholder: string
  tips: string[]
  icon: LucideIcon


}

export type AIFieldConfigMap = Record<AIFieldFocus, AIFieldConfig>

// ─────────────────────────────────────────
// FUNNEL DRAFT
// ─────────────────────────────────────────
export interface FunnelDraft {
  name: string
  niche: string
  goal?: string
  audience: string
  productType?: ProductKind
  structure?: Block[]
}

// ─────────────────────────────────────────
// AI GENERATION REQUEST/RESPONSE
// ─────────────────────────────────────────

  prompt: string
  context: Partial<FunnelDraft>
}

  data: string | Block[]
  remainingGenerations: number
  error?: string
}

// ─────────────────────────────────────────
// AI FUNNEL ASSISTANT PROPS
// ─────────────────────────────────────────

export interface AIFunnelAssistantProps {
  currentField: AIFieldFocus
  funnelDraft: Partial<FunnelDraft>
  generations: StepGenerations
  onGenerate: (result: string) => void
  isGenerating: boolean
}