import { prisma } from '../../db/client.js'
import type { CanonicalLifecycleState } from '../lifecycle/lifecycle.adapter.js'
import { getUserMemoryProfile, type UserMemoryProfile } from '../memory/memory.service.js'

export interface EngagementSignals {
  streak: number
  lastActivity: Date | null
  unfinishedSteps: number
  repeatedPatterns: boolean
  hasProgress: boolean
  memoryProfile: UserMemoryProfile
}

export type EngagementTrigger =
  | 'resume_session'
  | 'streak_reinforcement'
  | 'unfinished_action_push'
  | 'deeper_offer'
  | 'winback'
  | null

export async function getEngagementSignals(userId: string): Promise<EngagementSignals> {
  const [streak, lastDay, activeTasks, completedTasks, missedTasks, memoryProfile] = await Promise.all([
    prisma.streak.findUnique({
      where: { userId_ruleKey: { userId, ruleKey: 'daily_checkin' } },
      select: { current: true, lastAt: true },
    }),
    prisma.dailyEntry.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true, status: true },
    }),
    prisma.microTask.count({
      where: { userId, isCompleted: false, status: { in: ['active', 'pending'] } },
    }),
    prisma.microTask.count({
      where: { userId, isCompleted: true },
    }),
    prisma.microTask.count({
      where: { userId, status: { in: ['missed', 'skipped', 'expired'] } },
    }),
    getUserMemoryProfile(userId),
  ])

  const lastActivityCandidates = [streak?.lastAt ?? null, lastDay?.updatedAt ?? null].filter(Boolean) as Date[]
  const lastActivity = lastActivityCandidates.sort((a, b) => b.getTime() - a.getTime())[0] ?? null

  return {
    streak: streak?.current ?? 0,
    lastActivity,
    unfinishedSteps: activeTasks,
    repeatedPatterns: missedTasks >= 3 || memoryProfile.repeatedBlockers.length >= 2 || memoryProfile.emotionalPatterns.length >= 2,
    hasProgress: completedTasks > 0 || Boolean(lastDay),
    memoryProfile,
  }
}

function getHoursSinceLastActivity(lastActivity: Date | null): number | null {
  if (!lastActivity) return null
  return Math.floor((Date.now() - lastActivity.getTime()) / 3600000)
}

function resolveNextTriggerFromSignals(
  signals: EngagementSignals,
  lifecycleState: CanonicalLifecycleState,
): EngagementTrigger {
  const hoursSinceLastActivity = getHoursSinceLastActivity(signals.lastActivity)

  if (signals.unfinishedSteps > 0) {
    return hoursSinceLastActivity !== null && hoursSinceLastActivity >= 12
      ? 'unfinished_action_push'
      : 'resume_session'
  }

  if (signals.repeatedPatterns) {
    return 'deeper_offer'
  }

  if (lifecycleState === 'expired' || lifecycleState === 'churned') {
    return 'winback'
  }

  if (signals.streak > 0 && hoursSinceLastActivity !== null && hoursSinceLastActivity >= 18) {
    return 'streak_reinforcement'
  }

  return null
}

export async function getNextTrigger(
  userId: string,
  lifecycleState: CanonicalLifecycleState,
): Promise<EngagementTrigger>
export function getNextTrigger(
  signals: EngagementSignals,
  lifecycleState: CanonicalLifecycleState,
): EngagementTrigger
export function getNextTrigger(
  input: string | EngagementSignals,
  lifecycleState: CanonicalLifecycleState,
): Promise<EngagementTrigger> | EngagementTrigger {
  if (typeof input === 'string') {
    return getEngagementSignals(input).then((signals) => resolveNextTriggerFromSignals(signals, lifecycleState))
  }

  return resolveNextTriggerFromSignals(input, lifecycleState)
}
