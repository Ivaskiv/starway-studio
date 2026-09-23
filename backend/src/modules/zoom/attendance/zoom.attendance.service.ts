import { Prisma, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { activateAbsystemTrialAfterFirstZoom } from '../../access/service.js'
import type { ZoomAttendeeWithUser, ZoomSession, ZoomSessionAttendee } from '../types.js'

export type ZoomCompletionSource = 'manual' | 'zoom'

export type CompleteZoomSessionInput = {
  sessionId: string
  actor?: {
    userId: string
    role?: string | null
    expertId?: string | null
  }
  source: ZoomCompletionSource
  actualParticipantUserIds?: string[]
  attendeeCount?: number
  topic?: string | null
  summary?: string | null
  recordingRef?: string | null
  startedAt?: Date | string | null
  endedAt?: Date | string | null
  completedAt?: Date | string | null
  reportPatch?: Record<string, unknown>
}

type CompletionTx = Pick<
  Prisma.TransactionClient,
  'zoomSession' | 'zoomSessionAttendee'
>

function normalizeString(value: unknown): string | null {
  const normalized = String(value ?? '').trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeDateIso(value: Date | string | null | undefined): string | null {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return [...new Set(
    value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean),
  )]
}

function readReport(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

function assertManualCompletionAuthorized(input: CompleteZoomSessionInput, session: { expertId: string | null }) {
  if (input.source !== 'manual') return

  const role = String(input.actor?.role ?? '').toUpperCase()
  if (role === 'ADMIN' || role === 'SUPERADMIN') return
  if (input.actor?.expertId && input.actor.expertId === session.expertId) return

  throw new Error('FORBIDDEN')
}

async function persistActualAttendance(args: {
  tx: CompletionTx
  sessionId: string
  actualParticipantUserIds: string[]
  completedAt: Date
}): Promise<number | null> {
  if (args.actualParticipantUserIds.length === 0) return null

  await args.tx.zoomSessionAttendee.updateMany({
    where: { sessionId: args.sessionId },
    data: { attended: false },
  })

  const attended = await args.tx.zoomSessionAttendee.updateMany({
    where: {
      sessionId: args.sessionId,
      userId: { in: args.actualParticipantUserIds },
    },
    data: { attended: true },
  })

  for (const userId of args.actualParticipantUserIds) {
    await activateAbsystemTrialAfterFirstZoom({
      userId,
      attendedAt: args.completedAt,
      tx: args.tx as Prisma.TransactionClient,
    })
  }

  return attended.count
}

export async function markAttended(
  attendeeId: string,
  attendedAt = new Date()
): Promise<ZoomSessionAttendee> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.zoomSessionAttendee.findUnique({
      where: { id: attendeeId },
    })

    if (!current) {
      throw new Error('ATTENDEE_NOT_FOUND')
    }

    if (current.attended) {
      return current
    }

    const attendee = await tx.zoomSessionAttendee.update({
      where: { id: attendeeId },
      data: { attended: true },
    })

    await activateAbsystemTrialAfterFirstZoom({
      userId: attendee.userId,
      attendedAt,
      tx,
    })

    return attendee
  })
}

export async function completeZoomSession(input: CompleteZoomSessionInput): Promise<ZoomSession> {
  return prisma.$transaction(async (tx) => {
    const session = await tx.zoomSession.findUnique({
      where: { id: input.sessionId },
      select: {
        id: true,
        expertId: true,
        status: true,
        postSessionReport: true,
        attendees: {
          select: { userId: true, attended: true },
        },
      },
    })

    if (!session) {
      throw new Error('SESSION_NOT_FOUND')
    }

    if (session.status === ZoomStatus.CANCELLED) {
      throw new Error('SESSION_CANCELLED')
    }

    assertManualCompletionAuthorized(input, session)

    const completedAt = new Date(normalizeDateIso(input.completedAt) ?? Date.now())
    const actualParticipantUserIds = normalizeUserIds(input.actualParticipantUserIds)
    const persistedAttendeeCount = await persistActualAttendance({
      tx,
      sessionId: input.sessionId,
      actualParticipantUserIds,
      completedAt,
    })
    const attendedCount = session.attendees.filter((attendee) => attendee.attended).length
    const attendeeCount = typeof input.attendeeCount === 'number' && Number.isFinite(input.attendeeCount)
      ? Math.max(0, Math.floor(input.attendeeCount))
      : persistedAttendeeCount ?? attendedCount

    const existingReport = readReport(session.postSessionReport)
    const recordingRef = normalizeString(input.recordingRef)
    const nextReport: Record<string, unknown> = {
      ...existingReport,
      ...readReport(input.reportPatch),
      source: input.source,
      completedAt: completedAt.toISOString(),
      actualAttendeeCount: attendeeCount,
      actualParticipantUserIds,
      actualStartedAt: normalizeDateIso(input.startedAt) ?? existingReport.actualStartedAt ?? null,
      actualEndedAt: normalizeDateIso(input.endedAt) ?? existingReport.actualEndedAt ?? null,
      recordingAvailable: Boolean(recordingRef ?? existingReport.audioUrl),
    }

    const topic = normalizeString(input.topic)
    if (topic) nextReport.topic = topic

    const summary = normalizeString(input.summary)
    if (summary) nextReport.summary = summary

    if (recordingRef) {
      nextReport.audioUrl = recordingRef
    }

    return tx.zoomSession.update({
      where: { id: input.sessionId },
      data: {
        status: ZoomStatus.COMPLETED,
        postSessionReport: nextReport as Prisma.InputJsonObject,
      },
    })
  })
}

export async function savePostSessionReport(
  sessionId: string,
  report: Prisma.InputJsonValue
): Promise<ZoomSession> {
  const reportObject = readReport(report)

  return completeZoomSession({
    sessionId,
    source: 'manual',
    actor: {
      userId: 'legacy-report-owner',
      role: 'SUPERADMIN',
      expertId: null,
    },
    attendeeCount: typeof reportObject.actualAttendeeCount === 'number'
      ? reportObject.actualAttendeeCount
      : undefined,
    topic: normalizeString(reportObject.topic),
    summary: normalizeString(reportObject.summary),
    recordingRef: normalizeString(reportObject.audioUrl),
    startedAt: normalizeString(reportObject.actualStartedAt),
    endedAt: normalizeString(reportObject.actualEndedAt),
    completedAt: normalizeString(reportObject.completedAt),
    reportPatch: reportObject,
  })
}

export async function getSessionAttendees(
  sessionId: string
): Promise<ZoomAttendeeWithUser[]> {
  return prisma.zoomSessionAttendee.findMany({
    where: { sessionId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  })
}
