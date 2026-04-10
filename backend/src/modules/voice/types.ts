import type { DailyState, VoiceEntryType } from '@starway/db/prisma-client'

export type EmotionSignal = {
  state: DailyState
  intensity: number
  confidence: number
  triggers: string[]
}

export type UserMemorySummary = {
  dominantStates: DailyState[]
  triggers: string[]
  lastPatterns: Array<{
    state: DailyState
    trigger: string | null
    intensity: number
    createdAt: string
  }>
  updatedAt: string
}

export type VoiceActionItem = {
  title: string
  description: string
}

export type VoiceDecision = {
  state: DailyState
  interpretation: string
  actions: VoiceActionItem[]
  paywallReason?: 'limit_reached' | 'deep_analysis_locked' | 'repeated_pattern' | 'high_intensity'
}

export type VoiceProcessInput = {
  userId: string
  chatId: string
  fileId: string
  type: VoiceEntryType
  mimeType?: string | null
}

