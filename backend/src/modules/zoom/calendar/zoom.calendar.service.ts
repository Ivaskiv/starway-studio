import { hasPaidIndividualParticipation, isLegacyIndividualSession } from '../commerce/zoom.commerce-request.service.js'
import { ZoomSessionType, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js'
import type { ZoomSession } from '../types.js'
import { getQuestionSummariesBySessionId } from '../reports/zoom.reports.service.js'
import { parseZoomPostReport } from '../reports/zoomPostReport.types.js'
import { KYIV_TIME_ZONE, endOfKyivWeek, endOfRollingKyivWindow, startOfKyivDay, startOfKyivWeek } from '../shared/zoom.time.utils.js'
import { extractZoomLinkFromRequests, selectTrialZoomEligibleSession } from '../shared/zoom.session-selection.js'

export type CoachWeeklyDiarySession = {
  id: string
  scheduledAt: string
  topic: string
  status: ZoomStatus
  type: ZoomSessionType | string
  attendeesCount: number
  remainingSlots: number
  participantNames: string[]
  challengerName: string | null
  opponentName: string | null
  challengerId: string | null
  opponentId: string | null
  winnerId: string | null
  goalA: string | null
  goalB: string | null
  progressA: number
  progressB: number
  battleStatus: string | null
  questionPreviews: string[]
}

export type CoachWeeklyDiary = {
  week: { from: string; to: string; timezone: string }
  sessions: CoachWeeklyDiarySession[]
}

export async function getCalendarSessions(args: {
  from: Date
  to: Date
  role: 'coach' | 'user'
  userId: string
  expertId?: string
}): Promise<
  (ZoomSession & {
    _count: { attendees: number };
    attendees?: Array<{
      userId: string
      goalText: string | null
      progress: unknown
      attended: boolean
      user: {
        id: string
        firstName: string | null
        lastName: string | null
        email: string | null
      }
    }>;
    isMyBooking?: boolean;
  })[]
> {
  const { from, to, role, userId, expertId } = args

  if (role === 'coach') {
    return prisma.zoomSession.findMany({
      where: { expertId, scheduledAt: { gte: from, lte: to } },
      include: {
        _count: { select: { attendees: true } },
        attendees: {
          select: {
            userId: true,
            goalText: true,
            progress: true,
            attended: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
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
          { requests: { path: ['type'], equals: 'individual' } },
          { type: ZoomSessionType.GROUP },
          { commerceRequests: { some: { requesterUserId: userId } } },
        ],
      },
      include: {
        _count: { select: { attendees: true } },
        attendees: {
          select: {
            userId: true,
            goalText: true,
            progress: true,
            attended: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
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
          { requests: { path: ['type'], equals: 'individual' } },
          { type: ZoomSessionType.GROUP },
          { commerceRequests: { some: { requesterUserId: userId } } },
        ],
      },
      include: {
        _count: { select: { attendees: true } },
        attendees: {
          select: {
            userId: true,
            goalText: true,
            progress: true,
            attended: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
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
          { requests: { path: ['type'], equals: 'individual' } },
          { type: ZoomSessionType.GROUP },
          { commerceRequests: { some: { requesterUserId: userId } } },
        ],
      },
      include: {
        _count: { select: { attendees: true } },
        attendees: {
          select: {
            userId: true,
            goalText: true,
            progress: true,
            attended: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
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
      OR: [
        { requests: { path: ['type'], equals: 'group_practice' } },
        { requests: { path: ['type'], equals: 'individual' } },
        { type: ZoomSessionType.GROUP },
        { attendees: { some: { userId } } },
        { commerceRequests: { some: { requesterUserId: userId } } },
      ],
    },
    include: {
      _count: { select: { attendees: true } },
      attendees: {
        select: {
          userId: true,
          goalText: true,
          progress: true,
          attended: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
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

function getAttendeeName(attendee: {
  user?: {
    firstName: string | null
    lastName: string | null
    email: string | null
  }
} | undefined): string | null {
  if (!attendee) return null

  return [attendee.user?.firstName, attendee.user?.lastName].filter(Boolean).join(' ').trim()
    || attendee.user?.email
    || null
}

function getProgressCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

function isPresentString(value: string | null): value is string {
  return Boolean(value)
}

function readSessionMeta(requests: unknown): Record<string, unknown> {
  return requests && typeof requests === 'object' && !Array.isArray(requests)
    ? requests as Record<string, unknown>
    : {}
}

export async function getCoachWeeklyDiary(args: {
  userId: string
  expertId?: string | null
  now?: Date
}): Promise<CoachWeeklyDiary> {
  const from = startOfKyivWeek(args.now)
  const to = endOfKyivWeek(args.now)
  const sessions = await getCalendarSessions({
    from,
    to,
    role: 'coach',
    userId: args.userId,
    expertId: args.expertId ?? undefined,
  })
  const questionSummaries = await getQuestionSummariesBySessionId(
    sessions.map((session) => session.id)
  )

  return {
    week: {
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: KYIV_TIME_ZONE,
    },
    sessions: sessions.map((session) => {
      const meta = readSessionMeta(session.requests)
      const attendees = session.attendees ?? []
      const attendeesCount = session._count?.attendees ?? 0
      const maxSlots =
        typeof meta.maxSlots === 'number'
          ? meta.maxSlots
          : typeof meta.maxAttendees === 'number'
            ? meta.maxAttendees
            : 50
      const challenger = attendees.find((attendee) => attendee.userId === meta.challengerId)
      const opponent = attendees.find((attendee) => attendee.userId === meta.opponentId)
      const questionSummary = questionSummaries.get(session.id)

      return {
        id: session.id,
        scheduledAt: session.scheduledAt.toISOString(),
        topic: session.topic,
        status: session.status,
        type: (typeof meta.type === 'string' ? meta.type : session.type) as ZoomSessionType | string,
        attendeesCount,
        remainingSlots: Math.max(0, maxSlots - attendeesCount),
        participantNames: attendees.map((attendee) => getAttendeeName(attendee)).filter(isPresentString),
        challengerName: getAttendeeName(challenger),
        opponentName: getAttendeeName(opponent),
        challengerId: typeof meta.challengerId === 'string' ? meta.challengerId : null,
        opponentId: typeof meta.opponentId === 'string' ? meta.opponentId : null,
        winnerId: typeof meta.winnerId === 'string' ? meta.winnerId : null,
        goalA: challenger?.goalText ?? null,
        goalB: opponent?.goalText ?? null,
        progressA: getProgressCount(challenger?.progress),
        progressB: getProgressCount(opponent?.progress),
        battleStatus: typeof meta.battleStatus === 'string' ? meta.battleStatus : null,
        questionPreviews: questionSummary?.questionPreviews ?? [],
      }
    }).sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime() -
        new Date(right.scheduledAt).getTime()
    ),
  }
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

  const normalized = await Promise.all(sessions.map(async (session) => {
    const meta =
      session.requests &&
      typeof session.requests === 'object' &&
      !Array.isArray(session.requests)
        ? (session.requests as Record<string, unknown>)
        : {}
    const report = parseZoomPostReport(session.postSessionReport)
    const attendeesCount =
      (session as { _count?: { attendees?: number } })._count?.attendees ?? 0
    const individualPaid = args.role === 'coach' || !isLegacyIndividualSession(session)
      || await hasPaidIndividualParticipation(args.userId, session.id)
    const zoomLink = individualPaid ? extractZoomLinkFromRequests(session.requests) : ''
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
      isMyBooking: individualPaid && Boolean((session as { isMyBooking?: boolean }).isMyBooking),
      audioFileId: report?.audioFileId ?? null,
      hasAudio: Boolean(report?.audioFileId),
    }
  }))

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
