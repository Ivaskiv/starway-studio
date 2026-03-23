// backend/src/modules/daily-cycle/service.ts

import { prisma } from '../../db/client.js'
import {
  DailyChoice,
  DailyDrain,
  DailyState,
  Prisma,
  ReminderType,
} from '@starway/db/prisma-client'
import { updateUserState } from '../ai-mentor/state.service.js'
import { scheduleReminder } from '../notifications/reminder.service.js'
import type { DailyEntryDTO, DailyStats, UpsertDailyEntryInput } from './types.js'

const todayRange = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

const toPrismaJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value))

function syncUserStateFromEntry(entry: {
  userId: string
  state: DailyState
  choice: DailyChoice
  dayFact: string | null
  drain: DailyDrain | null
}) {
  void updateUserState({
    userId: entry.userId,
    source: 'daily',
    answers: {
      state: entry.state,
      choice: entry.choice,
      factOfDay: entry.dayFact ?? '',
      drain: entry.drain ?? '',
    },
  }).catch(error => console.error('[updateUserState]', error))
}

interface DailyEntryRow {
  id: string
  userId: string
  expertId: string
  date: Date
  state: DailyState
  choice: DailyChoice
  drain: DailyDrain | null
  dayFact: string | null
  aiAnalysis: string | null
  content: Prisma.JsonValue
  microSupport: Prisma.JsonValue | null
  createdAt: Date
  updatedAt: Date
}

/* ═══════════════════════════════════════════════════════════════════════════
   0. DailyService — CRUD для dailyEntry (legacy helpers preserved)
════════════════════════════════════════════════════════════════════════════ */
export class DailyService {
  static async createEntry(userId: string, dto: DailyEntryDTO): Promise<DailyEntryRow> {
    const expertId = dto.expertId ?? userId
    const today = new Date(new Date().toDateString())

    const entry = await prisma.dailyEntry.create({
      data: {
        userId,
        expertId,
        date: today,
        state: dto.state,
        choice: dto.choice,
        drain: dto.drain ?? null,
        dayFact: dto.dayFact ?? null,
        microSupport:
          dto.microSupport && dto.microSupport.length > 0
            ? toPrismaJson(dto.microSupport)
            : Prisma.JsonNull,
        content:
          dto.answers && dto.answers.length > 0
            ? toPrismaJson({ answers: dto.answers })
            : Prisma.JsonNull,
        },
    })

    syncUserStateFromEntry(entry)
    return entry
  }

  static async getMyEntries(userId: string): Promise<DailyEntryRow[]> {
    return prisma.dailyEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  }

  static async getLastEntry(userId: string): Promise<DailyEntryRow | null> {
    return prisma.dailyEntry.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
  }

