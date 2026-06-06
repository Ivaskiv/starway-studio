// backend/src/modules/zoom/service.ts
import { prisma } from '../../db/client.js';
import { NotificationType, Prisma, SwapStatus, ZoomSessionType, ZoomSlotStatus, ZoomStatus, ZoomSwapStatus } from '@starway/db/prisma-client';
import type { ZoomAttendeeWithUser, ZoomSession, ZoomSessionAttendee } from './types.js';
import { bot, sendDedupedTelegramMessage, sendOpsTelegramMessage } from '../../lib/telegram.js';
import type { Telegraf } from 'telegraf';
import { NotificationEvent } from '../../services/notifications/NotificationEvent.js';
import { abTestZoomContent } from '@/products/ab-system/content/abTest.zoom.js';
import { buildShortWayForPayCheckoutUrl } from '../subscriptions/payments/wayforpay.checkout.js';
import { buildPaymentRequest } from '../subscriptions/payments/wayforpay.js';
import { parseZoomPostReport } from './zoomPostReport.types.js';

function isGroupPracticeRequest(requests: unknown): boolean {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object') return false;
  return (requests as Record<string, unknown>).type === 'group_practice';
}

function getSafeName(firstName?: string | null): string {
  if (!firstName) return '';
  const trimmed = firstName
    .replace(/[<>{}\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
  if (!trimmed) return ''

  const lowered = trimmed.toLowerCase()
  const blocked = new Set([
    'undefined',
    'null',
    'user',
    'test',
    'admin',
    'bot',
    'учень',
    'coach',
  ])
  if (blocked.has(lowered)) return ''
  if (lowered.startsWith('telegram-guest')) return ''
  if (/^\d+$/.test(trimmed)) return ''
  if (trimmed.length < 2) return ''

  return trimmed
}

const KYIV_TIME_ZONE = 'Europe/Kyiv'

function getKyivNow(now = new Date()): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: KYIV_TIME_ZONE }))
}

