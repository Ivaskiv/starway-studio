import { ZoomSessionType, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js'
import type { ZoomSession } from '../types.js'
import { getQuestionSummariesBySessionId } from '../reports/zoom.reports.service.js'
import { parseZoomPostReport } from '../reports/zoomPostReport.types.js'
import { KYIV_TIME_ZONE, endOfRollingKyivWindow, startOfKyivDay } from '../shared/zoom.time.utils.js'
import { extractZoomLinkFromRequests, selectTrialZoomEligibleSession } from '../shared/zoom.session-selection.js'

export async function getCalendarSessions(args: {
  from: Date
  to: Date
  role: 'coach' | 'user'
  userId: string
  expertId?: string
}): Promise<
  (ZoomSession & { _count: { attendees: number }; isMyBooking?: boolean })[]
> {
  const { from, to, role, userId, expertId } = args

  if (role === 'coach') {
    return prisma.zoomSession.findMany({
      where: { expertId, scheduledAt: { gte: from, lte: to } },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })
  }

  if (!expertId) {
    const sessions = await prisma.zoomSession.findMany({
      where: {
        scheduledAt: { gte: from, lte: to },
        status: { not: ZoomStatus.CANCELLED },
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: ZoomSessionType.GROUP },
        ],
      },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })

    const bookedIds = new Set(
      (
        await prisma.zoomSessionAttendee.findMany({
          where: {
            userId,
            sessionId: { in: sessions.map((session) => session.id) },
          },
          select: { sessionId: true },
        })
      ).map((attendee) => attendee.sessionId)
    )

    return sessions.map((session) => ({
      ...session,
      isMyBooking: bookedIds.has(session.id),
    }))
  }

  const zoomAccess = await getUserAccessState(userId)
  const userIsSubscriber = zoomAccess.state === 'FOCUS_ACTIVE'

  if (zoomAccess.state === 'PREMIUM') {
    const sessions = await prisma.zoomSession.findMany({
      where: {
        expertId,
        scheduledAt: { gte: from, lte: to },
        status: { not: ZoomStatus.CANCELLED },
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: ZoomSessionType.GROUP },
        ],
      },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })

    const eligibleSession = selectTrialZoomEligibleSession(
      sessions,
      zoomAccess.expiresAt
    )
    if (!eligibleSession) {
      return []
    }

    const attendee = await prisma.zoomSessionAttendee.findUnique({
      where: {
        sessionId_userId: {
          sessionId: eligibleSession.id,
          userId,
        },
      },
      select: {
        id: true,
      },
    })

    return [{ ...eligibleSession, isMyBooking: Boolean(attendee) }]
  }

  if (!userIsSubscriber) {
    const sessions = await prisma.zoomSession.findMany({
      where: {
        expertId,
        scheduledAt: { gte: from, lte: to },
        status: { not: ZoomStatus.CANCELLED },
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: ZoomSessionType.GROUP },
        ],
      },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })

    const bookedIds = new Set(
      (
        await prisma.zoomSessionAttendee.findMany({
          where: {
            userId,
            sessionId: { in: sessions.map((session) => session.id) },
          },
          select: { sessionId: true },
        })
      ).map((attendee) => attendee.sessionId)
    )

    return sessions.map((session) => ({
      ...session,
      isMyBooking: bookedIds.has(session.id),
    }))
  }

  // Show all expert sessions, flagging which ones the user booked
  const sessions = await prisma.zoomSession.findMany({
    where: {
      expertId,
      scheduledAt: { gte: from, lte: to },
      status: { not: ZoomStatus.CANCELLED },
    },
    include: { _count: { select: { attendees: true } } },
    orderBy: { scheduledAt: 'asc' },
  })

  const bookedIds = new Set(
    (
      await prisma.zoomSessionAttendee.findMany({
        where: { userId, sessionId: { in: sessions.map((s) => s.id) } },
        select: { sessionId: true },
      })
    ).map((a) => a.sessionId)
  )

  return sessions.map((s) => ({ ...s, isMyBooking: bookedIds.has(s.id) }))
}

