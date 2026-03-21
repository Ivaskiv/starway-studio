// backend/src/modules/zoom/service.ts
import { prisma } from '../../db/client.js';
import { Prisma, ZoomStatus } from '@starway/db/prisma-client';
import type { ZoomAttendeeWithUser, ZoomSession, ZoomSessionAttendee } from './types.js';

export async function createZoomSession(
  expertId: string,
  scheduledAt: Date,
  topic: string,
  requests: any[] = [],
): Promise<ZoomSession> {
  return prisma.zoomSession.create({
    data: {
      expertId,  // ← прямий expertId (найпростіший і найшвидший спосіб)
      scheduledAt,
      topic,
      requests: requests as Prisma.InputJsonValue,
      status: ZoomStatus.SCHEDULED,
    },
  });
}

export async function getUpcomingZoom(): Promise<ZoomSession | null> {
  return prisma.zoomSession.findFirst({
    where: {
      scheduledAt: { gte: new Date() },
      status: ZoomStatus.SCHEDULED,
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function registerAttendee(
  userId: string,
  sessionId: string,
): Promise<ZoomSessionAttendee> {
  return prisma.zoomSessionAttendee.create({
    data: { userId, sessionId },
  });
}

export async function markAttended(
  attendeeId: string,
): Promise<ZoomSessionAttendee> {
  return prisma.zoomSessionAttendee.update({
    where: { id: attendeeId },
    data: { attended: true },
  });
}

export async function savePostSessionReport(
  sessionId: string,
  report: Prisma.InputJsonValue,
): Promise<ZoomSession> {
  return prisma.zoomSession.update({
    where: { id: sessionId },
    data: { postSessionReport: report, status: ZoomStatus.COMPLETED },
  });
}

export async function getSessionAttendees(
  sessionId: string,
): Promise<ZoomAttendeeWithUser[]> {
  return prisma.zoomSessionAttendee.findMany({
    where: { sessionId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}