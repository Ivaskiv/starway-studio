// backend/src/modules/daily-cycle/service.ts

import { prisma } from '../../db/client.js'
import {
  DayStatus,
  DailyChoice,
  DailyDrain,
  DailyState,
  Prisma,
  ReminderType,
} from '@starway/db/prisma-client'
import { updateUserState } from '../ai-mentor/state.service.js'
import { isOpenAIQuotaError } from '../ai-mentor/state.service.js'
import { ensureUserExpertId } from '../ai-mentor/helpers.js'
import { scheduleReminder } from '../notifications/reminder.service.js'
import type { DailyEntryDTO, DailyStats, SaveDailyAnswerInput, UpsertDailyEntryInput } from './types.js'
import { generateMicroTasksFromEntry } from '../microTask/service.js'
import { generateDailyAiAnalysis } from './ai.js'
import {
  getCachedEntryByDate,
  getCachedDailyHistory,
  getCachedTodayEntry,
  invalidateDailyHistoryCache,
  invalidateDayCache,
  setCachedEntryByDate,
  setCachedTodayEntry,
} from '../../lib/db/dailyCache.js'
import { cacheDel, cacheGet, cacheSet } from '../../lib/cache/index.js'
import { assertRecoverableDate, getRecoveryPolicy } from './recoveryPolicy.js'
import { updateCrossChannelUserState } from '../user-state/crossChannelState.service.js'

const JOURNAL_TIMEZONE = 'Europe/Kyiv'
const dailySessionDelegate = (
  prisma as unknown as {
    dailySession?: {
      upsert: (args: unknown) => Promise<unknown>
    }
  }
).dailySession

const todayRange = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function getPreviousJournalDayAnchor(input: Date) {
  const previous = new Date(input)
  previous.setUTCDate(previous.getUTCDate() - 1)
  return getJournalDayAnchor(previous)
}

export function getJournalDayAnchor(input: string | Date | undefined | null) {
  const source = input ? new Date(input) : new Date()
  if (Number.isNaN(source.getTime())) {
    return new Date()
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JOURNAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(source)

  const year = parts.find(part => part.type === 'year')?.value ?? '1970'
  const month = parts.find(part => part.type === 'month')?.value ?? '01'
  const day = parts.find(part => part.type === 'day')?.value ?? '01'

  return new Date(`${year}-${month}-${day}T12:00:00.000Z`)
}

async function ensureYesterdayResolvedForToday(userId: string, date: Date): Promise<void> {
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

const toPrismaJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value))

const toDailySessionChannel = (channel?: 'tg' | 'miniapp' | 'web'): 'TELEGRAM' | 'MINIAPP' | 'WEB' => {
  if (channel === 'tg') return 'TELEGRAM'
  if (channel === 'miniapp') return 'MINIAPP'
  return 'WEB'
}

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

