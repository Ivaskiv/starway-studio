import { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'

export interface UserMemoryProfile {
  goals: string[]
  repeatedBlockers: string[]
  emotionalPatterns: string[]
  progressHistory: {
    completedDays: number
    completedTasks: number
    activeDaysLast7: number
  }
  updatedAt: string | null
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function takeStrings(value: unknown, limit = 5): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit)
}

function normalizeGoals(value: Prisma.JsonValue | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return takeStrings(value)
  const record = asRecord(value)
  return takeStrings(record.goals ?? record.items ?? record.values)
}

function normalizeMemorySummary(value: Prisma.JsonValue | null | undefined) {
  const record = asRecord(value)
  const dominantStates = takeStrings(record.dominantStates, 3)
  const triggers = takeStrings(record.triggers, 5)
  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : null

  return {
    dominantStates,
    triggers,
    updatedAt,
  }
}

export async function getUserMemoryProfile(userId: string): Promise<UserMemoryProfile> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [userMemory, latestGoals, completedDays, completedTasks, activeDaysLast7] = await Promise.all([
    prisma.userMemory.findUnique({
      where: { userId },
      select: { summary: true, updatedAt: true },
    }),
    prisma.goalsSet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { goals: true },
    }).catch(() => null),
    prisma.dailyEntry.count({
      where: {
        userId,
        status: { in: ['COMPLETED', 'COMPLETED_LATE'] },
      },
    }),
    prisma.microTask.count({
      where: {
        userId,
        isCompleted: true,
      },
    }),
    prisma.dailyEntry.count({
      where: {
        userId,
        updatedAt: { gte: sevenDaysAgo },
      },
    }),
  ])

  const memorySummary = normalizeMemorySummary(userMemory?.summary)

  return {
    goals: normalizeGoals(latestGoals?.goals),
    repeatedBlockers: memorySummary.triggers,
    emotionalPatterns: memorySummary.dominantStates,
    progressHistory: {
      completedDays,
      completedTasks,
      activeDaysLast7,
    },
    updatedAt: memorySummary.updatedAt ?? userMemory?.updatedAt?.toISOString() ?? null,
  }
}
