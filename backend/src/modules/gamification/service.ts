import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { getXpToNextLevel, resolveLevel } from './level.system.js'
import type { RewardPayload, GamificationProfileView } from './types.js'

async function ensureProfile(userId: string) {
  return prisma.gamificationProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

export async function getProfile(userId: string): Promise<GamificationProfileView> {
  await ensureProfile(userId)
  const profile = await prisma.gamificationProfile.findUnique({ where: { userId } })
  if (!profile) throw new Error('profile_not_found')
  const level = resolveLevel(profile.mindXP)
  const xpToNextLevel = getXpToNextLevel(profile.mindXP)
  const streak = await prisma.streak.findFirst({
    where: { userId, ruleKey: 'daily_checkin', endAt: null },
    orderBy: { current: 'desc' },
    select: { current: true },
  })
  return {
    ...profile,
    xpToNextLevel,
    levelTitle: level.title,
    unlocks: level.unlocks,
    currentStreakDays: streak?.current ?? undefined,
  }
}

export async function applyReward(userId: string, reward: RewardPayload): Promise<GamificationProfileView> {
  await ensureProfile(userId)

  const updateData: Prisma.GamificationProfileUpdateInput = {}
  if (reward.bitMind) updateData.bitMind = { increment: reward.bitMind }
  if (reward.xp) updateData.mindXP = { increment: reward.xp }
  if (reward.neuroGems) updateData.neuroGems = { increment: reward.neuroGems }

  const updated = await prisma.gamificationProfile.update({ where: { userId }, data: updateData })
  const level = resolveLevel(updated.mindXP)
  if (updated.level !== level.level) {
    await prisma.gamificationProfile.update({ where: { userId }, data: { level: level.level } })
    updated.level = level.level
  }
  const xpToNextLevel = getXpToNextLevel(updated.mindXP)
  const streak = await prisma.streak.findFirst({
    where: { userId, ruleKey: 'daily_checkin', endAt: null },
    orderBy: { current: 'desc' },
    select: { current: true },
  })
  return {
    ...updated,
    xpToNextLevel,
    levelTitle: level.title,
    unlocks: level.unlocks,
    currentStreakDays: streak?.current ?? undefined,
  }
}

export async function getStreakSummary(userId: string) {
  const streak = await prisma.streak.findFirst({
    where: { userId, ruleKey: 'daily_checkin', endAt: null },
    orderBy: { lastAt: 'desc' },
    select: {
      current: true,
      longest: true,
      totalDays: true,
    },
  })
  const metric = await prisma.cycleStreakMetric.findUnique({
    where: { userId },
    select: {
      daysStable: true,
      drainsCount: true,
    },
  })
  return {
    currentStreak: streak?.current ?? 0,
    longestStreak: streak?.longest ?? 0,
    totalDays: streak?.totalDays ?? 0,
    stabilityDays: metric?.daysStable ?? 0,
    drainDays: metric?.drainsCount ?? 0,
  }
}

export async function getLevelState(userId: string) {
  const profile = await getProfile(userId)
  const level = resolveLevel(profile.mindXP)
  return {
    level: level.level,
    multiplier: Math.max(1, 1 + level.level * 0.03),
    unlocks: level.unlocks,
    levelTitle: level.title,
  }
}

export async function awardStreakBonus(userId: string) {
  return applyReward(userId, { xp: 30 })
}
