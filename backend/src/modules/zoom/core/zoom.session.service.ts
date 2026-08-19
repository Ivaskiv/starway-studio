import { Prisma, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { bot } from '../../../lib/telegram.js'
import type { ZoomSession } from '../types.js'
import { resolveRequestedSessionType } from '../shared/zoom.session-selection.js'
import { assertWeeklyPrivateLimit } from '../private/zoom.private-booking.service.js'
import { afterZoomOperation } from './zoom.operations.service.js'
import { notifySubscribersNewSession } from '../notifications/zoom.subscriber-notifications.service.js'

function isGroupPracticeRequest(requests: unknown): boolean { return Boolean(requests && !Array.isArray(requests) && typeof requests === 'object' && (requests as Record<string, unknown>).type === 'group_practice') }

export async function createZoomSession(
  expertId: string,
  scheduledAt: Date,
  topic: string,
  requests: any[] = []
): Promise<ZoomSession> {
  if (resolveRequestedSessionType(requests) === 'individual') {
    await assertWeeklyPrivateLimit(expertId, scheduledAt)
  }

  console.log('[zoom/service createZoomSession] input:', {
    expertId,
    scheduledAt: scheduledAt?.toISOString?.() ?? String(scheduledAt),
    topic,
    type:
      requests && typeof requests === 'object' && !Array.isArray(requests)
        ? ((requests as Record<string, unknown>).type ?? null)
        : null,
  })
  let session: ZoomSession
  try {
    session = await prisma.zoomSession.create({
      data: {
        expertId, // ← прямий expertId (найпростіший і найшвидший спосіб)
        scheduledAt,
        topic,
        requests: requests as Prisma.InputJsonValue,
        status: ZoomStatus.SCHEDULED,
      },
    })
  } catch (err) {
    console.error('[zoom/service createZoomSession] ERROR:', err)
    throw err
  }
  console.log('[zoom/service createZoomSession] created:', session.id)

  void afterZoomOperation(bot, {
    operation: 'create',
    sessionId: session.id,
    affectedUserIds: [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  if (isGroupPracticeRequest(session.requests)) {
    void notifySubscribersNewSession(bot, session).catch((err) =>
      console.error('[zoom] notify failed:', err)
    )
  }

  return session
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

export async function cancelSession(sessionId: string): Promise<ZoomSession> {
  const session = await prisma.zoomSession.update({
    where: { id: sessionId },
    data: { status: ZoomStatus.CANCELLED },
  })

  void afterZoomOperation(bot, {
    operation: 'cancel',
    sessionId: session.id,
    affectedUserIds: [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  return session
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
