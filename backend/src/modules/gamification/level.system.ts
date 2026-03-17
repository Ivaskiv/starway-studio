import { LevelDefinition } from './types.js'

export const LEVELS: LevelDefinition[] = [
  { level: 1, title: 'Seeker', xpThreshold: 0, unlocks: ['Навчання базовим практикам'] },
  { level: 2, title: 'Explorer', xpThreshold: 120, unlocks: ['Рекомендації AI Mentor'] },
  { level: 3, title: 'Thinker', xpThreshold: 300, unlocks: ['Щоденні інсайти'] },
  { level: 4, title: 'Builder', xpThreshold: 600, unlocks: ['Протиперсоналізовані мікрозавдання'] },
  { level: 5, title: 'Strategist', xpThreshold: 1000, unlocks: ['AI сценарії Wheel + Decisions'] },
  { level: 6, title: 'Visionary', xpThreshold: 1500, unlocks: ['Прискорені Mentor prompts'] },
  { level: 7, title: 'Architect', xpThreshold: 2100, unlocks: ['Преміум NeuroGems бонуси'] },
  { level: 8, title: 'Mentor', xpThreshold: 2800, unlocks: ['Daily Cycle streak multipliers'] },
  { level: 9, title: 'Mastermind', xpThreshold: 3600, unlocks: ['Розширені Wheel аналізи'] },
  { level: 10, title: 'Oracle', xpThreshold: 4500, unlocks: ['VIP AI Producer правила'] },
]

const MAX_LEVEL = LEVELS[LEVELS.length - 1].level

export function resolveLevel(xp: number): LevelDefinition {
  const normalized = Math.max(0, xp)
  let current = LEVELS[0]
  for (const def of LEVELS) {
    if (normalized >= def.xpThreshold) {
      current = def
    } else {
      break
    }
  }
  return current
}

export function getXpToNextLevel(xp: number): number {
  const current = resolveLevel(xp)
  if (current.level === MAX_LEVEL) return 0
  const next = LEVELS.find((l) => l.level === current.level + 1)
  return next ? Math.max(0, next.xpThreshold - xp) : 0
}

export function getLevelMultiplier(level: number): number {
  return 1 + Math.min(level - 1, MAX_LEVEL - 1) * 0.03
}
