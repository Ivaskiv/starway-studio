import {
  DayStatus,
  DailyChoice,
  DailyState,
  Prisma,
} from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { ensureUserExpertId } from '../ai-mentor/helpers.js'
import { updateCrossChannelUserState } from '../user-state/crossChannelState.service.js'
import { generateDailyAiAnalysis } from './ai.js'
import {
  invalidateDailyHistoryCache,
  invalidateDayCache,
  setCachedEntryByDate,
} from '../../lib/db/dailyCache.js'
import { assertRecoverableDate } from './recovery.js'
import type { SaveDailyAnswerInput } from './types.js'
import {
  getAnswerRecord,
  getContentRecord,
  getJournalDayAnchor,
  getTodayKyiv,
  mergeSessionContent,
  mergeSessionMeta,
  toDailySessionChannel,
  toPrismaJson,
} from './helpers.js'
import {
  ensureYesterdayResolvedForToday,
  syncUserStateFromEntry,
  type DailyEntryRow,
} from './entry.js'

const dailySessionDelegate = (
  prisma as unknown as {
    dailySession?: {
      upsert: (args: unknown) => Promise<unknown>
    }
  }
).dailySession

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

  await prisma.dailyAnswer.upsert({
    where: {
      userId_date_questionId: {
        userId,
        date: getTodayKyiv(),
        questionId: data.questionId,
      },
    },
    create: {
      userId,
      date: getTodayKyiv(),
      questionId: data.questionId,
      questionType: data.questionId.startsWith('dynamic_q') ? 'DYNAMIC' : 'STATIC',
      answer: data.answer,
    },
    update: {
      answer: data.answer,
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