interface DailyEntryRow {
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

function mergeSessionContent(
  existingContent: unknown,
  session: 'morning' | 'evening',
  answers: Record<string, string>,
): Prisma.InputJsonValue {
  const base =
    existingContent && typeof existingContent === 'object' && !Array.isArray(existingContent)
      ? existingContent as Record<string, unknown>
      : {}
  const existingSessionAnswers = base[session]
  const nextSessionAnswers =
    Object.keys(answers).length > 0
      ? answers
      : existingSessionAnswers && typeof existingSessionAnswers === 'object' && !Array.isArray(existingSessionAnswers)
        ? existingSessionAnswers as Record<string, string>
        : answers

  return toPrismaJson({
    ...base,
    [session]: nextSessionAnswers,
  })
}

function mergeSessionMeta(
  existingContent: unknown,
  session: 'morning' | 'evening',
  metaPatch: Record<string, unknown>,
): Prisma.InputJsonValue {
  const base =
    existingContent && typeof existingContent === 'object' && !Array.isArray(existingContent)
      ? existingContent as Record<string, unknown>
      : {}
  const metaKey = session === 'morning' ? 'morningMeta' : 'eveningMeta'
  const currentMeta =
    base[metaKey] && typeof base[metaKey] === 'object' && !Array.isArray(base[metaKey])
      ? base[metaKey] as Record<string, unknown>
      : {}

  return toPrismaJson({
    ...base,
    [metaKey]: {
      ...currentMeta,
      ...metaPatch,
    },
  })
}

function getSessionMeta(
  existingContent: unknown,
  session: 'morning' | 'evening',
): Record<string, unknown> {
  const base =
    existingContent && typeof existingContent === 'object' && !Array.isArray(existingContent)
      ? existingContent as Record<string, unknown>
      : {}
  const metaKey = session === 'morning' ? 'morningMeta' : 'eveningMeta'

  return base[metaKey] && typeof base[metaKey] === 'object' && !Array.isArray(base[metaKey])
    ? base[metaKey] as Record<string, unknown>
    : {}
}

function getContentRecord(content: unknown): Record<string, unknown> {
  return content && typeof content === 'object' && !Array.isArray(content)
    ? content as Record<string, unknown>
    : {}
}

function getAnswerRecord(content: Record<string, unknown>, key: 'morning' | 'evening') {
  const value = content[key]
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, string>
    : {}
}

export async function saveDailyAnswer(
  userId: string,
  data: SaveDailyAnswerInput,
): Promise<DailyEntryRow> {
  const dateObj = getJournalDayAnchor(data.date)
  assertRecoverableDate(dateObj)
  await ensureYesterdayResolvedForToday(userId, dateObj)
  const expert = await prisma.user.findUnique({
    where: { id: userId },
    select: { expertId: true },
  })
  const expertId = expert?.expertId ?? await ensureUserExpertId(userId)

  const existingEntry = await prisma.dailyEntry.findFirst({
    where: {
      id: data.entryId,
      userId,
    },
    select: {
      id: true,
      content: true,
      dayFact: true,
    },
  }) ?? await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date: dateObj } },
    select: {
      id: true,
      content: true,
      dayFact: true,
    },
  })

  const existingContent =
    existingEntry?.content && typeof existingEntry.content === 'object' && !Array.isArray(existingEntry.content)
      ? existingEntry.content as Record<string, unknown>
      : null

  const sessionAnswers =
    existingContent?.[data.session]
    && typeof existingContent[data.session] === 'object'
    && !Array.isArray(existingContent[data.session])
      ? existingContent[data.session] as Record<string, string>
      : {}

  const contentWithAnswer = mergeSessionContent(existingContent, data.session, {
    ...sessionAnswers,
    [data.questionId]: data.answer,
  })
  const dailySessionAnswers = Object.entries({
    ...sessionAnswers,
    [data.questionId]: data.answer,
  }).map(([questionId, answer]) => ({
    session: data.session,
    questionId,
    answer,
  }))
  const content = mergeSessionMeta(contentWithAnswer, data.session, {
    lastQuestionIndex: data.lastQuestionIndex,
    updatedAt: new Date().toISOString(),
    ...(data.channel ? { activeChannel: data.channel, lastAnsweredAt: new Date().toISOString() } : {}),
  })

  const entry = await prisma.dailyEntry.upsert({
    where: {
      userId_date: { userId, date: dateObj },
    },
    create: {
      id: existingEntry?.id ?? data.entryId,
      userId,
      expertId,
      date: dateObj,
      status: DayStatus.IN_PROGRESS,
      content,
      state: DailyState.STABILITY,
      choice: DailyChoice.CONFIRMED_OLD,
      dayFact: existingEntry?.dayFact ?? null,
      aiAnalysis: null,
      microSupport: Prisma.JsonNull,
    },
    update: {
      status: DayStatus.IN_PROGRESS,
      content,
    },
  })

  if (dailySessionDelegate) {
    await dailySessionDelegate.upsert({
      where: {
        userId_date_channel: {
          userId,
          date: dateObj.toISOString().slice(0, 10),
          channel: toDailySessionChannel(data.channel),
        },
      },
      update: {
        entryId: entry.id,
        lastQuestionIndex: data.lastQuestionIndex,
        answers: toPrismaJson(dailySessionAnswers),
      },
      create: {
        userId,
        entryId: entry.id,
        date: dateObj.toISOString().slice(0, 10),
        channel: toDailySessionChannel(data.channel),
        lastQuestionIndex: data.lastQuestionIndex,
        answers: toPrismaJson(dailySessionAnswers),
      },
    })
  }

  await invalidateDayCache(userId, dateObj)
  await invalidateDailyHistoryCache(userId)
  await setCachedEntryByDate(userId, dateObj, entry as unknown as Record<string, unknown>)
  if (data.channel) {
    await updateCrossChannelUserState(userId, {
      todayCycleDate: dateObj.toISOString().slice(0, 10),
    }, data.channel === 'tg' ? 'telegram' : data.channel)
  }
  return entry
}

