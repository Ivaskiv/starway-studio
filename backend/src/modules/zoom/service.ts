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
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
}

export async function getCalendarSessions(args: {
  from: Date;
  to: Date;
  role: 'coach' | 'user';
  userId: string;
  expertId?: string;
}): Promise<(ZoomSession & { _count: { attendees: number }; isMyBooking?: boolean })[]> {
  const { from, to, role, userId, expertId } = args;

  if (role === 'coach') {
    return prisma.zoomSession.findMany({
      where: { expertId, scheduledAt: { gte: from, lte: to } },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  if (!expertId) {
    // Fallback: only sessions the user is attending
    const rows = await prisma.zoomSessionAttendee.findMany({
      where: { userId, session: { scheduledAt: { gte: from, lte: to } } },
      include: { session: { include: { _count: { select: { attendees: true } } } } },
      orderBy: { session: { scheduledAt: 'asc' } },
    });
    return rows.map(r => ({ ...r.session, isMyBooking: true }));
  }

  // Show all expert sessions, flagging which ones the user booked
  const sessions = await prisma.zoomSession.findMany({
    where: { expertId, scheduledAt: { gte: from, lte: to } },
    include: { _count: { select: { attendees: true } } },
    orderBy: { scheduledAt: 'asc' },
  });

  const bookedIds = new Set(
    (await prisma.zoomSessionAttendee.findMany({
      where: { userId, sessionId: { in: sessions.map(s => s.id) } },
      select: { sessionId: true },
    })).map(a => a.sessionId),
  );

  return sessions.map(s => ({ ...s, isMyBooking: bookedIds.has(s.id) }));
}

export async function updateSession(
  sessionId: string,
  patch: { scheduledAt?: Date; topic?: string; requests?: Prisma.InputJsonValue },
): Promise<ZoomSession> {
  return prisma.zoomSession.update({ where: { id: sessionId }, data: patch });
}

export async function cancelSession(sessionId: string): Promise<ZoomSession> {
  return prisma.zoomSession.update({
    where: { id: sessionId },
    data: { status: ZoomStatus.CANCELLED },
  });
}

export async function createFullSession(data: {
  expertId?: string;
  scheduledAt: Date;
  topic: string;
  requests: Prisma.InputJsonValue;
}): Promise<ZoomSession> {
  return prisma.zoomSession.create({ data: { ...data, status: ZoomStatus.SCHEDULED } });
}

export async function getSessionById(id: string): Promise<ZoomSession | null> {
  return prisma.zoomSession.findUnique({ where: { id } });
}

export async function getAllUpcomingSessionsForNotification(before: Date): Promise<ZoomSession[]> {
  return prisma.zoomSession.findMany({
    where: { status: ZoomStatus.SCHEDULED, scheduledAt: { lte: before } },
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function patchSessionRequests(
  sessionId: string,
  requests: Prisma.InputJsonValue,
): Promise<ZoomSession> {
  return prisma.zoomSession.update({ where: { id: sessionId }, data: { requests } });
}

export async function bookSlot(
  sessionId: string,
  userId: string,
): Promise<{ booked: boolean; remainingSlots: number }> {
  const session = await prisma.zoomSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  });

  const meta = (session.requests as Record<string, unknown>) ?? {};
  const maxSlots = typeof meta.maxSlots === 'number' ? meta.maxSlots : 50;
  const deadlineHours = typeof meta.bookingDeadlineHours === 'number' ? meta.bookingDeadlineHours : 24;

  if (session._count.attendees >= maxSlots) throw new Error('slot_full');

  const deadline = new Date(session.scheduledAt.getTime() - deadlineHours * 60 * 60 * 1000);
  if (new Date() >= deadline) throw new Error('deadline_passed');

  await prisma.zoomSessionAttendee.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, attended: false },
    update: {},
  });

  const newCount = await prisma.zoomSessionAttendee.count({ where: { sessionId } });

  if (newCount >= maxSlots) {
    await patchSessionRequests(sessionId, { ...meta, slotStatus: 'booked' } as unknown as Prisma.InputJsonValue);
  }

  return { booked: true, remainingSlots: maxSlots - newCount };
}

export async function unbookSlot(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.zoomSession.findUniqueOrThrow({ where: { id: sessionId } });

  const cutoff = new Date(session.scheduledAt.getTime() - 24 * 60 * 60 * 1000);
  if (new Date() >= cutoff) throw new Error('too_late');

  await prisma.zoomSessionAttendee.deleteMany({ where: { sessionId, userId } });

  const meta = (session.requests as Record<string, unknown>) ?? {};
  await patchSessionRequests(sessionId, { ...meta, slotStatus: 'available' } as unknown as Prisma.InputJsonValue);
}