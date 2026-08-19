import {
  DailyChoice,
  DailyDrain,
  DailyState,
  Prisma,
  ReminderType,
} from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { scheduleReminder } from '../notifications/reminder.service.js'

export async function logDailyCycle(
  userId: string,
  payload: {
    state: DailyState
    choice: DailyChoice
    drain?: DailyDrain | null
    dayFact?: string
    aiSummary?: string
  }
) {
  const today = new Date(new Date().toDateString())

  const entry = await prisma.dailyCycleLog.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, ...payload },
    update: { ...payload },
  })

  await scheduleReminder({
    userId,
    type: ReminderType.DAILY,
    nextReminderAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  return entry
}

export async function recordMicroSupport(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
) {
  return prisma.microSupportItem.create({
    data: {
      userId,
      action,
      metadata:
        metadata && Object.keys(metadata).length > 0
          ? (metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
  })
}

export async function calculateStreak(userId: string) {
  const logs = await prisma.dailyCycleLog.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 14,
  })

  const daysStable = logs.filter((log) => !log.drain).length
  const drainsCount = logs.filter((log) => Boolean(log.drain)).length
  const recoveryAfterDrain = logs.reduce<number>((acc, log, idx, arr) => {
    if (log.drain && idx < arr.length - 1 && !arr[idx + 1].drain) {
      return acc + 1
    }
    return acc
  }, 0)

  return prisma.cycleStreakMetric.upsert({
    where: { userId },
    create: { userId, daysStable, drainsCount, recoveryAfterDrain },
    update: { daysStable, drainsCount, recoveryAfterDrain },
  })
}

export async function triggerAICheckIn(userId: string) {
  const [log, streak] = await Promise.all([
    prisma.dailyCycleLog.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    }),
    prisma.cycleStreakMetric.findUnique({ where: { userId } }),
  ])

  if (!log || !streak) return null

  if (log.drain || streak.drainsCount > 0) {
    await scheduleReminder({
      userId,
      type: ReminderType.AI_CHECKIN,
      nextReminderAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      metadata: { state: log.state, drains: streak.drainsCount },
    })
    return { log, streak }
  }

  return null
}
