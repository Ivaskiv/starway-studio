import type { GamificationProfile } from '@starway/db/prisma-client'

export interface RewardPayload {
  xp?: number
  bitMind?: number
  neuroGems?: number
}

export interface LevelDefinition {
  level: number
  title: string
  xpThreshold: number
  unlocks: string[]
}

export interface GamificationProfileView extends GamificationProfile {
  xpToNextLevel: number
  levelTitle: string
  unlocks: string[]
  currentStreakDays?: number
}

export interface GamificationSummaryView {
  streak: {
    current: number
    longest: number
    lastActivityAt: string | null
  }
  xp: {
    total: number
    level: number
    currentLevelXp: number
    nextLevelXp: number
  }
  rewards: {
    bitMind: number
    neuroGems: number
  }
  flags: {
    streakAtRisk: boolean
    levelUpAvailable: boolean
  }
}

export type GamificationEventType =
  | 'DAILY_COMPLETED'
  | 'AI_MESSAGE_SENT'
  | 'TASK_COMPLETED'
