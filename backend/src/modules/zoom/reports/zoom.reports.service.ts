import { ZoomSessionType, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { getCachedLatestWeeklyReport } from '../../../lib/db/weeklyReportCache.js'
import { resolveEffectiveBookingQuestions } from '../booking/zoom.booking.service.js'
import { parseZoomPostReport } from './zoomPostReport.types.js'

const KYIV_TIME_ZONE = 'Europe/Kyiv'

export type PreviousZoomSessionRecap = {
  id: string
  title: string | null
  startsAt: string
  endsAt: string | null
  summary: string | null
  recordingUrl: string | null
  materialsUrl: string | null
  attendanceStatus: string | null
  attendanceCount: number
  nextStep: string | null
}

export type ZoomWeeklyReportSummary = {
  id: string
  weekStart: string
  weekEnd: string
  generatedAt: string
  summary: string | null
  progress: string | null
  achievement: string | null
  blocker: string | null
  nextStep: string | null
  detailsAvailable: boolean
}

type BookingQuestionEventPayload = {
  sessionId?: string
  questionText?: string
}

function parseBookingQuestionPayload(
  payload: unknown
): BookingQuestionEventPayload {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return {}
  }

  return payload as BookingQuestionEventPayload
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => String(item ?? '').trim()).filter(Boolean)
}

function dedupeQuestionTexts(questionTexts: string[]): string[] {
  const seen = new Set<string>()

  return questionTexts.filter((questionText) => {
    const normalized = questionText.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) {
      return false
    }

    seen.add(normalized)
    return true
  })
}

export async function getQuestionSummariesBySessionId(sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return new Map<
      string,
      {
        questionPreviews: string[]
        questionsCount: number
        remainingQuestionsCount: number
      }
    >()
  }

  const questionEvents = await prisma.event.findMany({
    where: {
      type: 'ZOOM_BOOKING_QUESTION',
      OR: sessionIds.map((sessionId) => ({
        payload: {
          path: ['sessionId'],
          equals: sessionId,
        },
      })),
    },
    select: {
      userId: true,
      payload: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const questionsBySessionId = new Map<string, string[]>()

  const summaries = new Map<
    string,
    {
      questionPreviews: string[]
      questionsCount: number
      remainingQuestionsCount: number
    }
  >()
  const sessionsWithStarterQuestions = await prisma.zoomSession.findMany({
    where: {
      id: { in: sessionIds },
    },
    select: {
      id: true,
      requests: true,
    },
  })

  const starterQuestionsBySessionId = new Map<string, string[]>()

  for (const session of sessionsWithStarterQuestions) {
    const requests =
      session.requests &&
      typeof session.requests === 'object' &&
      !Array.isArray(session.requests)
        ? (session.requests as Record<string, unknown>)
        : {}

    const starterQuestions = Array.isArray(requests.starterQuestions)
      ? requests.starterQuestions
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : []

    starterQuestionsBySessionId.set(session.id, starterQuestions)
  }
  for (const sessionId of sessionIds) {
    const starterQuestions = starterQuestionsBySessionId.get(sessionId) ?? []
    const userQuestions = resolveEffectiveBookingQuestions({
      sessionId,
      questionEvents,
    }).map((question) => question.text)

    questionsBySessionId.set(sessionId, userQuestions)

    const questions = dedupeQuestionTexts([
      ...starterQuestions,
      ...userQuestions,
    ])

    summaries.set(sessionId, {
      questionPreviews: questions,
      questionsCount: questions.length,
      remainingQuestionsCount: Math.max(questions.length - 3, 0),
    })
  }

  return summaries
}

export async function getUserPreviousZoomSessionRecap(
  userId: string,
  now = new Date()
): Promise<PreviousZoomSessionRecap | null> {
  const session = await prisma.zoomSession.findFirst({
    where: {
      status: ZoomStatus.COMPLETED,
      scheduledAt: { lte: now },
      OR: [
        { requests: { path: ['type'], equals: 'group_practice' } },
        { type: ZoomSessionType.GROUP },
      ],
    },
    include: {
      _count: {
        select: {
          attendees: true,
        },
      },
      attendees: {
        where: {
          userId,
        },
        select: {
          attended: true,
        },
        take: 1,
      },
    },
    orderBy: {
      scheduledAt: 'desc',
    },
  })

  if (!session) {
    return null
  }

  const report = parseZoomPostReport(session.postSessionReport)
  const explicitTitle = session.topic.trim()
  const fallbackTitle = `Zoom-практика за ${session.scheduledAt.toLocaleDateString(
    'uk-UA',
    {
      day: 'numeric',
      month: 'long',
      timeZone: KYIV_TIME_ZONE,
    }
  )}`
  const attendee = session.attendees[0] ?? null

  return {
    id: session.id,
    title: explicitTitle || fallbackTitle,
    startsAt: session.scheduledAt.toISOString(),
    endsAt: null,
    summary: report?.summary?.trim() || null,
    recordingUrl: report?.audioUrl?.trim() || null,
    materialsUrl: null,
    attendanceStatus: attendee
      ? attendee.attended
        ? 'ATTENDED'
        : 'BOOKED'
      : null,
    attendanceCount: session._count.attendees,
    nextStep:
      report?.actionItems?.[0]?.trim() || report?.nextFocus?.trim() || null,
  }
}

export async function getUserLatestWeeklyReportSummary(
  userId: string
): Promise<ZoomWeeklyReportSummary | null> {
  const report = await getCachedLatestWeeklyReport(userId)
  if (!report) {
    return null
  }

  const topInsights = normalizeStringList(report.topInsights)
  const struggleAreas = normalizeStringList(report.struggleAreas)
  const nextWeekTasks = normalizeStringList(report.nextWeekTasks)
  const metrics =
    report.metrics &&
    typeof report.metrics === 'object' &&
    !Array.isArray(report.metrics)
      ? (report.metrics as Record<string, unknown>)
      : {}
  const analysis =
    report.analysis &&
    typeof report.analysis === 'object' &&
    !Array.isArray(report.analysis)
      ? (report.analysis as Record<string, unknown>)
      : {}

  const tasksDone =
    typeof metrics.tasksDone === 'number' ? metrics.tasksDone : null
  const tasksTotal =
    typeof metrics.tasksTotal === 'number' ? metrics.tasksTotal : null
  const reflections =
    typeof metrics.reflections === 'number' ? metrics.reflections : null
  const sessions =
    typeof metrics.sessions === 'number' ? metrics.sessions : null

  const progressParts = [
    tasksDone !== null && tasksTotal !== null
      ? `Виконано ${tasksDone}/${tasksTotal} задач`
      : null,
    reflections !== null ? `${reflections} рефлексій` : null,
    sessions !== null ? `${sessions} AI-сесій` : null,
  ].filter(Boolean)

  return {
    id: report.id,
    weekStart: report.weekStart.toISOString(),
    weekEnd: report.weekEnd.toISOString(),
    generatedAt: report.createdAt.toISOString(),
    summary:
      typeof report.summaryText === 'string' && report.summaryText.trim()
        ? report.summaryText.trim()
        : null,
    progress: progressParts[0] ?? null,
    achievement: topInsights[0] ?? null,
    blocker:
      struggleAreas[0] ??
      (typeof analysis.mainPainThisWeek === 'string' &&
      analysis.mainPainThisWeek.trim()
        ? analysis.mainPainThisWeek.trim()
        : null),
    nextStep:
      typeof report.nextWeekFocus === 'string' && report.nextWeekFocus.trim()
        ? report.nextWeekFocus.trim()
        : (nextWeekTasks[0] ?? null),
    detailsAvailable: true,
  }
}
