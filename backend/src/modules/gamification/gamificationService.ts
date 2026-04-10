import { prisma } from '../../db/client.js'
import { cacheDel } from '../../lib/cache/index.js'

export const XP_REWARDS = {
  MORNING_COMPLETED: 15,
  ALL_TASKS_DONE: 20,
  EVENING_COMPLETED: 15,
  DAY_COMPLETED: 50,
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500,
  WHEEL_COMPLETED: 30,
} as const

export const LEVELS = [
  { level: 1, minXP: 0, title: 'Учень' },
  { level: 2, minXP: 100, title: 'Практик' },
  { level: 3, minXP: 300, title: 'Дослідник' },
  { level: 4, minXP: 600, title: 'Майстер' },
  { level: 5, minXP: 1000, title: 'Наставник' },
] as const

export function getLevel(totalXP: number) {
  return [...LEVELS].reverse().find(level => totalXP >= level.minXP) ?? LEVELS[0]
}

export async function awardXP(userId: string, action: keyof typeof XP_REWARDS) {
  const amount = XP_REWARDS[action]

  await prisma.gamificationProfile.upsert({
    where: { userId },
    create: {
      userId,
      mindXP: amount,
    },
    update: {
      mindXP: {
        increment: amount,
      },
    },
  })

  await cacheDel(`user:${userId}`)

  return amount
}
