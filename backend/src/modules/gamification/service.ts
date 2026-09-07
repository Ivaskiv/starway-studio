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

type BattleWinRewardDbClient = Pick<Prisma.TransactionClient, 'gamificationProfile' | 'streak'>
const BATTLE_WIN_REWARD = { mindXP: 100, neuroGems: 20 } as const
const BATTLE_SHARED_REWARD = { mindXP: 50, neuroGems: 10 } as const

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

function startOfUtcDay(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
}

function diffCalendarUtcDays(left: Date, right: Date) {
  return Math.round((startOfUtcDay(left) - startOfUtcDay(right)) / 86_400_000)
}

async function getDailyEntryStreak(userId: string) {
  const entries = await prisma.dailyEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    select: {
      date: true,
      status: true,
      lateCompletedAt: true,
      content: true,
    },
    take: 120,
  })

  const finalizedEntries = entries.filter((entry) => {
    const content = entry.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
      ? entry.content as Record<string, unknown>
      : null

    const finalizedAt = typeof content?.finalizedAt === 'string' ? content.finalizedAt : null
    const completedLate = entry.status === 'COMPLETED_LATE'
      || entry.lateCompletedAt !== null
      || content?.completedLate === true

    return (entry.status === 'COMPLETED' || Boolean(finalizedAt)) && !completedLate
  })

  if (!finalizedEntries.length) {
    return {
      current: 0,
      longest: 0,
      lastAt: null as Date | null,
    }
  }

  const uniqueDates = finalizedEntries.reduce<Date[]>((acc, entry) => {
    if (!acc.some(item => startOfUtcDay(item) === startOfUtcDay(entry.date))) {
      acc.push(entry.date)
    }
    return acc
  }, [])

  let current = 1
  for (let index = 1; index < uniqueDates.length; index += 1) {
    if (diffCalendarUtcDays(uniqueDates[index - 1], uniqueDates[index]) === 1) {
      current += 1
      continue
    }
    break
  }

  let longest = 1
  let running = 1
  for (let index = 1; index < uniqueDates.length; index += 1) {
    if (diffCalendarUtcDays(uniqueDates[index - 1], uniqueDates[index]) === 1) {
      running += 1
      longest = Math.max(longest, running)
    } else {
      running = 1
    }
  }

  return {
    current,
    longest,
    lastAt: uniqueDates[0] ?? null,
  }
}

function isToday(date: Date) {
  const now = new Date()
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
}

async function applyBattleProfileReward(
  client: BattleWinRewardDbClient,
  input: {
    userId: string
    mindXP: number
    neuroGems: number
  },
): Promise<void> {
  const profile = await client.gamificationProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      mindXP: input.mindXP,
      neuroGems: input.neuroGems,
    },
    update: {
      mindXP: { increment: input.mindXP },
      neuroGems: { increment: input.neuroGems },
    },
  })

  const level = resolveLevel(profile.mindXP)

  if (profile.level !== level.level) {
    await client.gamificationProfile.update({
      where: { userId: input.userId },
      data: { level: level.level },
    })
  }
}

export async function applyBattleSharedReward(
  client: BattleWinRewardDbClient,
  input: {
    userId: string
    at: Date
  },
): Promise<void> {
  await applyBattleProfileReward(client, {
    userId: input.userId,
    mindXP: BATTLE_SHARED_REWARD.mindXP,
    neuroGems: BATTLE_SHARED_REWARD.neuroGems,
  })
}

export async function applyBattleWinReward(
  client: BattleWinRewardDbClient,
  input: {
    userId: string
    expertId: string
    at: Date
  },
): Promise<void> {
  await applyBattleProfileReward(client, {
    userId: input.userId,
    mindXP: BATTLE_WIN_REWARD.mindXP,
    neuroGems: BATTLE_WIN_REWARD.neuroGems,
  })

  const streak = await client.streak.findUnique({
    where: {
      userId_ruleKey: {
        userId: input.userId,
        ruleKey: 'battle_win',
      },
    },
  })

  if (!streak) {
    await client.streak.create({
      data: {
        userId: input.userId,
        expertId: input.expertId,
        ruleKey: 'battle_win',
        ruleVer: 1,
        startAt: input.at,
        lastAt: input.at,
        current: 1,
        longest: 1,
        totalDays: 1,
      },
    })
    return
  }

  const gap = Math.floor((input.at.getTime() - streak.lastAt.getTime()) / 86_400_000)
  if (gap === 0) return

  if (gap <= 30) {
    const current = streak.current + gap
    await client.streak.update({
      where: { id: streak.id },
      data: {
        lastAt: input.at,
        current,
        longest: Math.max(streak.longest, current),
        totalDays: streak.totalDays + gap,
      },
    })
    return
  }

  await client.streak.update({
    where: { id: streak.id },
    data: { endAt: input.at },
  })
  await client.streak.create({
    data: {
      userId: input.userId,
      expertId: input.expertId,
      ruleKey: 'battle_win',
      ruleVer: 1,
      startAt: input.at,
      lastAt: input.at,
      current: 1,
      longest: streak.longest,
      totalDays: streak.totalDays + 1,
    },
  })
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
  const [streak, entryStreak] = await Promise.all([
    getDailyStreak(userId),
    getDailyEntryStreak(userId),
  ])
  const metric = await prisma.cycleStreakMetric.findUnique({
    where: { userId },
    select: {
      daysStable: true,
      drainsCount: true,
    },
  })
  const resolvedCurrent = Math.max(streak?.current ?? 0, entryStreak.current)
  const resolvedLongest = Math.max(streak?.longest ?? 0, entryStreak.longest)
  return {
    currentStreak: resolvedCurrent,
    longestStreak: resolvedLongest,
    totalDays: streak?.totalDays ?? 0,
    stabilityDays: metric?.daysStable ?? 0,
    drainDays: metric?.drainsCount ?? 0,
  }
}

export async function getSummary(userId: string): Promise<GamificationSummaryView> {
  await ensureProfile(userId)
  const [profile, streak, entryStreak] = await Promise.all([
    prisma.gamificationProfile.findUnique({ where: { userId } }),
    getDailyStreak(userId),
    getDailyEntryStreak(userId),
  ])

  if (!profile) {
    throw new Error('profile_not_found')
  }

  const level = resolveLevel(profile.mindXP)
  const nextLevel = LEVELS.find(item => item.level === level.level + 1) ?? null
  const currentLevelXp = Math.max(0, profile.mindXP - level.xpThreshold)
  const nextLevelXp = nextLevel ? Math.max(0, nextLevel.xpThreshold - level.xpThreshold) : 0
  const resolvedCurrent = Math.max(streak?.current ?? 0, entryStreak.current)
  const resolvedLongest = Math.max(streak?.longest ?? 0, entryStreak.longest)
  const streakLastAt = streak?.lastAt ? new Date(streak.lastAt) : null
  const lastActivityAt = [streakLastAt, entryStreak.lastAt].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null
  const streakAtRisk = Boolean(
    resolvedCurrent > 3 && lastActivityAt && !isToday(lastActivityAt),
  )

  return {
    streak: {
      current: resolvedCurrent,
      longest: resolvedLongest,
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
