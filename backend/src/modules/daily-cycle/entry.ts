import {
  DayStatus,
  DailyChoice,
  DailyDrain,
  DailyState,
  Prisma,
} from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import {
  getCachedEntryByDate,
  getCachedDailyHistory,
  getCachedTodayEntry,
  invalidateDailyHistoryCache,
  invalidateDayCache,
  setCachedTodayEntry,
} from '../../lib/db/dailyCache.js'
import {
  isOpenAIQuotaError,
  updateUserState,
} from '../ai-mentor/state.service.js'
import { ensureUserExpertId } from '../ai-mentor/helpers.js'
import type {
  DailyEntryDTO,
  DailyStats,
  UpsertDailyEntryInput,
} from './types.js'
import { getRecoveryPolicy } from './recovery.js'
import {
  getJournalDayAnchor,
  getPreviousJournalDayAnchor,
  toPrismaJson,
  todayRange,
} from './helpers.js'

export async function ensureYesterdayResolvedForToday(userId: string, date: Date): Promise<void> {
  const targetDate = getJournalDayAnchor(date)
  const todayDate = getJournalDayAnchor(new Date())

  if (targetDate.getTime() !== todayDate.getTime()) {
    return
  }

  const previousDay = getPreviousJournalDayAnchor(targetDate)
  const yesterdayEntry = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date: previousDay } },
    select: {
      status: true,
      content: true,
      lateCompletedAt: true,
    },
  })

  if (!yesterdayEntry) {
    throw new Error('daily_recovery_forbidden')
  }

  const content =
    yesterdayEntry.content && typeof yesterdayEntry.content === 'object' && !Array.isArray(yesterdayEntry.content)
      ? yesterdayEntry.content as Record<string, unknown>
      : null

  const finalizedAt = typeof content?.finalizedAt === 'string' ? content.finalizedAt : null
  const skipped = yesterdayEntry.status === DayStatus.SKIPPED || content?.status === 'SKIPPED'
  const completed = yesterdayEntry.status === DayStatus.COMPLETED
    || yesterdayEntry.status === DayStatus.COMPLETED_LATE
    || Boolean(yesterdayEntry.lateCompletedAt)
    || Boolean(finalizedAt)

  if (skipped || completed) {
    return
  }

  throw new Error('daily_recovery_forbidden')
}

export function syncUserStateFromEntry(entry: {
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
  }).catch(error => {
    if (isOpenAIQuotaError(error)) {
      console.warn('[updateUserState] skipped enrichment due to OpenAI quota', {
        userId: entry.userId,
        source: 'daily',
      })
      return
    }

    console.error('[updateUserState]', error)
  })
}

export interface DailyEntryRow {
  id: string
  userId: string
  expertId: string
  date: Date
  status: DayStatus
  state: DailyState
  choice: DailyChoice
  drain: DailyDrain | null
  dayFact: string | null
  aiAnalysis: string | null
  content: Prisma.JsonValue
  microSupport: Prisma.JsonValue | null
  lateCompletedAt: Date | null
  canCatchUpUntil: Date | null
  createdAt: Date
  updatedAt: Date
}

/* ═══════════════════════════════════════════════════════════════════════════
   0. DailyService — CRUD для dailyEntry (legacy helpers preserved)
════════════════════════════════════════════════════════════════════════════ */

export class DailyService {
  static async createEntry(userId: string, dto: DailyEntryDTO): Promise<DailyEntryRow> {
    const expertId = dto.expertId ?? await ensureUserExpertId(userId)
    const today = getJournalDayAnchor(new Date())

    const entry = await prisma.dailyEntry.create({
      data: {
        userId,
        expertId,
        date: today,
        status: DayStatus.PENDING,
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
  const cachedEntry = await getCachedTodayEntry(userId)
  if (cachedEntry) return cachedEntry as DailyEntryRow

  const { start, end } = todayRange()
  const existing = await prisma.dailyEntry.findFirst({
    where: {
      userId,
      date: { gte: start, lt: end },
    },
  })
  if (existing) {
    await setCachedTodayEntry(userId, existing as unknown as Record<string, unknown>)
    return existing
  }

  const entry = await prisma.dailyEntry.create({
    data: {
      userId,
      expertId,
      date: getJournalDayAnchor(new Date()),
      status: DayStatus.PENDING,
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
  await setCachedTodayEntry(userId, entry as unknown as Record<string, unknown>)
  return entry
}

export async function getDailyEntryForDate(userId: string, dateInput: string): Promise<DailyEntryRow | null> {
  const date = getJournalDayAnchor(dateInput)
  const recoveryPolicy = getRecoveryPolicy(date)
  if (!recoveryPolicy.isRecoverable) {
    throw new Error('daily_recovery_forbidden')
  }

  const entry = await getCachedEntryByDate(userId, date)
  const resolvedEntry = (entry ?? null) as DailyEntryRow | null

  return resolvedEntry
}

export async function getHistoricalDailyEntryForDate(userId: string, dateInput: string): Promise<DailyEntryRow | null> {
  const date = getJournalDayAnchor(dateInput)
  return prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date } },
  }) as Promise<DailyEntryRow | null>
}

export async function upsertDailyEntry(input: UpsertDailyEntryInput): Promise<DailyEntryRow> {
  const { entryId, userId, expertId, microSupport, state, choice, drain, dayFact, answers } = input
  const entryDate = getJournalDayAnchor(input.date ?? new Date())
  await ensureYesterdayResolvedForToday(userId, entryDate)

  const upsertData = {
    userId,
    expertId,
    date: entryDate,
    status: DayStatus.IN_PROGRESS,
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
  await invalidateDayCache(userId, entryDate)
  await invalidateDailyHistoryCache(userId)
  return entry
}

export async function getDailyEntryHistory(userId: string) {
  return getCachedDailyHistory(userId)
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. Reminder + support helpers
════════════════════════════════════════════════════════════════════════════ */