function startOfKyivWeek(now = new Date()): Date {
  const date = getKyivNow(now)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfKyivWeek(now = new Date()): Date {
  const date = startOfKyivWeek(now)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

function extractZoomLinkFromRequests(requests: unknown): string {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object') return ''
  const meta = requests as Record<string, unknown>
  return typeof meta.zoomLink === 'string' ? meta.zoomLink : ''
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
  const from = startOfKyivWeek(args.now)
  const to = endOfKyivWeek(args.now)
  const sessions = await getCalendarSessions({
    from,
    to,
    role: args.role,
    userId: args.userId,
    expertId: args.expertId ?? undefined,
  })

  const normalized = sessions.map((session) => {
    const meta = session.requests && typeof session.requests === 'object' && !Array.isArray(session.requests)
      ? session.requests as Record<string, unknown>
      : {}
    const report = parseZoomPostReport(session.postSessionReport)
    const attendeesCount = (session as { _count?: { attendees?: number } })._count?.attendees ?? 0
    const zoomLink = extractZoomLinkFromRequests(session.requests)

    return {
      id: session.id,
      scheduledAt: session.scheduledAt.toISOString(),
      topic: session.topic,
      status: session.status,
      type: (typeof meta.type === 'string' ? meta.type : session.type) as ZoomSessionType,
      zoomLink,
      attendeesCount,
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
    sessions: normalized.sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()),
    audios,
  }
}

export async function getPublicCurrentWeekZoomOverview(now = new Date()): Promise<{
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
  const from = startOfKyivWeek(now)
  const to = endOfKyivWeek(now)
  const sessions = await prisma.zoomSession.findMany({
    where: {
      scheduledAt: { gte: from, lte: to },
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
    const meta = session.requests && typeof session.requests === 'object' && !Array.isArray(session.requests)
      ? session.requests as Record<string, unknown>
      : {}
    const report = parseZoomPostReport(session.postSessionReport)
    const attendeesCount = (session as { _count?: { attendees?: number } })._count?.attendees ?? 0
    const zoomLink = extractZoomLinkFromRequests(session.requests)

    return {
      id: session.id,
      scheduledAt: session.scheduledAt.toISOString(),
      topic: session.topic,
      status: session.status,
      type: (typeof meta.type === 'string' ? meta.type : session.type) as ZoomSessionType,
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

export async function createZoomSession(
  expertId: string,
  scheduledAt: Date,
  topic: string,
  requests: any[] = [],
): Promise<ZoomSession> {
  console.log('[zoom/service createZoomSession] input:', {
    expertId,
    scheduledAt: scheduledAt?.toISOString?.() ?? String(scheduledAt),
    topic,
    type:
      requests && typeof requests === 'object' && !Array.isArray(requests)
        ? (requests as Record<string, unknown>).type ?? null
        : null,
  });
  let session: ZoomSession;
  try {
    session = await prisma.zoomSession.create({
      data: {
        expertId,  // ← прямий expertId (найпростіший і найшвидший спосіб)
        scheduledAt,
        topic,
        requests: requests as Prisma.InputJsonValue,
        status: ZoomStatus.SCHEDULED,
      },
    });
  } catch (err) {
    console.error('[zoom/service createZoomSession] ERROR:', err);
    throw err;
  }
  console.log('[zoom/service createZoomSession] created:', session.id);

  void afterZoomOperation(bot, {
    operation: 'create',
    sessionId: session.id,
    affectedUserIds: [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err));

  if (isGroupPracticeRequest(session.requests)) {
    void notifySubscribersNewSession(bot, session).catch(err => console.error('[zoom] notify failed:', err));
  }

  return session;
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
  const session = await prisma.zoomSession.update({ where: { id: sessionId }, data: patch });
  void afterZoomOperation(bot, {
    operation: 'update',
    sessionId: session.id,
    affectedUserIds: [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err));
  return session;
}

export async function cancelSession(sessionId: string): Promise<ZoomSession> {
  const session = await prisma.zoomSession.update({
    where: { id: sessionId },
    data: { status: ZoomStatus.CANCELLED },
  });

  void afterZoomOperation(bot, {
    operation: 'cancel',
    sessionId: session.id,
    affectedUserIds: [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err));

  return session;
}

export async function createFullSession(data: {
  expertId?: string;
  scheduledAt: Date;
  topic: string;
  requests: Prisma.InputJsonValue;
}, options?: { suppressAutomation?: boolean; suppressSessionNotification?: boolean }): Promise<ZoomSession> {
  console.log('[zoom/service createFullSession] input:', {
    expertId: data.expertId ?? null,
    scheduledAt: data.scheduledAt?.toISOString?.() ?? String(data.scheduledAt),
    topic: data.topic,
    type:
      data.requests && typeof data.requests === 'object' && !Array.isArray(data.requests)
        ? (data.requests as Record<string, unknown>).type ?? null
        : null,
  });
  let session: ZoomSession;
  try {
    session = await prisma.zoomSession.create({ data: { ...data, status: ZoomStatus.SCHEDULED } });
  } catch (err) {
    console.error('[zoom/service createFullSession] ERROR:', err);
    throw err;
  }
  console.log('[zoom/service createFullSession] created:', session.id);
  if (!options?.suppressAutomation) {
    void afterZoomOperation(bot, {
      operation: 'create',
      sessionId: session.id,
      affectedUserIds: [],
    }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err));
  }

  if (isGroupPracticeRequest(session.requests) && !options?.suppressSessionNotification) {
    void notifySubscribersNewSession(bot, session).catch(err => console.error('[zoom] notify failed:', err));
  }
  return session;
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

export async function getUpcomingGroupSessions(limit: number): Promise<ZoomSession[]> {
  return prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gt: new Date() },
      requests: { path: ['type'], equals: 'group_practice' },
    },
    orderBy: { scheduledAt: 'asc' },
    take: Math.max(1, limit),
  });
}

export async function getAvailableSlotsForUser(userId: string): Promise<Array<{
  id: string
  date: string
  hour: number
  bookedCount: number
  isBooked: boolean
}>> {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)

  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gte: now, lt: nextMonday },
      requests: { path: ['type'], equals: 'group_practice' },
    },
    include: {
      _count: { select: { attendees: true } },
      attendees: {
        where: { userId },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return sessions
    .map((session) => {
      const meta = (session.requests as Record<string, unknown>) ?? {}
      const maxSlots = typeof meta.maxSlots === 'number' ? meta.maxSlots : 50
      const deadlineHours = typeof meta.bookingDeadlineHours === 'number'
        ? meta.bookingDeadlineHours
        : 24
      const deadline = new Date(session.scheduledAt.getTime() - deadlineHours * 60 * 60 * 1000)
      const bookedCount = session._count.attendees
      const isBooked = session.attendees.length > 0
      const isOpen = bookedCount < maxSlots && now < deadline

      if (!isOpen) return null

      return {
        id: session.id,
        date: session.scheduledAt.toISOString(),
        hour: session.scheduledAt.getHours(),
        bookedCount,
        isBooked,
      }
    })
    .filter((slot): slot is {
      id: string
      date: string
      hour: number
      bookedCount: number
      isBooked: boolean
    } => Boolean(slot))
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

  void afterZoomOperation(bot, {
    operation: 'book',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err));

  return { booked: true, remainingSlots: maxSlots - newCount };
}

export async function unbookSlot(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.zoomSession.findUniqueOrThrow({ where: { id: sessionId } });

  const cutoff = new Date(session.scheduledAt.getTime() - 24 * 60 * 60 * 1000);
  if (new Date() >= cutoff) throw new Error('too_late');

  await prisma.zoomSessionAttendee.deleteMany({ where: { sessionId, userId } });

  const meta = (session.requests as Record<string, unknown>) ?? {};
  await patchSessionRequests(sessionId, { ...meta, slotStatus: 'available' } as unknown as Prisma.InputJsonValue);

  void afterZoomOperation(bot, {
    operation: 'unbook',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err));
}

async function cancelExistingReminders(userId: string, sessionId: string): Promise<void> {
  await prisma.notificationJob.updateMany({
    where: {
      type: NotificationType.AI_REMINDER,
      status: 'PENDING',
      payload: { path: ['userId'], equals: userId },
      OR: [
        { payload: { path: ['payload', 'sessionId'], equals: sessionId } },
        { payload: { path: ['payload', 'session_id'], equals: sessionId } },
      ],
    },
    data: { status: 'FAILED', lastError: 'cancelled_by_zoom_reschedule' },
  })

  console.log(`[cancelReminders] userId=${userId} sessionId=${sessionId}`)
}

export async function scheduleReminders(
  userId: string,
  session: { id: string; scheduledAt: Date; topic: string; requests: unknown },
): Promise<void> {
  const scheduledAt = new Date(session.scheduledAt)
  const remind24h = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
  const remind2h = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000)
  const now = new Date()
  const req = (!session.requests || Array.isArray(session.requests) || typeof session.requests !== 'object')
    ? {}
    : (session.requests as Record<string, unknown>)

  const jobs: Array<{ flowTimerId: 'ZOOM_REMINDER_24H' | 'ZOOM_REMINDER_2H'; runAt: Date }> = []
  if (remind24h > now) jobs.push({ flowTimerId: 'ZOOM_REMINDER_24H', runAt: remind24h })
  if (remind2h > now) jobs.push({ flowTimerId: 'ZOOM_REMINDER_2H', runAt: remind2h })

  if (jobs.length === 0) {
    console.log('[scheduleReminders] всі часи в минулому, jobs не створено')
    return
  }

  for (const job of jobs) {
    const exists = await prisma.notificationJob.findFirst({
      where: {
        type: NotificationType.AI_REMINDER,
        status: 'PENDING',
        payload: { path: ['userId'], equals: userId },
        AND: [
          { payload: { path: ['payload', 'flow_timer_id'], equals: job.flowTimerId } },
          { payload: { path: ['payload', 'sessionId'], equals: session.id } },
        ],
      },
      select: { id: true },
    })
    if (exists) continue

    await prisma.notificationJob.create({
      data: {
        type: NotificationType.AI_REMINDER,
        runAt: job.runAt,
        status: 'PENDING',
        payload: {
          event: NotificationEvent.AB_TEST_FOLLOWUP,
          userId,
          payload: {
            flow_timer_id: job.flowTimerId,
            sessionId: session.id,
            topic: session.topic,
            scheduledAt: session.scheduledAt.toISOString(),
            zoomLink: typeof req.zoomLink === 'string' ? req.zoomLink : '',
          },
        } as Prisma.InputJsonValue,
      },
    })
  }

  console.log(`[scheduleReminders] userId=${userId} sessionId=${session.id} jobs=${jobs.length}`)
}

export async function rescheduleReminders(
  userId: string,
  session: { id: string; scheduledAt: Date; topic: string; requests: unknown },
): Promise<void> {
  await cancelExistingReminders(userId, session.id)
  await scheduleReminders(userId, session)
}

async function notifyCoach(expertId: string | null | undefined, details: { swapId: string }): Promise<void> {
  if (!expertId) return
  const expertUser = await prisma.user.findFirst({
    where: { expertId },
    select: { telegramChatId: true },
  })
  if (!expertUser?.telegramChatId) return
  await sendDedupedTelegramMessage(expertUser.telegramChatId, `💱 Відбувся обмін слотами. Swap #${details.swapId}`).catch(() => undefined)
}

function isPrismaTableMissingError(err: unknown): err is { code: string } {
  return err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2021'
}

export async function getAvailablePrivateSlots(expertId: string, from: Date, to: Date) {
  const sessions = await prisma.zoomSession.findMany({
    where: {
      expertId,
      type: ZoomSessionType.PRIVATE,
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gte: from, lte: to },
    },
    include: { _count: { select: { attendees: true } } },
    orderBy: { scheduledAt: 'asc' },
  })

  return sessions
    .map((session) => ({ session, remaining: session.capacity - session._count.attendees }))
    .filter((row) => row.remaining > 0)
}

export async function bookPrivateSlot(userId: string, sessionId: string) {
  const session = await prisma.zoomSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })
  if (!session) throw new Error('session_not_found')
  if (session.type !== ZoomSessionType.PRIVATE) throw new Error('not_private_session')

  const exists = await prisma.zoomSessionAttendee.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    select: { id: true },
  })
  if (exists) throw new Error('already_booked')
  if (session._count.attendees >= session.capacity) throw new Error('slot_full')

  await prisma.zoomSessionAttendee.create({
    data: { sessionId, userId, attended: false },
  })

  void afterZoomOperation(bot, {
    operation: 'book',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err));

  return { success: true, session }
}