export async function getCurrentWeekZoomOverview(args: {
  userId: string
  role: 'coach' | 'user'
  expertId?: string | null
  now?: Date
}): Promise<{
  week: { from: string; to: string; timezone: string }
  sessions: Array<{
    id: string
    scheduledAt: string
    topic: string
    status: ZoomStatus
    type: ZoomSessionType
    zoomLink: string
    attendeesCount: number
    questionPreviews: string[]
    questionsCount: number
    remainingQuestionsCount: number
    isMyBooking: boolean
    audioFileId: string | null
    hasAudio: boolean
  }>
  audios: Array<{
    sessionId: string
    scheduledAt: string
    topic: string
    status: ZoomStatus
    type: ZoomSessionType
    audioFileId: string
  }>
}> {
  const from = startOfKyivDay(args.now)
  const to = endOfRollingKyivWindow(args.now)
  const sessions = await getCalendarSessions({
    from,
    to,
    role: args.role,
    userId: args.userId,
    expertId: args.expertId ?? undefined,
  })
  const questionSummaries = await getQuestionSummariesBySessionId(
    sessions.map((session) => session.id)
  )

  const normalized = sessions.map((session) => {
    const meta =
      session.requests &&
      typeof session.requests === 'object' &&
      !Array.isArray(session.requests)
        ? (session.requests as Record<string, unknown>)
        : {}
    const report = parseZoomPostReport(session.postSessionReport)
    const attendeesCount =
      (session as { _count?: { attendees?: number } })._count?.attendees ?? 0
    const zoomLink = extractZoomLinkFromRequests(session.requests)
    const questionSummary = questionSummaries.get(session.id)

    return {
      id: session.id,
      scheduledAt: session.scheduledAt.toISOString(),
      topic: session.topic,
      status: session.status,
      type: (typeof meta.type === 'string'
        ? meta.type
        : session.type) as ZoomSessionType,
      zoomLink,
      attendeesCount,
      questionPreviews:
        args.role === 'coach' ? (questionSummary?.questionPreviews ?? []) : [],
      questionsCount: questionSummary?.questionsCount ?? 0,
      remainingQuestionsCount: questionSummary?.remainingQuestionsCount ?? 0,
      isMyBooking: Boolean((session as { isMyBooking?: boolean }).isMyBooking),
      audioFileId: report?.audioFileId ?? null,
      hasAudio: Boolean(report?.audioFileId),
    }
  })

  const audios = normalized
    .filter((session) => Boolean(session.audioFileId))
    .map((session) => ({
      sessionId: session.id,
      scheduledAt: session.scheduledAt,
      topic: session.topic,
      status: session.status,
      type: session.type,
      audioFileId: String(session.audioFileId),
    }))

  return {
    week: {
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: KYIV_TIME_ZONE,
    },
    sessions: normalized.sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime() -
        new Date(right.scheduledAt).getTime()
    ),
    audios,
  }
}

export async function getPublicCurrentWeekZoomOverview(
  now = new Date()
): Promise<{
  week: { from: string; to: string; timezone: string }
  sessions: Array<{
    id: string
    scheduledAt: string
    topic: string
    status: ZoomStatus
    type: ZoomSessionType
    zoomLink: string
    attendeesCount: number
    isMyBooking: boolean
    audioFileId: string | null
    hasAudio: boolean
  }>
  audios: Array<{
    sessionId: string
    scheduledAt: string
    topic: string
    status: ZoomStatus
    type: ZoomSessionType
    audioFileId: string
  }>
}> {
  const from = startOfKyivDay(now)
  const to = endOfRollingKyivWindow(now)
  const sessions = await prisma.zoomSession.findMany({
    where: {
      scheduledAt: { gte: from, lt: to },
      status: { not: ZoomStatus.CANCELLED },
      requests: {
        path: ['type'],
        equals: 'group_practice',
      },
    },
    include: { _count: { select: { attendees: true } } },
    orderBy: { scheduledAt: 'asc' },
  })

  const normalized = sessions.map((session) => {
    const meta =
      session.requests &&
      typeof session.requests === 'object' &&
      !Array.isArray(session.requests)
        ? (session.requests as Record<string, unknown>)
        : {}
    const report = parseZoomPostReport(session.postSessionReport)
    const attendeesCount =
      (session as { _count?: { attendees?: number } })._count?.attendees ?? 0
    const zoomLink = extractZoomLinkFromRequests(session.requests)

    return {
      id: session.id,
      scheduledAt: session.scheduledAt.toISOString(),
      topic: session.topic,
      status: session.status,
      type: (typeof meta.type === 'string'
        ? meta.type
        : session.type) as ZoomSessionType,
      zoomLink,
      attendeesCount,
      isMyBooking: false,
      audioFileId: report?.audioFileId ?? null,
      hasAudio: Boolean(report?.audioFileId),
    }
  })

  const audios = normalized
    .filter((session) => Boolean(session.audioFileId))
    .map((session) => ({
      sessionId: session.id,
      scheduledAt: session.scheduledAt,
      topic: session.topic,
      status: session.status,
      type: session.type,
      audioFileId: String(session.audioFileId),
    }))

  return {
    week: {
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: KYIV_TIME_ZONE,
    },
    sessions: normalized,
    audios,
  }
}
