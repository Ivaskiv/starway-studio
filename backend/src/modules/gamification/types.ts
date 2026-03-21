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
