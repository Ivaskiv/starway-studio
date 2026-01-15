// packages/backend/src/types/ai.ts
export type AIIntent =
  | 'mentor_reply'
  | 'funnel_step'
  | 'copywriting'
  | 'analysis'
  | 'system'

export interface AIRequest {
  intent: AIIntent
  prompt: string
  meta?: Record<string, any>
}

export interface AIResponse {
  text: string
  tokens_used: number
}
