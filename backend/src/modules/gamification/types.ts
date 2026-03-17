import type { GamificationProfile } from '../../db/generated/prisma/client.js'

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