export async function saveDailySession(
  userId: string,
  data: {
    session: 'morning' | 'evening'
    answers: Record<string, string>
    date: string
    finalize?: boolean
    channel?: 'tg' | 'miniapp' | 'web'
  },
): Promise<DailyEntryRow> {
  const dateObj = getJournalDayAnchor(data.date)
  const recoveryPolicy = assertRecoverableDate(dateObj)
  await ensureYesterdayResolvedForToday(userId, dateObj)

  console.info('[DailyCycle] saveDailySession', {
    userId,
    session: data.session,
    date: dateObj.toISOString().slice(0, 10),
    finalize: Boolean(data.finalize),
    answersCount: Object.keys(data.answers ?? {}).length,
    isToday: recoveryPolicy.isToday,
    isYesterday: recoveryPolicy.isYesterday,
  })

  const expert = await prisma.user.findUnique({
    where: { id: userId },
    select: { expertId: true },
  })
  const expertId = expert?.expertId ?? await ensureUserExpertId(userId)

  const existingEntry = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date: dateObj } },
    select: { id: true, content: true, status: true, createdAt: true },
  })

  const contentBase = mergeSessionContent(existingEntry?.content, data.session, data.answers)
  const contentBaseRecord = getContentRecord(contentBase)
  const morningAnswers = getAnswerRecord(contentBaseRecord, 'morning')
  const eveningAnswers = getAnswerRecord(contentBaseRecord, 'evening')
  const dayStart = new Date(dateObj)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
  const dayTasks = existingEntry?.id
    ? await prisma.microTask.findMany({
        where: {
          userId,
          OR: [
            { generatedFromEntryId: existingEntry.id },
            {
              createdAt: {
                gte: dayStart,
                lt: dayEnd,
              },
            },
          ],
        },
        select: {
          title: true,
          status: true,
          isCompleted: true,
        },
        orderBy: { createdAt: 'asc' },
      })
    : []
  const analysisPayload = data.finalize && data.session === 'evening'
    ? await generateDailyAiAnalysis({
        date: dateObj.toISOString().slice(0, 10),
        morning: {
          identity: morningAnswers.identity,
          qualities: morningAnswers.qualities,
          focus: morningAnswers.focus,
          state: morningAnswers.state,
          worthy: morningAnswers.worthy ?? morningAnswers.worthiness,
          goals: typeof morningAnswers.goals === 'string'
            ? morningAnswers.goals.split(/[\n,/]/).map(item => item.trim()).filter(Boolean).slice(0, 3)
            : [],
        },
        evening: {
          win: eveningAnswers.win,
          energy_in: eveningAnswers.energy_in ?? eveningAnswers.energyGain,
          energy_out: eveningAnswers.energy_out ?? eveningAnswers.energyDrain,
          program: eveningAnswers.program ?? eveningAnswers.pattern,
          power_source: eveningAnswers.power_source ?? eveningAnswers.source,
        },
        tasks: dayTasks.map(task => ({
          text: task.title,
          completed: task.isCompleted || task.status === 'done',
        })),
      }, userId)
    : null
  const serializedAnalysis = analysisPayload ? JSON.stringify(analysisPayload) : null
  const contentWithMeta = mergeSessionMeta(contentBase, data.session, {
    lastQuestionIndex: Math.max(0, Object.keys(data.answers ?? {}).length - 1),
    ...(data.channel ? { activeChannel: data.channel, lastAnsweredAt: new Date().toISOString() } : {}),
    ...(data.finalize ? { completedAt: new Date().toISOString() } : {}),
  })
  const content = data.finalize
    ? toPrismaJson({
        ...(contentWithMeta as Record<string, unknown>),
        finalizedAt: new Date().toISOString(),
        finalizedSession: data.session,
        completedLate: recoveryPolicy.isYesterday,
        analysis: analysisPayload ?? null,
        analysisGeneratedAt: analysisPayload ? new Date().toISOString() : null,
      })
    : contentWithMeta

  if (data.finalize) {
    console.info('[DailyCycle] finalize requested', {
      userId,
      session: data.session,
      date: dateObj.toISOString().slice(0, 10),
      hasExistingEntry: Boolean(existingEntry),
      contentKeys: Object.keys((contentWithMeta as Record<string, unknown>) ?? {}),
    })
  }

  const dayFact =
    data.session === 'morning'
      ? data.answers.focus ?? data.answers.identity ?? null
      : data.answers.win ?? data.answers.energy_in ?? null

  const nextStatus = (() => {
    if (!data.finalize) return data.session === 'morning' ? DayStatus.PARTIAL : DayStatus.IN_PROGRESS
    if (data.session === 'morning') return DayStatus.PARTIAL
    return recoveryPolicy.isYesterday ? DayStatus.COMPLETED_LATE : DayStatus.COMPLETED
  })()

  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date: dateObj } },
    create: {
      userId,
      expertId,
      date: dateObj,
      status: nextStatus,
      content,
      state: DailyState.STABILITY,
      choice: DailyChoice.CONFIRMED_OLD,
      dayFact,
      aiAnalysis: serializedAnalysis,
      microSupport: Prisma.JsonNull,
      lateCompletedAt: data.finalize && data.session === 'evening' && recoveryPolicy.isYesterday ? new Date() : null,
      canCatchUpUntil: null,
    },
    update: {
      status: nextStatus,
      content,
      dayFact,
      aiAnalysis: serializedAnalysis,
      lateCompletedAt: data.finalize && data.session === 'evening' && recoveryPolicy.isYesterday ? new Date() : undefined,
      canCatchUpUntil: data.finalize && data.session === 'evening' ? null : undefined,
    },
  })

  syncUserStateFromEntry(entry)
  await invalidateDayCache(userId, dateObj)
  await invalidateDailyHistoryCache(userId)
  await setCachedEntryByDate(userId, dateObj, entry as unknown as Record<string, unknown>)
  if (data.channel) {
    await updateCrossChannelUserState(userId, {
      todayCycleDate: dateObj.toISOString().slice(0, 10),
      todayCycleStatus: data.finalize
        ? data.session === 'morning'
          ? 'morning_done'
          : 'completed'
        : data.session === 'evening'
          ? 'tasks_done'
          : 'not_started',
    }, data.channel === 'tg' ? 'telegram' : data.channel)
  }

  if (
    data.finalize
    && data.session === 'evening'
    && (nextStatus === DayStatus.COMPLETED || nextStatus === DayStatus.COMPLETED_LATE)
    && existingEntry?.status !== DayStatus.COMPLETED
    && existingEntry?.status !== DayStatus.COMPLETED_LATE
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStartedAt: existingEntry?.createdAt ?? new Date(),
      },
      select: { id: true },
    }).catch((error: any) => {
      if (error?.code !== 'P2022') throw error
    })
  }

  if (data.finalize) {
    console.info('[DailyCycle] finalize saved', {
      userId,
      session: data.session,
      date: dateObj.toISOString().slice(0, 10),
      finalizedAt: new Date().toISOString(),
      completedLate: recoveryPolicy.isYesterday,
      entryId: entry.id,
      hasAnalysis: Boolean(analysisPayload),
    })
  }

  return entry
}

