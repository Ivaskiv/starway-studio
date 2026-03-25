export interface GamificationProfile {
  userId: string
  bitMind: number
  mindXP: number
  neuroGems: number
  level: number
  xpToNextLevel: number
  levelTitle: string
  unlocks: string[]
  currentStreakDays?: number
}

export interface StreakSummary {
  currentStreak: number
  longestStreak: number
  totalDays: number
  stabilityDays: number
  drainDays: number
}

export interface GamificationSummary {
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
