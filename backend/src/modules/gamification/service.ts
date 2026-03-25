import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { LEVELS, getXpToNextLevel, resolveLevel } from './level.system.js'
import { onXpGained } from './triggers.js'
import type {
  RewardPayload,
  GamificationEventType,
  GamificationProfileView,
  GamificationSummaryView,
} from './types.js'
import { getUserStreaks } from '../streak/service.js'
import { rewardEngine } from './reward.engine.js'

async function ensureProfile(userId: string) {
  return prisma.gamificationProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

async function getDailyStreak(userId: string) {
  const streaks = await getUserStreaks(userId)
  return streaks.find(streak => streak.ruleKey === 'daily_checkin') ?? null
}

function isToday(date: Date) {
  const now = new Date()
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
}

export async function getProfile(userId: string): Promise<GamificationProfileView> {
  await ensureProfile(userId)
  const profile = await prisma.gamificationProfile.findUnique({ where: { userId } })
  if (!profile) throw new Error('profile_not_found')
  const level = resolveLevel(profile.mindXP)
  const xpToNextLevel = getXpToNextLevel(profile.mindXP)
  const streak = await getDailyStreak(userId)
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
  const previous = await prisma.gamificationProfile.findUnique({
    where: { userId },
    select: { level: true, mindXP: true },
  })

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
  await onXpGained({
    userId,
    previousLevel: previous?.level ?? resolveLevel(previous?.mindXP ?? 0).level,
    nextLevel: updated.level,
    previousXp: previous?.mindXP ?? 0,
    nextXp: updated.mindXP,
  })
  const xpToNextLevel = getXpToNextLevel(updated.mindXP)
  const streak = await getDailyStreak(userId)
  return {
    ...updated,
    xpToNextLevel,
    levelTitle: level.title,
    unlocks: level.unlocks,
    currentStreakDays: streak?.current ?? undefined,
  }
}

export async function getStreakSummary(userId: string) {
  const streak = await getDailyStreak(userId)
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

export async function getSummary(userId: string): Promise<GamificationSummaryView> {
  await ensureProfile(userId)
  const [profile, streak] = await Promise.all([
    prisma.gamificationProfile.findUnique({ where: { userId } }),
    getDailyStreak(userId),
  ])

  if (!profile) {
    throw new Error('profile_not_found')
  }

  const level = resolveLevel(profile.mindXP)
  const nextLevel = LEVELS.find(item => item.level === level.level + 1) ?? null
  const currentLevelXp = Math.max(0, profile.mindXP - level.xpThreshold)
  const nextLevelXp = nextLevel ? Math.max(0, nextLevel.xpThreshold - level.xpThreshold) : 0
  const lastActivityAt = streak?.lastAt ? new Date(streak.lastAt) : null
  const streakAtRisk = Boolean(
    streak?.current && streak.current > 3 && lastActivityAt && !isToday(lastActivityAt),
  )

  return {
    streak: {
      current: streak?.current ?? 0,
      longest: streak?.longest ?? 0,
      lastActivityAt: lastActivityAt?.toISOString() ?? null,
    },
    xp: {
      total: profile.mindXP,
      level: level.level,
      currentLevelXp,
      nextLevelXp,
    },
    rewards: {
      bitMind: profile.bitMind,
      neuroGems: profile.neuroGems,
    },
    flags: {
      streakAtRisk,
      levelUpAvailable: false,
    },
  }
}

export async function handleGamificationEvent(userId: string, event: GamificationEventType) {
  switch (event) {
    case 'DAILY_COMPLETED':
      await rewardEngine.onDailyEntryCreated(userId)
      break
    case 'AI_MESSAGE_SENT':
      await rewardEngine.onMentorSessionCompleted(userId)
      break
    case 'TASK_COMPLETED':
      await rewardEngine.onMicroTaskCompleted(userId)
      break
    default:
      throw new Error('unsupported_gamification_event')
  }

  return getSummary(userId)
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