  static async getStats(userId: string): Promise<DailyStats> {
    const entries = await prisma.dailyEntry.findMany({ where: { userId } })
    if (!entries.length) return { totalDays: 0, stabilityRate: 0, topDrain: null }

    const stabilityDays = entries.filter((entry) => !entry.drain).length
    const drainCount: Record<string, number> = {}

    entries.forEach((entry) => {
      if (entry.drain) {
        drainCount[entry.drain] = (drainCount[entry.drain] || 0) + 1
      }
    })

    const topDrain = Object.entries(drainCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return {
      totalDays: entries.length,
      stabilityRate: Math.round((stabilityDays / entries.length) * 100),
      topDrain,
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. Daily entry helpers used by controllers
════════════════════════════════════════════════════════════════════════════ */
export async function getOrCreateTodayEntry(userId: string, expertId: string): Promise<DailyEntryRow> {
  const { start, end } = todayRange()
  const existing = await prisma.dailyEntry.findFirst({
    where: {
      userId,
      date: { gte: start, lt: end },
    },
  })
  if (existing) return existing

  const entry = await prisma.dailyEntry.create({
    data: {
      userId,
      expertId,
      date: start,
      state: DailyState.NEUTRAL,
      choice: DailyChoice.PENDING,
      drain: null,
      dayFact: null,
      aiAnalysis: null,
      microSupport: Prisma.JsonNull,
      content: Prisma.JsonNull,
    },
  })
  syncUserStateFromEntry(entry)
  return entry
}

export async function upsertDailyEntry(input: UpsertDailyEntryInput): Promise<DailyEntryRow> {
  const { entryId, userId, expertId, microSupport, state, choice, drain, dayFact, answers } = input
  const entryDate = input.date ? new Date(input.date) : new Date()

  const upsertData = {
    userId,
    expertId,
    date: entryDate,
    state,
    choice,
    drain: drain ?? null,
    dayFact: dayFact ?? null,
    microSupport: microSupport ?? Prisma.JsonNull,
    content:
      answers && answers.length > 0
        ? toPrismaJson({ answers })
        : Prisma.JsonNull,
  }

  const entry = await prisma.dailyEntry.upsert({
    where: { id: entryId },
    create: { id: entryId, ...upsertData },
    update: upsertData,
  })
  syncUserStateFromEntry(entry)
  return entry
}

function mergeSessionContent(
  existingContent: unknown,
  session: 'morning' | 'evening',
  answers: Record<string, string>,
): Prisma.InputJsonValue {
  const base =
    existingContent && typeof existingContent === 'object' && !Array.isArray(existingContent)
      ? existingContent as Record<string, unknown>
      : {}

  return toPrismaJson({
    ...base,
    [session]: answers,
  })
}

async function generateMicroTasksFromMorning(
  userId: string,
  answers: Record<string, string>,
  expertId: string,
): Promise<void> {
  const focusGoal = answers.focus ?? ''
  const state = answers.state ?? ''
  const identity = answers.identity ?? ''

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(21, 0, 0, 0)

  const title = focusGoal
    ? `Просунути ціль: ${focusGoal.slice(0, 80)}`
    : 'Зроби один малий крок до своєї головної цілі'
  const description = state
    ? `Стан: ${state}. Дій із позиції ${identity || 'сили'}.`
    : identity
      ? `Дій із позиції ${identity}.`
      : undefined

  const existingTask = await prisma.microTask.findFirst({
    where: {
      userId,
      isCompleted: false,
      title,
      dueAt: tomorrow,
    },
    select: { id: true },
  })

  if (existingTask) {
    return
  }

  await prisma.microTask.create({
    data: {
      userId,
      expertId,
      title,
      description,
      sphere: 'growth',
      dueAt: tomorrow,
    },
  })
}

export async function saveDailySession(
  userId: string,
  data: {
    session: 'morning' | 'evening'
    answers: Record<string, string>
    date: string
  },
): Promise<DailyEntryRow> {
  const dateObj = new Date(data.date)
  dateObj.setHours(0, 0, 0, 0)

  const expert = await prisma.user.findUnique({
    where: { id: userId },
    select: { expertId: true },
  })
  const expertId = expert?.expertId ?? userId

  const existingEntry = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date: dateObj } },
    select: { id: true, content: true },
  })

  const content = mergeSessionContent(existingEntry?.content, data.session, data.answers)
  const dayFact =
    data.session === 'morning'
      ? data.answers.focus ?? data.answers.identity ?? null
      : data.answers.win ?? data.answers.energy_in ?? null

  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date: dateObj } },
    create: {
      userId,
      expertId,
      date: dateObj,
      content,
      state: DailyState.STABILITY,
      choice: DailyChoice.CONFIRMED_OLD,
      dayFact,
      microSupport: Prisma.JsonNull,
    },
    update: {
      content,
      dayFact,
    },
  })

  if (data.session === 'morning') {
    await generateMicroTasksFromMorning(userId, data.answers, expertId)
  }

  syncUserStateFromEntry(entry)
  return entry
}

async function resolveEntryUserId(entryId: string): Promise<string | null> {
  const entry = await prisma.dailyEntry.findUnique({
    where: { id: entryId },
    select: { userId: true },
  })
  return entry?.userId ?? null
}

export async function getMicroTasks(entryId: string) {
  const userId = await resolveEntryUserId(entryId)
  if (!userId) return []

  return prisma.microTask.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function completeMicroTask(entryId: string, taskId: string) {
  const userId = await resolveEntryUserId(entryId)
  if (!userId) return null

  const result = await prisma.microTask.updateMany({
    where: {
      id: taskId,
      userId,
    },
    data: {
      isCompleted: true,
      completedAt: new Date(),
    },
  })

  if (!result.count) return null
  return prisma.microTask.findUnique({ where: { id: taskId } })
}

export async function getDailyEntryHistory(userId: string) {
  return prisma.dailyEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. Reminder + support helpers
════════════════════════════════════════════════════════════════════════════ */
export async function logDailyCycle(
  userId: string,
  payload: {
    state: DailyState
    choice: DailyChoice
    drain?: DailyDrain | null
    dayFact?: string
    aiSummary?: string
  },
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
  metadata?: Record<string, unknown>,
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
    if (
      log.drain &&
      idx < arr.length - 1 &&
      !arr[idx + 1].drain
    ) {
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
    prisma.dailyCycleLog.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
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