export async function cancelPrivateBooking(userId: string, sessionId: string) {
  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    include: { session: { select: { scheduledAt: true } } },
  })
  if (!attendee) throw new Error('booking_not_found')

  const minCancellationAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  if (attendee.session.scheduledAt <= minCancellationAt) throw new Error('too_late_to_cancel')

  await prisma.zoomSessionAttendee.delete({
    where: { sessionId_userId: { sessionId, userId } },
  })

  void afterZoomOperation(bot, {
    operation: 'unbook',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err));

  return { success: true }
}

export async function createSwapRequest(
  requesterId: string,
  sessionIdFrom: string,
  targetUserIds?: string[],
) {
  try {
    const sessionFrom = await prisma.zoomSession.findUnique({ where: { id: sessionIdFrom } })
    if (!sessionFrom) throw new Error('session_not_found')
    if (sessionFrom.type !== ZoomSessionType.PRIVATE) throw new Error('not_private_session')

    const requesterAttendee = await prisma.zoomSessionAttendee.findUnique({
      where: { sessionId_userId: { sessionId: sessionIdFrom, userId: requesterId } },
      select: { id: true },
    })
    if (!requesterAttendee) throw new Error('requester_not_attendee')

    const swap = await prisma.zoomSlotSwapRequest.create({
      data: {
        requesterId,
        sessionIdFrom,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: SwapStatus.PENDING,
      },
    })

    let targets = targetUserIds?.filter(Boolean) ?? []
    if (targets.length === 0) {
      const dayStart = new Date(sessionFrom.scheduledAt)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(sessionFrom.scheduledAt)
      dayEnd.setHours(23, 59, 59, 999)
      const sameDayPrivate = await prisma.zoomSession.findMany({
        where: {
          expertId: sessionFrom.expertId,
          type: ZoomSessionType.PRIVATE,
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
        select: { id: true },
      })
      const attendees = await prisma.zoomSessionAttendee.findMany({
        where: {
          sessionId: { in: sameDayPrivate.map((s) => s.id) },
          userId: { not: requesterId },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      targets = attendees.map((a) => a.userId)
    }

    if (targets.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: targets } },
        select: { telegramChatId: true },
      })
      await Promise.all(
        users
          .map((user) => user.telegramChatId)
          .filter((chatId): chatId is string => Boolean(chatId))
          .map((chatId) => sendDedupedTelegramMessage(chatId, `💱 Новий запит на обмін слотом. ID: ${swap.id}`).catch(() => undefined)),
      )
    }

    return { swapId: swap.id }
  } catch (err: unknown) {
    if (isPrismaTableMissingError(err)) {
      console.warn('[zoom/service] ZoomSlotSwapRequest table not found — run prisma migrate deploy to apply migration. Skipping createSwapRequest.')
      throw new Error('swap_storage_unavailable')
    }
    throw err
  }
}

export async function acceptSwapRequest(swapId: string, acceptorId: string, sessionIdTo: string) {
  try {
    const swap = await prisma.zoomSlotSwapRequest.findUnique({
      where: { id: swapId },
      include: { sessionFrom: true },
    })
    if (!swap) throw new Error('swap_not_found')
    const sessionIdFrom = swap.sessionIdFrom
    if (!sessionIdFrom) throw new Error('swap_session_missing')
    if (swap.status !== SwapStatus.PENDING) throw new Error('swap_not_pending')
    if (swap.expiresAt <= new Date()) throw new Error('swap_expired')

    const acceptorAttendee = await prisma.zoomSessionAttendee.findUnique({
      where: { sessionId_userId: { sessionId: sessionIdTo, userId: acceptorId } },
      select: { id: true },
    })
    if (!acceptorAttendee) throw new Error('acceptor_not_attendee')

    await prisma.$transaction(async (tx) => {
      await tx.zoomSessionAttendee.update({
        where: { sessionId_userId: { sessionId: sessionIdFrom, userId: swap.requesterId } },
        data: { userId: acceptorId },
      })
      await tx.zoomSessionAttendee.update({
        where: { sessionId_userId: { sessionId: sessionIdTo, userId: acceptorId } },
        data: { userId: swap.requesterId },
      })
      await tx.zoomSlotSwapRequest.update({
        where: { id: swapId },
        data: {
          status: SwapStatus.ACCEPTED,
          targetUserId: acceptorId,
          sessionIdTo,
          resolvedAt: new Date(),
        },
      })
    })

    await notifyCoach(swap.sessionFrom?.expertId ?? null, { swapId })

    void afterZoomOperation(bot, {
      operation: 'swap_accept',
      sessionId: sessionIdFrom,
      affectedUserIds: [swap.requesterId, acceptorId],
    }).catch((error) => console.error('[zoom] afterZoomOperation failed:', error))

    void afterZoomOperation(bot, {
      operation: 'swap_accept',
      sessionId: sessionIdTo,
      affectedUserIds: [acceptorId, swap.requesterId],
    }).catch((error) => console.error('[zoom] afterZoomOperation failed:', error))

    return {
      success: true,
      newSessionA: sessionIdTo,
      newSessionB: sessionIdFrom,
    }
  } catch (err: unknown) {
    if (isPrismaTableMissingError(err)) {
      console.warn('[zoom/service] ZoomSlotSwapRequest table not found — run prisma migrate deploy to apply migration. Skipping acceptSwapRequest.')
      throw new Error('swap_storage_unavailable')
    }
    throw err
  }
}

