import {
  Prisma,
  DayStatus,
  DailyChoice,
  DailyState,
  DailyDrain,
} from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'

import { ensureUserExpertId } from '../ai-mentor/helpers.js'

import {
  getCachedEntryByDate,
  getCachedTodayEntry,
  invalidateDailyHistoryCache,
  invalidateDayCache,
  setCachedEntryByDate,
  setCachedTodayEntry,
} from '../../lib/db/dailyCache.js'

import {
  getJournalDayAnchor,
  mergeSessionContent,
  mergeSessionMeta,
  syncUserStateFromEntry,
  todayRange,
  toPrismaJson,
} from './daily-cycle.helpers.js'

export async function getOrCreateTodayEntry(
  userId: string,
  expertId: string,
) {
  const cachedEntry = await getCachedTodayEntry(userId)

  if (cachedEntry) return cachedEntry

  const { start, end } = todayRange()

  const existing = await prisma.dailyEntry.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lt: end,
      },
    },
  })

  if (existing) {
    await setCachedTodayEntry(
      userId,
      existing as unknown as Record<string, unknown>,
    )

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

  await setCachedTodayEntry(
    userId,
    entry as unknown as Record<string, unknown>,
  )

  return entry
}

export async function getDailyEntryForDate(
  userId: string,
  dateInput: string,
) {
  const date = getJournalDayAnchor(dateInput)

  return getCachedEntryByDate(userId, date)
}

export async function upsertDailyEntry(input: {
  entryId: string
  userId: string
  expertId: string
  state: DailyState
  choice: DailyChoice
  drain?: DailyDrain | null
  dayFact?: string | null
  microSupport?: Prisma.InputJsonValue
  answers?: unknown[]
  date?: string | Date
}) {
  const {
    entryId,
    userId,
    expertId,
    microSupport,
    state,
    choice,
    drain,
    dayFact,
    answers,
  } = input

  const entryDate = getJournalDayAnchor(
    input.date ?? new Date(),
  )

  const upsertData = {
    userId,
    expertId,
    date: entryDate,
    status: DayStatus.IN_PROGRESS,
    state,
    choice,
    drain: drain ?? null,
    dayFact: dayFact ?? null,
    microSupport:
      microSupport ?? Prisma.JsonNull,
    content:
      answers && answers.length > 0
        ? toPrismaJson({ answers })
        : Prisma.JsonNull,
  }

  const entry = await prisma.dailyEntry.upsert({
    where: {
      id: entryId,
    },
    create: {
      id: entryId,
      ...upsertData,
    },
    update: upsertData,
  })

  syncUserStateFromEntry(entry)

  await invalidateDayCache(
    userId,
    entryDate,
  )

  await invalidateDailyHistoryCache(userId)

  return entry
}

export async function saveDailyAnswer(
  userId: string,
  data: {
    entryId: string
    questionId: string
    answer: string
    session: 'morning' | 'evening'
    date: string
    lastQuestionIndex: number
  },
) {
  const dateObj = getJournalDayAnchor(data.date)

  const expert = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      expertId: true,
    },
  })

  const expertId =
    expert?.expertId ??
    (await ensureUserExpertId(userId))

  const existingEntry =
    (await prisma.dailyEntry.findFirst({
      where: {
        id: data.entryId,
        userId,
      },
      select: {
        id: true,
        content: true,
      },
    })) ??
    (await prisma.dailyEntry.findUnique({
      where: {
        userId_date: {
          userId,
          date: dateObj,
        },
      },
      select: {
        id: true,
        content: true,
      },
    }))

  const existingContent =
    existingEntry?.content &&
    typeof existingEntry.content === 'object' &&
    !Array.isArray(existingEntry.content)
      ? (existingEntry.content as Record<
          string,
          unknown
        >)
      : null

  const contentWithAnswer =
    mergeSessionContent(
      existingContent,
      data.session,
      {
        [data.questionId]:
          data.answer,
      },
    )

  const content =
    mergeSessionMeta(
      contentWithAnswer,
      data.session,
      {
        lastQuestionIndex:
          data.lastQuestionIndex,
        updatedAt:
          new Date().toISOString(),
      },
    )

  const entry =
    await prisma.dailyEntry.upsert({
      where: {
        userId_date: {
          userId,
          date: dateObj,
        },
      },
      create: {
        id:
          existingEntry?.id ??
          data.entryId,
        userId,
        expertId,
        date: dateObj,
        status:
          DayStatus.IN_PROGRESS,
        content,
        state:
          DailyState.STABILITY,
        choice:
          DailyChoice.CONFIRMED_OLD,
        aiAnalysis: null,
        microSupport:
          Prisma.JsonNull,
      },
      update: {
        status:
          DayStatus.IN_PROGRESS,
        content,
      },
    })

  await invalidateDayCache(
    userId,
    dateObj,
  )

  await invalidateDailyHistoryCache(userId)

  await setCachedEntryByDate(
    userId,
    dateObj,
    entry as unknown as Record<
      string,
      unknown
    >,
  )

  return entry
}