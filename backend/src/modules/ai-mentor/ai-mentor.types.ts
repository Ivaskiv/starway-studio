// backend/src/types/ai.ts
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

// backend/src/types/mentor.ts
// import type { AIIntent } from '../modules/ai-mentor/ai-mentor.types'

export interface MentorMessage {
  role: 'user' | 'mentor' | 'system'
  text: string
  timestamp: string
}

export interface MentorContext {
  user_id: string
  history: MentorMessage[]
}

export interface MentorRequest {
  prompt: string
  intent?: AIIntent
}