export async function declineSwapRequest(swapId: string, _declinerId: string) {
  try {
    const swap = await prisma.zoomSlotSwapRequest.update({
      where: { id: swapId },
      data: { status: SwapStatus.DECLINED, resolvedAt: new Date() },
    })
    const requester = await prisma.user.findUnique({
      where: { id: swap.requesterId },
      select: { telegramChatId: true },
    })
    if (requester?.telegramChatId) {
      await sendDedupedTelegramMessage(requester.telegramChatId, 'Обмін відхилено').catch(() => undefined)
    }

    if (swap.sessionIdFrom) {
      void afterZoomOperation(bot, {
        operation: 'swap_decline',
        sessionId: swap.sessionIdFrom,
        affectedUserIds: [swap.requesterId],
      }).catch((error) => console.error('[zoom] afterZoomOperation failed:', error))
    }

    return { success: true }
  } catch (err: unknown) {
    if (isPrismaTableMissingError(err)) {
      console.warn('[zoom/service] ZoomSlotSwapRequest table not found — run prisma migrate deploy to apply migration. Skipping declineSwapRequest.')
      throw new Error('swap_storage_unavailable')
    }
    throw err
  }
}

function startOfWeekMonday(inputDate: Date): Date {
  const date = new Date(inputDate)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeekSunday(inputDate: Date): Date {
  const start = startOfWeekMonday(inputDate)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export async function getCoachWeekSlots(coachId: string, anchorDate = new Date()) {
  const from = startOfWeekMonday(anchorDate)
  const to = endOfWeekSunday(anchorDate)
  return prisma.zoomSlot.findMany({
    where: {
      coachId,
      date: { gte: from, lte: to },
    },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  })
}

export async function toggleCoachSlotStatus(input: {
  slotId: string
  coachId: string
  status: ZoomSlotStatus
}) {
  return prisma.zoomSlot.update({
    where: { id: input.slotId },
    data: { status: input.status },
    select: { id: true, status: true, date: true, hour: true },
  })
}

export async function initiateZoomSwap(initiatorId: string, targetSlotId: string) {
  const user = await prisma.user.findUnique({
    where: { id: initiatorId },
    select: { id: true, swapsUsedThisMonth: true },
  })
  if (!user) throw new Error('user_not_found')
  if (user.swapsUsedThisMonth >= 1) throw new Error('swap_limit_reached')

  const targetSlot = await prisma.zoomSlot.findUnique({
    where: { id: targetSlotId },
    select: { id: true, coachId: true, status: true },
  })
  if (!targetSlot) throw new Error('target_slot_not_found')
  if (targetSlot.status !== ZoomSlotStatus.OPEN) throw new Error('target_slot_closed')

  const duplicateSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const duplicate = await prisma.zoomSlotSwapRequest.findFirst({
    where: {
      requesterId: initiatorId,
      targetSlotId,
      createdAt: { gte: duplicateSince },
      paymentStatus: { in: [ZoomSwapStatus.PENDING_PAYMENT, ZoomSwapStatus.CONFIRMED] },
    },
    select: { id: true },
  })
  if (duplicate) throw new Error('duplicate_pair_30d')

  const month = new Date().toISOString().slice(0, 7)
  const swap = await prisma.zoomSlotSwapRequest.create({
    data: {
      requesterId: initiatorId,
      targetSlotId,
      fee: 75,
      month,
      paymentStatus: ZoomSwapStatus.PENDING_PAYMENT,
      status: SwapStatus.PENDING,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    select: { id: true, fee: true },
  })
  const orderReference = `zoom_swap_${swap.id}_${Date.now()}`
  const payment = buildPaymentRequest({
    userId: initiatorId,
    productId: 'zoom_swap',
    amount: swap.fee,
    currency: 'UAH',
    payRef: orderReference,
    product_name: ['Zoom Swap Fee'],
    product_count: [1],
    product_price: [swap.fee],
  })
  const backendBaseUrl = (
    process.env.PUBLIC_API_URL?.trim()
    || process.env.APP_URL?.trim()
    || process.env.TELEGRAM_WEBHOOK_URL?.trim()
    || process.env.INTERNAL_API_URL?.trim()?.replace(/\/api$/, '')
    || (process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : 'http://127.0.0.1:3001')
  ).replace(/\/$/, '')
  const checkoutUrl = await buildShortWayForPayCheckoutUrl(backendBaseUrl, payment, {
    product: 'zoom_swap',
    swapId: swap.id,
  })

  await prisma.zoomSlotSwapRequest.update({
    where: { id: swap.id },
    data: { orderRef: orderReference },
  })

  return {
    swapId: swap.id,
    fee: swap.fee,
    checkoutUrl,
    message: abTestZoomContent.swap.created,
  }
}

export async function confirmZoomSwapPaymentByOrderRef(orderRef: string) {
  const swap = await prisma.zoomSlotSwapRequest.findFirst({
    where: { orderRef },
    select: { id: true, requesterId: true, paymentStatus: true },
  })
  if (!swap || swap.paymentStatus === ZoomSwapStatus.CONFIRMED) {
    return { updated: false }
  }

  await prisma.$transaction(async (tx) => {
    await tx.zoomSlotSwapRequest.update({
      where: { id: swap.id },
      data: { paymentStatus: ZoomSwapStatus.CONFIRMED, paidAt: new Date() },
    })
    await tx.user.update({
      where: { id: swap.requesterId },
      data: { swapsUsedThisMonth: { increment: 1 } },
    })
  })

  return { updated: true, swapId: swap.id }
}

export async function resetMonthlySwapUsage() {
  const result = await prisma.user.updateMany({
    where: { swapsUsedThisMonth: { gt: 0 } },
    data: { swapsUsedThisMonth: 0 },
  })
  return { resetUsers: result.count }
}

export async function expireStaleSwapRequests() {
  try {
    const stale = await prisma.zoomSlotSwapRequest.findMany({
      where: { status: SwapStatus.PENDING, expiresAt: { lt: new Date() } },
      select: { id: true, requesterId: true },
    })
    if (stale.length === 0) return { expiredCount: 0, expired: [] as Array<{ id: string; requesterId: string }> }

    await prisma.zoomSlotSwapRequest.updateMany({
      where: { id: { in: stale.map((item) => item.id) } },
      data: { status: SwapStatus.EXPIRED, resolvedAt: new Date() },
    })
    return { expiredCount: stale.length, expired: stale }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code: string }).code === 'P2021'
    ) {
      console.warn(
        '[zoom/service] ZoomSlotSwapRequest table not found — '
        + 'run prisma migrate deploy to apply migration. Skipping.',
      )
      return { expiredCount: 0, expired: [] as Array<{ id: string; requesterId: string }> }
    }
    throw err
  }
}

