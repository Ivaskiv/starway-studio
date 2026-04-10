import { type DailyState, Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import type { EmotionSignal, UserMemorySummary } from './types.js'

function toSummary(value: Prisma.JsonValue | null | undefined): UserMemorySummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      dominantStates: [],
      triggers: [],
      lastPatterns: [],
      updatedAt: new Date(0).toISOString(),
    }
  }

  const record = value as Record<string, unknown>
  return {
    dominantStates: Array.isArray(record.dominantStates) ? record.dominantStates.filter((item): item is DailyState => typeof item === 'string') : [],
    triggers: Array.isArray(record.triggers) ? record.triggers.filter((item): item is string => typeof item === 'string') : [],
    lastPatterns: Array.isArray(record.lastPatterns)
      ? record.lastPatterns.filter((item): item is UserMemorySummary['lastPatterns'][number] => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      : [],
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
  }
}

function buildNextSummary(previous: UserMemorySummary, signal: EmotionSignal): UserMemorySummary {
  const latestTrigger = signal.triggers[0] ?? null
  const lastPatterns = [
    ...previous.lastPatterns,
    {
      state: signal.state,
      trigger: latestTrigger,
      intensity: signal.intensity,
      createdAt: new Date().toISOString(),
    },
  ].slice(-12)

  const stateFrequency = new Map<DailyState, number>()
  for (const item of lastPatterns) {
    stateFrequency.set(item.state, (stateFrequency.get(item.state) ?? 0) + 1)
  }

  const dominantStates = [...stateFrequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([state]) => state)

  const triggerFrequency = new Map<string, number>()
  for (const item of lastPatterns) {
    if (!item.trigger) continue
    triggerFrequency.set(item.trigger, (triggerFrequency.get(item.trigger) ?? 0) + 1)
  }

  const triggers = [...triggerFrequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([trigger]) => trigger)

  return {
    dominantStates,
    triggers,
    lastPatterns,
    updatedAt: new Date().toISOString(),
  }
}

export async function getUserMemorySummary(userId: string): Promise<UserMemorySummary> {
  const memory = await prisma.userMemory.findUnique({
    where: { userId },
    select: { summary: true },
  })

  return toSummary(memory?.summary)
}

export async function updateImplicitMemory(userId: string, signal: EmotionSignal) {
  const significant = signal.intensity >= 6 || signal.confidence >= 0.75 || signal.triggers.length > 0
  if (!significant) {
    return getUserMemorySummary(userId)
  }

  const previous = await getUserMemorySummary(userId)
  const nextSummary = buildNextSummary(previous, signal)

  await prisma.userMemory.upsert({
    where: { userId },
    create: {
      userId,
      summary: nextSummary as Prisma.InputJsonValue,
    },
    update: {
      summary: nextSummary as Prisma.InputJsonValue,
    },
  })

  return nextSummary
}
