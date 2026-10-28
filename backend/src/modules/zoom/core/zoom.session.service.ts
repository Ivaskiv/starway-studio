import { Prisma, ZoomSessionType, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { bot } from '../../../lib/telegram.js'
import type { ZoomSession } from '../types.js'
import {
  getKyivDateKey,
  isGroupPracticeRequest,
  isKyivMonday,
  resolveRequestedSessionType,
  selectCanonicalMondayGroupPracticeSessions,
} from '../shared/zoom.session-selection.js'
import { assertWeeklyPrivateLimit } from '../private/zoom.private-booking.service.js'
import { afterZoomOperation } from './zoom.operations.service.js'
import { notifySubscribersNewSession } from '../notifications/zoom.subscriber-notifications.service.js'

export async function findCanonicalMondayGroupPractice(input: {
  expertId: string
  scheduledAt: Date
}): Promise<ZoomSession | null> {
  if (!isKyivMonday(input.scheduledAt)) return null

  // The query is deliberately wider than one UTC day because the canonical
  // business date is Kyiv-local and shifts with daylight-saving time.
  const searchRadiusMs = 26 * 60 * 60 * 1000
  const candidates = await prisma.zoomSession.findMany({
    where: {
      expertId: input.expertId,
      scheduledAt: {
        gte: new Date(input.scheduledAt.getTime() - searchRadiusMs),
        lte: new Date(input.scheduledAt.getTime() + searchRadiusMs),
      },
      status: { not: ZoomStatus.CANCELLED },
      requests: { path: ['type'], equals: 'group_practice' },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  const targetDate = getKyivDateKey(input.scheduledAt)
  return selectCanonicalMondayGroupPracticeSessions(candidates)
    .find((session) => getKyivDateKey(session.scheduledAt) === targetDate)
    ?? null
}

export async function createZoomSession(
  expertId: string,
  scheduledAt: Date,
  topic: string,
  requests: any[] = []
): Promise<ZoomSession> {
  if (resolveRequestedSessionType(requests) === 'individual') {
    await assertWeeklyPrivateLimit(expertId, scheduledAt)
  }

  return createFullSession({
    expertId,
    scheduledAt,
    topic,
    requests: requests as Prisma.InputJsonValue,
  })
}

export async function getUpcomingZoom(): Promise<ZoomSession | null> {
  return prisma.zoomSession.findFirst({
    where: {
      scheduledAt: { gte: new Date() },
      status: ZoomStatus.SCHEDULED,
    },
    orderBy: { scheduledAt: 'asc' },
  })
}

export async function updateSession(
  sessionId: string,
  patch: {
    scheduledAt?: Date
    topic?: string
    requests?: Prisma.InputJsonValue
  }
): Promise<ZoomSession> {
  const session = await prisma.zoomSession.update({
    where: { id: sessionId },
    data: patch,
  })
  void afterZoomOperation(bot, {
    operation: 'update',
    sessionId: session.id,
    affectedUserIds: [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))
  return session
}

export async function cancelSession(
  sessionId: string,
  options?: { affectedUserIds?: string[] },
): Promise<ZoomSession> {
  const session = await prisma.zoomSession.update({
    where: { id: sessionId },
    data: { status: ZoomStatus.CANCELLED },
  })

  void afterZoomOperation(bot, {
    operation: 'cancel',
    sessionId: session.id,
    affectedUserIds: options?.affectedUserIds ?? [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  return session
}

/**
 * Deletes disposable coach inventory only. A committed Individual session is
 * deliberately not treated as a slot: its cancellation and history remain on
 * the existing lifecycle path.
 */
export async function deleteFreeIndividualSlot(input: {
  sessionId: string
  expertId: string
}): Promise<ZoomSession> {
  return prisma.$transaction(async tx => {
    // A booking inserts a foreign-key reference to this row. The lock makes
    // the safety check and delete one boundary: the booking either commits
    // first and protects the slot, or observes the deletion and fails cleanly.
    await tx.$queryRaw`SELECT id FROM "ZoomSession" WHERE id = ${input.sessionId} FOR UPDATE`
    const session = await tx.zoomSession.findUnique({
      where: { id: input.sessionId },
      include: {
        attendees: { select: { id: true } },
        commerceRequests: { select: { id: true } },
      },
    })

    if (!session) throw new Error('SESSION_NOT_FOUND')
    if (session.expertId !== input.expertId) throw new Error('FORBIDDEN')

    const requestedType = resolveRequestedSessionType(session.requests)
    const isIndividual = requestedType === 'individual'
      || session.type === ZoomSessionType.INDIVIDUAL
      || session.type === ZoomSessionType.PRIVATE
    const isDisposableSlot = isIndividual
      // A coach may remove a cancelled inventory slot, but never a cancelled
      // booking: attendee, commerce and report checks below distinguish them.
      && (session.status === ZoomStatus.SCHEDULED || session.status === ZoomStatus.CANCELLED)
      && session.postSessionReport === null
      && session.attendees.length === 0
      // Keep all commerce history intact; the schema relation also blocks a
      // late delete if another transaction commits a request first.
      && session.commerceRequests.length === 0

    if (!isDisposableSlot) throw new Error('SLOT_NOT_DELETABLE')

    return tx.zoomSession.delete({ where: { id: session.id } })
  })
}

export async function createFullSession(
  data: {
    expertId?: string
    scheduledAt: Date
    topic: string
    requests: Prisma.InputJsonValue
  },
  options?: {
    suppressAutomation?: boolean
    suppressSessionNotification?: boolean
  }
): Promise<ZoomSession> {
  if (data.expertId && isGroupPracticeRequest(data.requests)) {
    const existingCanonicalPractice = await findCanonicalMondayGroupPractice({
      expertId: data.expertId,
      scheduledAt: data.scheduledAt,
    })
    if (existingCanonicalPractice) return existingCanonicalPractice
  }

  console.log('[zoom/service createFullSession] input:', {
    expertId: data.expertId ?? null,
    scheduledAt: data.scheduledAt?.toISOString?.() ?? String(data.scheduledAt),
    topic: data.topic,
    type:
      data.requests &&
      typeof data.requests === 'object' &&
      !Array.isArray(data.requests)
        ? ((data.requests as Record<string, unknown>).type ?? null)
        : null,
  })
  let session: ZoomSession
  try {
    session = await prisma.zoomSession.create({
      data: { ...data, status: ZoomStatus.SCHEDULED },
    })
  } catch (err) {
    console.error('[zoom/service createFullSession] ERROR:', err)
    throw err
  }
  console.log('[zoom/service createFullSession] created:', session.id)
  if (!options?.suppressAutomation) {
    void afterZoomOperation(bot, {
      operation: 'create',
      sessionId: session.id,
      affectedUserIds: [],
    }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))
  }

  if (
    isGroupPracticeRequest(session.requests) &&
    !options?.suppressSessionNotification
  ) {
    void notifySubscribersNewSession(bot, session).catch((err) =>
      console.error('[zoom] notify failed:', err)
    )
  }
  return session
}

export async function getSessionById(id: string): Promise<ZoomSession | null> {
  return prisma.zoomSession.findUnique({ where: { id } })
}

export async function getAllUpcomingSessionsForNotification(
  before: Date
): Promise<ZoomSession[]> {
  return prisma.zoomSession.findMany({
    where: { status: ZoomStatus.SCHEDULED, scheduledAt: { lte: before } },
    orderBy: { scheduledAt: 'asc' },
  })
}

export async function getUpcomingGroupSessions(
  limit: number
): Promise<ZoomSession[]> {
  return prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gt: new Date() },
      requests: { path: ['type'], equals: 'group_practice' },
    },
    orderBy: { scheduledAt: 'asc' },
    take: Math.max(1, limit),
  })
}