export async function formatChannelPost(): Promise<string> {
  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gt: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 6,
  });

  const lines = sessions
    .filter((session) => isGroupPracticeRequest(session.requests))
    .map((session) => {
      const dt = new Date(session.scheduledAt);
      const dateStr = dt.toLocaleString('uk-UA', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dateStr} — ${session.topic}`;
    });

  if (lines.length === 0) {
    return (
      'Zoom-практики ФОКУС\n\n'
      + 'Розклад наступних сесій буде опубліковано найближчим часом.'
    );
  }

  return (
    'Zoom-практики ФОКУС — розклад\n\n'
    + lines.join('\n') + '\n\n'
    + 'Посилання на підключення надходить автоматично за 2 год до початку кожної практики.'
  );
}

export async function syncChannelPost(telegramBot: Telegraf): Promise<void> {
  const channelId = process.env.FOCUS_TELEGRAM_CHANNEL_ID?.trim();
  console.log('[syncChannelPost] channelId:', channelId ?? null);
  if (!channelId) {
    console.warn('[syncChannelPost] FOCUS_TELEGRAM_CHANNEL_ID не задано');
    return;
  }

  const text = await formatChannelPost();
  console.log('[syncChannelPost] text length:', text.length);
  const webAppBaseUrl = process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? '';
  const zoomUrl = webAppBaseUrl ? `${webAppBaseUrl.replace(/\/$/, '')}/zoom` : null;
  const replyMarkup = zoomUrl
    ? {
        inline_keyboard: [[{ text: 'Повний календар', web_app: { url: zoomUrl } }]],
      }
    : undefined;

  const existing = await prisma.zoomChannelPost.findFirst();
  console.log('[syncChannelPost] existing:', existing?.messageId ?? null);
  console.log('[syncChannelPost] start', {
    channelId,
    existing: existing?.messageId ?? null,
  });
  if (existing) {
    try {
      await telegramBot.telegram.editMessageText(
        channelId,
        existing.messageId,
        undefined,
        text,
        { reply_markup: replyMarkup },
      );
      console.log('[syncChannelPost] done', { messageId: existing.messageId, mode: 'edit' });
      return;
    } catch (err) {
      console.error('[syncChannelPost] ERROR edit:', err);
      await prisma.zoomChannelPost.delete({ where: { id: existing.id } }).catch(() => undefined);
    }
  }

  try {
    const sent = await telegramBot.telegram.sendMessage(channelId, text, { reply_markup: replyMarkup });
    console.log('[syncChannelPost] sent:', sent.message_id);
    await telegramBot.telegram.pinChatMessage(channelId, sent.message_id).catch(() => undefined);
    await prisma.zoomChannelPost.create({
      data: {
        messageId: sent.message_id,
        chatId: channelId,
      },
    });
    console.log('[syncChannelPost] pinned and saved');
    console.log('[syncChannelPost] done', { messageId: sent.message_id, mode: 'create' });
  } catch (err) {
    console.error('[syncChannelPost] ERROR create:', err);
  }
}

export async function notifySubscribersNewSession(
  telegramBot: Telegraf,
  session: ZoomSession,
): Promise<void> {
  const webAppBaseUrl = process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? '';
  const publicFrontend = process.env.PUBLIC_FRONTEND_URL?.trim() ?? '';
  const zoomUrl = webAppBaseUrl
    ? `${webAppBaseUrl.replace(/\/$/, '')}/zoom`
    : `${publicFrontend.replace(/\/$/, '')}/zoom`;
  const inviteUrl = process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ?? '';

  const paidUsers = await prisma.user.findMany({
    where: {
      productSubscriptions: {
        some: { status: 'ACTIVE' },
      },
      deletedAt: null,
    },
    select: {
      firstName: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  });

  const dt = new Date(session.scheduledAt);
  const dateStr = dt.toLocaleString('uk-UA', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  for (const user of paidUsers) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null;
    if (!tgId) continue;

    const safeName = getSafeName(user.firstName);
    const greeting = safeName ? `${safeName}, ` : '';
    const text =
      `${greeting}опубліковано нову Zoom-практику.\n\n`
      + `${dateStr}\n`
      + `${session.topic}\n\n`
      + 'Посилання на підключення надійде за 2 год до початку.';

    const calendarButton = webAppBaseUrl
      ? { text: 'Переглянути календар', web_app: { url: zoomUrl } }
      : { text: 'Переглянути календар', url: zoomUrl };
    const secondRow = inviteUrl ? [{ text: 'УВІЙТИ У ФОКУС', url: inviteUrl }] : [];

    try {
      await telegramBot.telegram.sendMessage(tgId, text, {
        reply_markup: {
          inline_keyboard: [
            [calendarButton],
            ...(secondRow.length > 0 ? [secondRow] : []),
          ],
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      console.warn(`[notify paid] failed ${tgId}:`, err);
    }
  }

  const unpaidLeads = await prisma.user.findMany({
    where: {
      testResultType: { not: null },
      productSubscriptions: {
        none: { status: 'ACTIVE' },
      },
      deletedAt: null,
    },
    select: {
      firstName: true,
      testResultType: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  });

  const RESULT_LABEL: Record<string, string> = {
    STATE: 'СТАН',
    GOAL: 'ЦІЛЬ',
    CHOICE: 'ВИБІР',
    DECISION: 'РІШЕННЯ',
    ACTION: 'ДІЯ',
  };

  for (const user of unpaidLeads) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null;
    if (!tgId) continue;
    const name = getSafeName(user.firstName);
    const greeting = name ? `${name}, ` : '';
    const focus = RESULT_LABEL[user.testResultType ?? ''] ?? 'поточний запит';
    const leadText =
      `${greeting}відбудеться Zoom-практика ФОКУС.\n\n`
      + `${dateStr}\n${session.topic}\n\n`
      + `Діагностика зафіксувала пріоритетну точку: ${focus}.\n`
      + 'Саме цей патерн розбирається на живих практиках ФОКУС.\n\n'
      + 'Для участі необхідно активувати доступ.';
    try {
      await telegramBot.telegram.sendMessage(tgId, leadText, {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Активувати доступ до ФОКУС', callback_data: 'open_focus_payment' },
          ]],
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      console.warn(`[notify lead] failed ${tgId}:`, err);
    }
  }
}

type ZoomOperation =
  | 'create'
  | 'update'
  | 'cancel'
  | 'book'
  | 'unbook'
  | 'swap_accept'
  | 'swap_decline'

type ScheduleEventType = 'UPDATE' | 'CANCEL' | 'SWAP' | 'PAID_BOOKING' | 'CREATE'

interface ScheduleEventPayload {
  eventType: ScheduleEventType
  sessionId?: string
  sessionTitle?: string
  affectedUserIds: string[]
  coachMetadata: Record<string, unknown>
}

async function getSessionAttendeeUserIds(sessionId: string): Promise<string[]> {
  const rows = await prisma.zoomSessionAttendee.findMany({
    where: { sessionId },
    select: { userId: true },
  })
  return rows.map((row) => row.userId)
}

async function getActiveSubscriberIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { productSubscriptions: { some: { status: 'ACTIVE' } }, deletedAt: null },
    select: { id: true },
  })
  return rows.map((row) => row.id)
}

export async function notifyAffectedUsers(
  telegramBot: Telegraf,
  operation: ZoomOperation,
  session: ZoomSession,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, deletedAt: null },
    select: {
      firstName: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const dt = new Date(session.scheduledAt)
  const dateStr = dt.toLocaleString('uk-UA', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  const messageByOperation: Record<ZoomOperation, (greeting: string) => string> = {
    create: (greeting) =>
      `${greeting}заплановано нову Zoom-сесію.\n\n${dateStr}\n${session.topic}`,
    update: (greeting) =>
      `${greeting}розклад Zoom-сесії оновлено.\n\n${dateStr}\n${session.topic}\n\nНагадування перераховано.`,
    cancel: (greeting) =>
      `${greeting}Zoom-сесію скасовано.\n\n${dateStr}\n${session.topic}`,
    book: (greeting) =>
      `${greeting}запис підтверджено.\n\n${dateStr}\n${session.topic}\n\nНагадування заплановано.`,
    unbook: (greeting) =>
      `${greeting}запис скасовано.\n\n${dateStr}\n${session.topic}`,
    swap_accept: (greeting) =>
      `${greeting}обмін слотом підтверджено.\n\nНовий час: ${dateStr}\n${session.topic}\n\nНагадування оновлено.`,
    swap_decline: (greeting) =>
      `${greeting}запит на обмін відхилено.\n\nРозклад залишається без змін.`,
  }

  const webAppBaseUrl = process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? ''
  const zoomUrl = webAppBaseUrl ? `${webAppBaseUrl.replace(/\/$/, '')}/zoom` : null
  const calendarButton = zoomUrl
    ? { text: 'Переглянути календар', web_app: { url: zoomUrl } }
    : null

  for (const user of users) {
    const chatId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!chatId) continue
    const name = getSafeName(user.firstName)
    const greeting = name ? `${name}, ` : ''
    const text = messageByOperation[operation](greeting)

    try {
      await telegramBot.telegram.sendMessage(chatId, text, {
        reply_markup: calendarButton
          ? { inline_keyboard: [[calendarButton]] }
          : undefined,
      })
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notifyAffected] failed ${chatId}:`, err)
    }
  }
}

