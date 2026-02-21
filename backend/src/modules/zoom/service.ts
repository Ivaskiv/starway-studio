// backend/src/modules/zoom/srvices.ts
/**
 * Zoom Service
 */

import { prisma } from '@/db/client.js';
import { ZoomSession, ZoomAttendee } from './types.js';

export async function createZoomSession(
  scheduledAt: Date,
  topic: string
): Promise<ZoomSession> {
  const session = await prisma.zoomSession.create({
    data: {
      scheduledAt,
      topic,
      createdAt: new Date()
    }
  });

  return session as unknown as ZoomSession;
}

export async function getUpcomingZoom(): Promise<ZoomSession | null> {
  const now = new Date();
  
  const session = await prisma.zoomSession.findFirst({
    where: {
      scheduledAt: { gte: now }
    },
    orderBy: { scheduledAt: 'asc' }
  });

  return session as unknown as ZoomSession | null;
}

export async function registerAttendee(
  userId: string,
  sessionId: string,
  requestTopic?: string
): Promise<ZoomAttendee> {
  const attendee = await prisma.zoomSessionAttendee.create({
    data: {
      userId,
      sessionId,
      requestTopic,
      createdAt: new Date()
    }
  });

  return attendee as unknown as ZoomAttendee;
}

export async function saveZoomDecision(
  attendeeId: string,
  decision: string
): Promise<ZoomAttendee> {
  const attendee = await prisma.zoomSessionAttendee.update({
    where: { id: attendeeId },
    data: { decisionMade: decision }
  });

  return attendee as unknown as ZoomAttendee;
}

export async function getSessionAttendees(sessionId: string): Promise<ZoomAttendee[]> {
  const attendees = await prisma.zoomSessionAttendee.findMany({
    where: { sessionId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return attendees as unknown as ZoomAttendee[];
}