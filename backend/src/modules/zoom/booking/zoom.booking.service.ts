import { ZoomSessionType, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js'
import type { ZoomSessionAttendee } from '../types.js'

export function resolveEffectiveBookingQuestions(input: {
  sessionId: string
  questionEvents: Array<{
    userId: string | null
    payload: unknown
    createdAt: Date
  }>
}) {
  const effectiveQuestions = new Map<
    string,
    { userId: string; text: string; createdAt: Date }
  >()

  for (const event of input.questionEvents) {
    if (!event.userId) continue
    if (
      !event.payload ||
      typeof event.payload !== 'object' ||
      Array.isArray(event.payload)
    ) {
      continue
    }

    const payload = event.payload as Record<string, unknown>
    if (payload.sessionId !== input.sessionId) continue

    const questionText =
      typeof payload.questionText === 'string' ? payload.questionText.trim() : ''

    if (!questionText) continue

    const previousQuestion = effectiveQuestions.get(event.userId)
    effectiveQuestions.set(event.userId, {
      userId: event.userId,
      text: questionText,
      // Preserve the original queue slot when a participant edits the question.
      createdAt: previousQuestion?.createdAt ?? event.createdAt,
    })
  }

  return [...effectiveQuestions.values()].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  )
}

export async function getUpcomingZoomBookingView(userId: string) {
  const session = await prisma.zoomSession.findFirst({
    where: {
      scheduledAt: { gte: new Date() },
      status: ZoomStatus.SCHEDULED,
      OR: [
        { requests: { path: ['type'], equals: 'group_practice' } },
        { type: ZoomSessionType.GROUP },
      ],
    },
    include: {
      _count: { select: { attendees: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  if (!session) return null

  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId: session.id,
        userId,
      },
    },
    select: { id: true },
  })

  const questionEvents = await prisma.event.findMany({
    where: {
      type: 'ZOOM_BOOKING_QUESTION',
    },
    select: {
      userId: true,
      payload: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const orderedQuestions = resolveEffectiveBookingQuestions({
    sessionId: session.id,
    questionEvents,
  })

  const myQuestionIndex = orderedQuestions.findIndex(
    (question) => question.userId === userId,
  )

  const otherQuestions = orderedQuestions.filter(
    (question) => question.userId !== userId,
  )

  return {
    ...session,
    attendeesCount: session._count.attendees,
    isMyBooking: Boolean(attendee),
    myQuestion:
      myQuestionIndex >= 0
        ? {
            text: orderedQuestions[myQuestionIndex].text,
            position: myQuestionIndex + 1,
          }
        : null,
    questionPreviews: [],
    questionsCount: orderedQuestions.length,
    remainingQuestionsCount: Math.max(otherQuestions.length - 3, 0),
  }
}

export async function getZoomBookingNotificationContext(
  userId: string,
  sessionId: string
) {
  const [session, user, attendeesCount, questionEvents] = await Promise.all([
    prisma.zoomSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        topic: true,
        scheduledAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        telegramUserName: true,
      },
    }),
    prisma.zoomSessionAttendee.count({
      where: { sessionId },
    }),
    prisma.event.findMany({
      where: {
        type: 'ZOOM_BOOKING_QUESTION',
      },
      select: {
        userId: true,
        payload: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!session || !user) return null

  const orderedQuestions = resolveEffectiveBookingQuestions({
    sessionId,
    questionEvents,
  })

  const myQuestionIndex = orderedQuestions.findIndex(
    (question) => question.userId === userId,
  )

  const myQuestion =
    myQuestionIndex >= 0
      ? {
          text: orderedQuestions[myQuestionIndex].text,
          position: myQuestionIndex + 1,
        }
      : null

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Учасник'

  return {
    session,
    displayName,
    username: user.telegramUserName?.trim() || null,
    attendeesCount,
    myQuestion,
  }
}

export async function registerAttendee(
  userId: string,
  sessionId: string
): Promise<ZoomSessionAttendee> {
  return prisma.zoomSessionAttendee.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { userId, sessionId },
    update: {},
  })
}

export async function assertCanBookGroupPracticeSession(args: {
  userId: string
  sessionId: string
}): Promise<void> {
  const { userId, sessionId } = args
  const access = await getUserAccessState(userId)

  if (access.state === 'NO_ACCESS') {
    throw new Error('NO_ACTIVE_SUBSCRIPTION')
  }

  const session = await prisma.zoomSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })

  if (!session) throw new Error('session_not_found')
  if (session.status !== ZoomStatus.SCHEDULED) {
    throw new Error('session_unavailable')
  }

  const existingAttendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    select: {
      id: true,
    },
  })

  if (existingAttendee) {
    return
  }

  if (session._count.attendees >= session.capacity) {
    throw new Error('slot_full')
  }
}

export async function saveBookingQuestionForAttendee(
  userId: string,
  sessionId: string,
  questionText: string
): Promise<{ id: string; createdAt: Date }> {
  const normalizedQuestionText = questionText.trim()
  if (!normalizedQuestionText) {
    throw new Error('questionText required')
  }

  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    select: {
      id: true,
    },
  })

  if (!attendee) {
    throw new Error('booking_not_found')
  }

  const event = await prisma.event.create({
    data: {
      userId,
      type: 'ZOOM_BOOKING_QUESTION',
      source: 'web',
      payload: {
        sessionId,
        questionText: normalizedQuestionText,
      },
    },
    select: {
      id: true,
      createdAt: true,
    },
  })

  return event
}

export async function saveBookingPreparationForAttendee(
  userId: string,
  sessionId: string,
  preparationAnswer: string
): Promise<{ id: string; createdAt: Date }> {
  const normalizedPreparationAnswer = preparationAnswer.trim()
  if (!normalizedPreparationAnswer) {
    throw new Error('preparationAnswer required')
  }

  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    select: {
      id: true,
    },
  })

  if (!attendee) {
    throw new Error('booking_not_found')
  }

  const event = await prisma.event.create({
    data: {
      userId,
      type: 'ZOOM_BOOKING_PREPARATION',
      source: 'web',
      payload: {
        sessionId,
        preparationAnswer: normalizedPreparationAnswer,
      },
    },
    select: {
      id: true,
      createdAt: true,
    },
  })

  return event
}

export async function autoBookAllUpcomingGroupSessions(
  userId: string
): Promise<void> {
  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gte: new Date() },
      OR: [
        { type: ZoomSessionType.GROUP },
        { requests: { path: ['type'], equals: 'group_practice' } },
      ],
    },
    select: { id: true },
    orderBy: { scheduledAt: 'asc' },
  })

  for (const session of sessions) {
    await registerAttendee(userId, session.id)
  }
}
