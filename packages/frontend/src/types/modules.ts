// /starway-studio/packages/frontend/src/types/modules.ts

import { AIFieldFocus, FunnelDraft } from "@starway/shared/types/modules"


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
