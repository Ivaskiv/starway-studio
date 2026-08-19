import { Prisma, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { activateAbsystemTrialAfterFirstZoom } from '../../access/service.js'
import type { ZoomAttendeeWithUser, ZoomSession, ZoomSessionAttendee } from '../types.js'

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

export async function savePostSessionReport(
  sessionId: string,
  report: Prisma.InputJsonValue
): Promise<ZoomSession> {
  return prisma.zoomSession.update({
    where: { id: sessionId },
    data: { postSessionReport: report, status: ZoomStatus.COMPLETED },
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
