import { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { cacheDel, cacheGet, cacheSet } from '../cache/index.js'

const JOURNAL_TIMEZONE = 'Europe/Kyiv'

function getTodayKey(input = new Date()) {
  return input.toISOString().split('T')[0] ?? ''
}

function getDayAnchor(input = new Date()) {
  const day = getTodayKey(input)
  return new Date(`${day}T00:00:00.000Z`)
}

type LegacyDailyEntryRow = {
  id: string
  userId: string
  expertId: string
  date: Date
  content: Prisma.JsonValue
  state: string
  choice: string
  drain: string | null
  dayFact: string | null
  aiAnalysis: string | null
  microSupport: Prisma.JsonValue | null
  createdAt: Date
  updatedAt: Date
}

type DailyEntryLike = LegacyDailyEntryRow & {
  status?: string
  lateCompletedAt?: Date | null
  canCatchUpUntil?: Date | null
  sourceEntryIds?: string[]
}

function isMissingDailyStatusColumn(error: unknown) {
  return error instanceof Error
    && error.message.includes('DailyEntry.status')
    && error.message.includes('does not exist')
}

function normalizeLegacyEntry(entry: LegacyDailyEntryRow) {
  return {
    ...entry,
    status: undefined,
    lateCompletedAt: null,
    canCatchUpUntil: null,
    sourceEntryIds: [entry.id],
  }
}

function getJournalDateKey(input: Date | string) {
  const date = typeof input === 'string' ? new Date(input) : input
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JOURNAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'

  return `${year}-${month}-${day}`
}

function getJournalAnchorFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function getStatusPriority(value: unknown) {
  switch (String(value ?? '')) {
    case 'COMPLETED':
      return 6
    case 'COMPLETED_LATE':
      return 5
    case 'SKIPPED':
      return 4
    case 'PARTIAL':
      return 3
    case 'IN_PROGRESS':
      return 2
    case 'PENDING':
      return 1
    default:
      return 0
  }
}

function getContentSignalScore(content: unknown) {
  const record = asRecord(content)
  if (!record) return 0

  let score = 0
  if (asRecord(record.morning)) score += 20
  if (asRecord(record.evening)) score += 25
  if (asRecord(record.morningMeta)) score += 10
  if (asRecord(record.eveningMeta)) score += 12
  if (typeof record.finalizedAt === 'string') score += 30
  if (typeof record.finalizedSession === 'string') score += 10
  if (record.completedLate === true) score += 8
  if (record.status === 'SKIPPED') score += 8
  if (asRecord(record.stateLog)) score += 4

  return score
}

function getEntryScore(entry: DailyEntryLike) {
  return (
    getStatusPriority(entry.status)
    + getContentSignalScore(entry.content)
    + (entry.aiAnalysis ? 5 : 0)
    + (entry.dayFact ? 2 : 0)
    + (entry.microSupport ? 1 : 0)
  )
}

function pickHigherPriorityStatus(left: DailyEntryLike, right: DailyEntryLike) {
  return getStatusPriority(left.status) >= getStatusPriority(right.status) ? left.status : right.status
}

function mergeContent(left: unknown, right: unknown): Prisma.JsonValue {
  const leftRecord = asRecord(left)
  const rightRecord = asRecord(right)

  if (!leftRecord && !rightRecord) return JSON.parse(JSON.stringify(left ?? right ?? {})) as Prisma.JsonValue
  if (!leftRecord) return JSON.parse(JSON.stringify(rightRecord ?? {})) as Prisma.JsonValue
  if (!rightRecord) return JSON.parse(JSON.stringify(leftRecord)) as Prisma.JsonValue

  return JSON.parse(JSON.stringify({
    ...leftRecord,
    ...rightRecord,
    morning: {
      ...(asRecord(leftRecord.morning) ?? {}),
      ...(asRecord(rightRecord.morning) ?? {}),
    },
    evening: {
      ...(asRecord(leftRecord.evening) ?? {}),
      ...(asRecord(rightRecord.evening) ?? {}),
    },
    morningMeta: {
      ...(asRecord(leftRecord.morningMeta) ?? {}),
      ...(asRecord(rightRecord.morningMeta) ?? {}),
    },
    eveningMeta: {
      ...(asRecord(leftRecord.eveningMeta) ?? {}),
      ...(asRecord(rightRecord.eveningMeta) ?? {}),
    },
    stateLog: {
      ...(asRecord(leftRecord.stateLog) ?? {}),
      ...(asRecord(rightRecord.stateLog) ?? {}),
    },
  })) as Prisma.JsonValue
}

function mergeDailyEntries(left: DailyEntryLike, right: DailyEntryLike): DailyEntryLike {
  const primary = getEntryScore(left) >= getEntryScore(right) ? left : right
  const secondary = primary === left ? right : left

  return {
    ...primary,
    date: getJournalAnchorFromKey(getJournalDateKey(primary.date)),
    status: pickHigherPriorityStatus(left, right),
    content: mergeContent(left.content, right.content),
    aiAnalysis: primary.aiAnalysis ?? secondary.aiAnalysis,
    dayFact: primary.dayFact ?? secondary.dayFact,
    microSupport: primary.microSupport ?? secondary.microSupport,
    lateCompletedAt: primary.lateCompletedAt ?? secondary.lateCompletedAt ?? null,
    canCatchUpUntil: primary.canCatchUpUntil ?? secondary.canCatchUpUntil ?? null,
    createdAt: left.createdAt < right.createdAt ? left.createdAt : right.createdAt,
    updatedAt: left.updatedAt > right.updatedAt ? left.updatedAt : right.updatedAt,
    sourceEntryIds: [...new Set([...(left.sourceEntryIds ?? [left.id]), ...(right.sourceEntryIds ?? [right.id])])],
  }
}

function mergeHistoryByJournalDay(entries: DailyEntryLike[]) {
  const merged = new Map<string, DailyEntryLike>()

  for (const entry of entries) {
    const dateKey = getJournalDateKey(entry.date)
    const existing = merged.get(dateKey)
    if (!existing) {
      merged.set(dateKey, {
        ...entry,
        date: getJournalAnchorFromKey(dateKey),
        sourceEntryIds: entry.sourceEntryIds ?? [entry.id],
      })
      continue
    }

    merged.set(dateKey, mergeDailyEntries(existing, entry))
  }

  return [...merged.values()].sort((left, right) => right.date.getTime() - left.date.getTime())
}

async function getLegacyEntryByDate(userId: string, start: Date, end: Date) {
  const rows = await prisma.$queryRawUnsafe<LegacyDailyEntryRow[]>(
    `
      SELECT
        "id",
        "userId",
        "expertId",
        "date",
        "content",
        "state",
        "choice",
        "drain",
        "dayFact",
        "aiAnalysis",
        "microSupport",
        "createdAt",
        "updatedAt"
      FROM "DailyEntry"
      WHERE "userId" = $1
        AND "date" >= $2
        AND "date" < $3
      ORDER BY "date" DESC
      LIMIT 1
    `,
    userId,
    start,
    end,
  )

  return rows[0] ? normalizeLegacyEntry(rows[0]) : null
}

async function getLegacyDailyHistory(userId: string) {
  const rows = await prisma.$queryRawUnsafe<LegacyDailyEntryRow[]>(
    `
      SELECT
        "id",
        "userId",
        "expertId",
        "date",
        "content",
        "state",
        "choice",
        "drain",
        "dayFact",
        "aiAnalysis",
        "microSupport",
        "createdAt",
        "updatedAt"
      FROM "DailyEntry"
      WHERE "userId" = $1
      ORDER BY "date" DESC
    `,
    userId,
  )

  return rows.map(normalizeLegacyEntry)
}

export async function getCachedEntryByDate(userId: string, date: Date) {
  const key = `daily:${userId}:${getTodayKey(date)}`
  const cached = await cacheGet<Awaited<ReturnType<typeof prisma.dailyEntry.findFirst>>>(key)
  if (cached !== null) return cached
  const targetDateKey = getJournalDateKey(date)
  const history = await getCachedDailyHistory(userId)
  const entry = history.find((item) => getJournalDateKey(item.date) === targetDateKey) ?? null

  await cacheSet(key, entry, 60)
  return entry
}

export async function getCachedTodayEntry(userId: string) {
  return getCachedEntryByDate(userId, new Date())
}

export async function getCachedDailyHistory(userId: string) {
  const key = `daily-history:${userId}`
  const cached = await cacheGet<Awaited<ReturnType<typeof prisma.dailyEntry.findMany>>>(key)
  if (cached !== null) return cached

  const entries = await (async (): Promise<DailyEntryLike[]> => {
    try {
      return await prisma.dailyEntry.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
      })
    } catch (error) {
      if (!isMissingDailyStatusColumn(error)) throw error
      return getLegacyDailyHistory(userId)
    }
  })()

  const mergedEntries = mergeHistoryByJournalDay(entries)
  await cacheSet(key, mergedEntries, 300)
  return mergedEntries
}

export async function setCachedTodayEntry(userId: string, entry: Prisma.JsonObject | Record<string, unknown> | unknown) {
  const today = getTodayKey()
  await cacheSet(`daily:${userId}:${today}`, entry, 60)
}

export async function setCachedEntryByDate(userId: string, date: Date, entry: Prisma.JsonObject | Record<string, unknown> | unknown) {
  await cacheSet(`daily:${userId}:${getTodayKey(date)}`, entry, 60)
}

export async function invalidateDayCache(userId: string, date = new Date()) {
  await cacheDel(`daily:${userId}:${getTodayKey(date)}`)
}

export async function invalidateDailyHistoryCache(userId: string) {
  await cacheDel(`daily-history:${userId}`)
}