export async function skipDailyEntry(userId: string, date: string): Promise<DailyEntryRow> {
  const dateObj = getJournalDayAnchor(date)
  const recoveryPolicy = assertRecoverableDate(dateObj)

  if (!recoveryPolicy.isYesterday) {
    throw new Error('daily_recovery_forbidden')
  }

  const expert = await prisma.user.findUnique({
    where: { id: userId },
    select: { expertId: true },
  })
  const expertId = expert?.expertId ?? await ensureUserExpertId(userId)

  const existingEntry = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date: dateObj } },
    select: {
      content: true,
      dayFact: true,
    },
  })

  const existingContent =
    existingEntry?.content && typeof existingEntry.content === 'object' && !Array.isArray(existingEntry.content)
      ? existingEntry.content as Record<string, unknown>
      : {}

  const content = toPrismaJson({
    ...existingContent,
    status: 'SKIPPED',
    skippedAt: new Date().toISOString(),
    completedLate: false,
  })

  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date: dateObj } },
    create: {
      userId,
      expertId,
      date: dateObj,
      status: DayStatus.SKIPPED,
      content,
      state: DailyState.STABILITY,
      choice: DailyChoice.CONFIRMED_OLD,
      dayFact: existingEntry?.dayFact ?? null,
      aiAnalysis: null,
      microSupport: Prisma.JsonNull,
      canCatchUpUntil: null,
    },
    update: {
      status: DayStatus.SKIPPED,
      content,
      canCatchUpUntil: null,
    },
  })

  await invalidateDayCache(userId, dateObj)
  await invalidateDailyHistoryCache(userId)
  await setCachedEntryByDate(userId, dateObj, entry as unknown as Record<string, unknown>)
  return entry
}

