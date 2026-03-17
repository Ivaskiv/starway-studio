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
