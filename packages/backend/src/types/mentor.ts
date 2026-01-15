// packages/backend/src/types/mentor.ts
import type { AIIntent } from './ai'

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