export function queueMorningMicroTaskGeneration(userId: string, entryId: string) {
  setImmediate(async () => {
    try {
      await generateMicroTasksFromEntry(userId, entryId)
    } catch (error) {
      console.error('[daily-cycle] microtask generation failed', error)
    }
  })
}

export async function regenerateMorningMicroTaskGeneration(userId: string, entryId: string) {
  const entry = await prisma.dailyEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      userId: true,
      content: true,
      date: true,
    },
  })

  if (!entry || entry.userId !== userId) {
    throw new Error('daily_entry_not_found')
  }

  const morningMeta = getSessionMeta(entry.content, 'morning')
  if (typeof morningMeta.microTasksRegeneratedAt === 'string') {
    throw new Error('microtasks_regeneration_limit_reached')
  }

  const generated = await generateMicroTasksFromEntry(userId, entryId, { replaceExisting: true })
  const nextContent = mergeSessionMeta(entry.content, 'morning', {
    microTasksRegeneratedAt: new Date().toISOString(),
  })

  await prisma.dailyEntry.update({
    where: { id: entryId },
    data: { content: nextContent },
  })

  await invalidateDayCache(userId, entry.date)
  await invalidateDailyHistoryCache(userId)
  await setCachedEntryByDate(userId, entry.date, {
    ...entry,
    content: nextContent,
  } as unknown as Record<string, unknown>)

  return generated
}

function getDayBounds(date: Date) {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(dayStart)
  dayEnd.setHours(23, 59, 59, 999)

  const nextDayEnd = new Date(dayStart)
  nextDayEnd.setDate(nextDayEnd.getDate() + 1)
  nextDayEnd.setHours(23, 59, 0, 0)

  return { dayEnd, nextDayEnd }
}

export async function resolveEveningMicroTasks(userId: string, date: string) {
  const { dayEnd, nextDayEnd } = getDayBounds(new Date(date))
  const tasks = await prisma.microTask.findMany({
    where: {
      userId,
      status: 'active',
      OR: [
        { dueAt: null },
        { dueAt: { lte: dayEnd } },
      ],
    },
    select: {
      id: true,
      title: true,
      stepsCompleted: true,
      daysToComplete: true,
    },
  })

  if (!tasks.length) {
    return { carriedOver: [], closed: [] as string[] }
  }

  const carriedOver: string[] = []
  const closed: string[] = []

  for (const task of tasks) {
    const stepsCompleted = Array.isArray(task.stepsCompleted)
      ? task.stepsCompleted.map(Boolean)
      : []
    const hasStarted = stepsCompleted.some(Boolean)

    if (hasStarted) {
      await prisma.microTask.update({
        where: { id: task.id },
        data: {
          dueAt: nextDayEnd,
          daysToComplete: Math.min(3, Math.max(1, task.daysToComplete ?? 1) + 1),
        },
      })
      carriedOver.push(task.title)
      continue
    }

    await prisma.microTask.update({
      where: { id: task.id },
      data: {
        status: 'skipped',
        isCompleted: false,
        completedAt: null,
      },
    })
    closed.push(task.title)
  }

  console.log('[daily-cycle] resolve-evening-microtasks', {
    userId,
    carriedOver,
    closed,
  })

  return { carriedOver, closed }
}

async function resolveEntryUserId(entryId: string): Promise<string | null> {
  const entry = await prisma.dailyEntry.findUnique({
    where: { id: entryId },
    select: { userId: true },
  })
  return entry?.userId ?? null
}

export async function getMicroTasks(entryId: string) {
  const cacheKey = `microtasks:entry:${entryId}`
  const cached = await cacheGet<Awaited<ReturnType<typeof prisma.microTask.findMany>>>(cacheKey)
  if (cached !== null) return cached

  const userId = await resolveEntryUserId(entryId)
  if (!userId) return []

  const tasks = await prisma.microTask.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  await cacheSet(cacheKey, tasks, 60)
  return tasks
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
      status: 'done',
      isCompleted: true,
      completedAt: new Date(),
    },
  })

  if (!result.count) return null
  await cacheDel(`microtasks:entry:${entryId}`)
  await invalidateDayCache(userId)
  await invalidateDailyHistoryCache(userId)
  return prisma.microTask.findUnique({ where: { id: taskId } })
}

export async function getDailyEntryHistory(userId: string) {
  return getCachedDailyHistory(userId)
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