function operationToEventType(operation: ZoomOperation): ScheduleEventType {
  const map: Record<ZoomOperation, ScheduleEventType> = {
    create: 'CREATE',
    update: 'UPDATE',
    cancel: 'CANCEL',
    book: 'PAID_BOOKING',
    unbook: 'CANCEL',
    swap_accept: 'SWAP',
    swap_decline: 'SWAP',
  }
  return map[operation] ?? 'UPDATE'
}

export async function processScheduleNotification(
  telegramBot: Telegraf,
  payload: ScheduleEventPayload,
): Promise<void> {
  const { eventType, affectedUserIds, sessionTitle, coachMetadata } = payload
  const webAppBaseUrl = process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? ''
  const publicFrontend = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
  const baseUrl = webAppBaseUrl || publicFrontend
  const zoomUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/zoom` : null
  const bookingUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/zoom/booking` : null

  if (affectedUserIds.length > 0 && eventType !== 'SWAP') {
    const users = await prisma.user.findMany({
      where: { id: { in: affectedUserIds }, deletedAt: null },
      select: {
        firstName: true,
        telegramChatId: true,
        telegramLinks: {
          where: { isActive: true, chatId: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { chatId: true },
        },
      },
    })

    for (const user of users) {
      const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
      if (!tgId) continue

      const safeName = getSafeName(user.firstName)
      const greeting = safeName ? `${safeName}, ` : ''

      let text = ''
      let buttons: Array<Array<{ text: string; [key: string]: unknown }>> = []

      const zoomBtn = zoomUrl
        ? (webAppBaseUrl
          ? { text: 'Відкрити календар зустрічей', web_app: { url: zoomUrl } }
          : { text: 'Відкрити календар зустрічей', url: zoomUrl })
        : null
      const bookBtn = bookingUrl
        ? (webAppBaseUrl
          ? { text: 'Забронювати новий слот', web_app: { url: bookingUrl } }
          : { text: 'Забронювати новий слот', url: bookingUrl })
        : null

      if (eventType === 'UPDATE') {
        text =
          `${greeting}оновлено графік запланованих сесій.\n\n`
          + `Назва зустрічі: ${sessionTitle ?? 'Zoom-практика'}\n`
          + `Новий час: ${String(coachMetadata.newDateTimeFormatted ?? 'оновлено')}\n\n`
          + 'Зміни автоматично внесено у персональний додаток.'
        if (zoomBtn) buttons = [[zoomBtn]]
      } else if (eventType === 'CANCEL') {
        text =
          `${greeting}індивідуальну консультацію (${String(coachMetadata.oldDateTimeFormatted ?? '—')}) скасовано.\n\n`
          + 'Для вибору нового вікна скористайтеся сервісом бронювання.'
        if (bookBtn) buttons = [[bookBtn]]
      } else if (eventType === 'PAID_BOOKING') {
        text =
          `${greeting}запис на консультацію підтверджено.\n\n`
          + `Назва зустрічі: ${sessionTitle ?? 'Zoom-консультація'}\n`
          + `Час: ${String(coachMetadata.bookedDateTimeFormatted ?? '—')}`
        if (zoomBtn) buttons = [[zoomBtn]]
      }

      if (!text) continue

      try {
        await telegramBot.telegram.sendMessage(tgId, text, {
          reply_markup: buttons.length > 0 ? ({ inline_keyboard: buttons } as any) : undefined,
        })
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (err) {
        console.warn(`[processScheduleNotification:${eventType}] ${tgId}:`, err)
      }
    }
  }

  if (eventType === 'SWAP') {
    const user1Id = String(coachMetadata.user1Id ?? '')
    const user2Id = String(coachMetadata.user2Id ?? '')
    const swapUsers = [
      { userId: user1Id, newTime: String(coachMetadata.newTime1 ?? 'оновлено') },
      { userId: user2Id, newTime: String(coachMetadata.newTime2 ?? 'оновлено') },
    ].filter((item) => item.userId)

    for (const swapUser of swapUsers) {
      const user = await prisma.user.findUnique({
        where: { id: swapUser.userId },
        select: {
          firstName: true,
          telegramChatId: true,
          telegramLinks: {
            where: { isActive: true, chatId: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { chatId: true },
          },
        },
      })
      const tgId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
      if (!tgId) continue
      const safeName = getSafeName(user?.firstName)
      const greeting = safeName ? `${safeName}, ` : ''
      const zoomBtn = zoomUrl
        ? (webAppBaseUrl
          ? { text: 'Переглянути оновлений розклад', web_app: { url: zoomUrl } }
          : { text: 'Переглянути оновлений розклад', url: zoomUrl })
        : null
      try {
        await telegramBot.telegram.sendMessage(
          tgId,
          `${greeting}обмін слотом підтверджено.\n\nНовий час консультації: ${swapUser.newTime}\n\nРозклад оновлено автоматично.`,
          {
            reply_markup: zoomBtn ? { inline_keyboard: [[zoomBtn]] } : undefined,
          },
        )
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (err) {
        console.warn(`[processScheduleNotification:SWAP] ${tgId}:`, err)
      }
    }
  }

  let report = 'ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n'
  if (eventType === 'CREATE') {
    report += `Тип події: Нова сесія\nНазва: ${sessionTitle ?? 'Zoom-сесія'}\nЧас: ${String(coachMetadata.newDateTimeFormatted ?? '—')}\nЗареєстровано учасників: ${String(coachMetadata.attendeesCount ?? 0)}`
  } else if (eventType === 'UPDATE') {
    report += `Тип події: Оновлення параметрів сесії\nНазва: ${sessionTitle ?? 'Zoom-сесія'}\nНовий час: ${String(coachMetadata.newDateTimeFormatted ?? '—')}\nПричетних учасників сповіщено: ${affectedUserIds.length}`
  } else if (eventType === 'CANCEL') {
    report += `Тип події: Скасування\nУчасник: ${String(coachMetadata.userName ?? 'Учасник')} (id: ${String(coachMetadata.userId ?? '—')})\nПопередня дата: ${String(coachMetadata.oldDateTimeFormatted ?? '—')}\nСлот звільнено для бронювання.`
  } else if (eventType === 'SWAP') {
    report += `Тип події: Обмін слотами\nУчасники: ${String(coachMetadata.user1Name ?? 'Учасник 1')} ↔ ${String(coachMetadata.user2Name ?? 'Учасник 2')}\n\n${String(coachMetadata.user1Name ?? 'Учасник 1')}: ${String(coachMetadata.newTime1 ?? '—')}\n${String(coachMetadata.user2Name ?? 'Учасник 2')}: ${String(coachMetadata.newTime2 ?? '—')}`
  } else if (eventType === 'PAID_BOOKING') {
    report += `Тип події: Запис на індивідуальну консультацію\nУчасник: ${String(coachMetadata.userName ?? 'Учасник')} (id: ${String(coachMetadata.userId ?? '—')})\nДата та час: ${String(coachMetadata.bookedDateTimeFormatted ?? '—')}\nСтатус оплати: PAID via WayForPay\nАналітичний фокус: ${String(coachMetadata.resultKey ?? '—').toUpperCase()}\nЗапит учасника: ${String(coachMetadata.userTargetDescription ?? '—')}`
  }

  const panelBase = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
  const panelUrl = panelBase ? `${panelBase.replace(/\/$/, '')}/app/dashboard/zoom` : null

  void sendOpsTelegramMessage(
    report,
    panelUrl
      ? { reply_markup: { inline_keyboard: [[{ text: 'Панель керування розкладом', url: panelUrl }]] } }
      : undefined,
  ).catch((err) => console.error('[coach feed]', err))
}

export async function afterZoomOperation(
  telegramBot: Telegraf,
  params: {
    operation: ZoomOperation
    sessionId: string
    affectedUserIds: string[]
    coachNotify?: boolean
  },
): Promise<void> {
  const { operation, sessionId } = params

  const session = await prisma.zoomSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })
  if (!session) return

  const isGroup = isGroupPracticeRequest(session.requests)

  if (isGroup) {
    void syncChannelPost(telegramBot).catch((err) =>
      console.error('[afterZoomOp] syncChannelPost:', err),
    )
  }

  const affectedUserIds = params.affectedUserIds.length > 0
    ? params.affectedUserIds
    : await getSessionAttendeeUserIds(sessionId)

  const shouldNotifyAffected = !(operation === 'create' && isGroup)

  if (shouldNotifyAffected && affectedUserIds.length > 0) {
    void notifyAffectedUsers(telegramBot, operation, session, affectedUserIds).catch((err) =>
      console.error('[afterZoomOp] notifyAffectedUsers:', err),
    )
  }

  const formatted = new Date(session.scheduledAt).toLocaleString('uk-UA', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  const eventType = operationToEventType(operation)
  const coachMetadata: Record<string, unknown> = {
    newDateTimeFormatted: formatted,
    oldDateTimeFormatted: formatted,
    userId: affectedUserIds[0] ?? '',
    userName: 'Учасник',
    bookedDateTimeFormatted: formatted,
    resultKey: '',
    userTargetDescription: '—',
    attendeesCount: session._count.attendees,
  }
  if (operation === 'swap_accept') {
    coachMetadata.user1Id = affectedUserIds[0] ?? ''
    coachMetadata.user2Id = affectedUserIds[1] ?? ''
    coachMetadata.user1Name = 'Учасник 1'
    coachMetadata.user2Name = 'Учасник 2'
    coachMetadata.newTime1 = formatted
    coachMetadata.newTime2 = formatted
  }
  void processScheduleNotification(telegramBot, {
    eventType,
    sessionId,
    sessionTitle: session.topic,
    affectedUserIds,
    coachMetadata,
  }).catch((err) => console.error('[afterZoomOp] processScheduleNotification:', err))

  if (operation === 'update' || operation === 'swap_accept') {
    for (const userId of affectedUserIds) {
      void rescheduleReminders(userId, session).catch((err) =>
        console.error('[afterZoomOp] rescheduleReminders:', err),
      )
    }
  }

  if (operation === 'cancel' || operation === 'unbook') {
    for (const userId of affectedUserIds) {
      void cancelExistingReminders(userId, sessionId).catch((err) =>
        console.error('[afterZoomOp] cancelExistingReminders:', err),
      )
    }
  }

  if (params.coachNotify) {
    void notifyCoach(session.expertId, { swapId: `${operation}:${sessionId}` }).catch((err) =>
      console.error('[afterZoomOp] notifyCoach:', err),
    )
  }
}

export async function notifyMonthSchedule(
  telegramBot: Telegraf,
  sessions: ZoomSession[],
): Promise<void> {
  if (sessions.length === 0) return

  const upcomingGroupSessions = sessions
    .filter((session) => isGroupPracticeRequest(session.requests))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())

  if (upcomingGroupSessions.length === 0) return

  const webAppBaseUrl = process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? ''
  const publicFrontend = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
  const focusInviteUrl = process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ?? ''
  const zoomUrl = webAppBaseUrl
    ? `${webAppBaseUrl.replace(/\/$/, '')}/zoom`
    : `${publicFrontend.replace(/\/$/, '')}/zoom`

  const scheduleLines = upcomingGroupSessions.map((session) => {
    const dt = new Date(session.scheduledAt)
    return dt.toLocaleString('uk-UA', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }) + ` — ${session.topic}`
  }).join('\n')

  const firstDt = new Date(upcomingGroupSessions[0].scheduledAt)
  const monthLabel = firstDt.toLocaleString('uk-UA', { month: 'long', year: 'numeric' })

  const paidUsers = await prisma.user.findMany({
    where: {
      productSubscriptions: { some: { status: 'ACTIVE' } },
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const paidText =
    `Розклад Zoom-практик ФОКУС — ${monthLabel}\n\n`
    + `${scheduleLines}\n\n`
    + 'Посилання на підключення надходить автоматично за 2 год до початку кожної практики.'

  const calBtn = webAppBaseUrl
    ? { text: 'Переглянути календар', web_app: { url: zoomUrl } }
    : { text: 'Переглянути календар', url: zoomUrl }

  for (const user of paidUsers) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue
    const name = getSafeName(user.firstName)
    const greeting = name ? `${name}, ` : ''
    const secondRow = focusInviteUrl ? [{ text: 'УВІЙТИ У ФОКУС', url: focusInviteUrl }] : []
    try {
      await telegramBot.telegram.sendMessage(tgId, `${greeting}${paidText}`, {
        reply_markup: {
          inline_keyboard: [
            [calBtn],
            ...(secondRow.length > 0 ? [secondRow] : []),
          ],
        },
      })
      for (const session of upcomingGroupSessions) {
        await scheduleReminders(user.id, session)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notifyMonth paid] ${tgId}:`, err)
    }
  }

  const leads = await prisma.user.findMany({
    where: {
      testResultType: { not: null },
      productSubscriptions: { none: { status: 'ACTIVE' } },
      deletedAt: null,
    },
    select: {
      firstName: true,
      testResultType: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const resultContext: Record<string, string> = {
    STATE: 'Діагностика зафіксувала точку: СТАН. На практиках ФОКУС розбираємо саме цей патерн.',
    GOAL: 'Діагностика зафіксувала точку: ЦІЛЬ. На практиках ФОКУС переводимо запит у конкретний крок.',
    CHOICE: 'Діагностика зафіксувала точку: ВИБІР. На практиках ФОКУС працюємо з блоком вибору.',
    DECISION: 'Діагностика зафіксувала точку: РІШЕННЯ. На практиках ФОКУС доводимо до фіксації і дії.',
    ACTION: 'Діагностика зафіксувала точку: ДІЯ. На практиках ФОКУС декомпозуємо крок до виконуваного формату.',
  }

  for (const lead of leads) {
    const tgId = lead.telegramChatId ?? lead.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue
    const name = getSafeName(lead.firstName)
    const greeting = name ? `${name}, ` : ''
    const context = resultContext[lead.testResultType ?? ''] ?? ''
    const text =
      `${greeting}опубліковано розклад Zoom-практик ФОКУС на ${monthLabel}.\n\n`
      + `${scheduleLines}\n\n`
      + `${context ? `${context}\n\n` : ''}`
      + 'Для участі необхідно активувати доступ.'

    try {
      await telegramBot.telegram.sendMessage(tgId, text, {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Активувати доступ до ФОКУС', callback_data: 'open_focus_payment' },
          ]],
        },
      })
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notifyMonth lead] ${tgId}:`, err)
    }
  }

  console.log(`[notifyMonthSchedule] paid=${paidUsers.length} leads=${leads.length} sessions=${upcomingGroupSessions.length}`)
}
