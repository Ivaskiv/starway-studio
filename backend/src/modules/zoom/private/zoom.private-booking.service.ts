import { FOCUS_PRODUCT_CODE } from '@/products/focus/config/focus.constants.js'
import { ZoomSessionType, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { bot } from '../../../lib/telegram.js'
import { afterZoomOperation } from '../core/zoom.operations.service.js'
import { endOfKyivWeek, startOfKyivWeek } from '../shared/zoom.time.utils.js'

const WEEKLY_LIMIT = 3
const WEEKLY_PRIVATE_LIMIT_MESSAGE = 'Цього тижня всі слоти зайняті. Запропонувати наступний тиждень?'

async function countWeeklyPrivateSessions(
  expertId: string,
  anchorDate: Date
): Promise<number> {
  const weekStart = startOfKyivWeek(anchorDate)
  const weekEnd = endOfKyivWeek(anchorDate)

  return prisma.zoomSession.count({
    where: {
      expertId,
      type: ZoomSessionType.PRIVATE,
      status: { not: ZoomStatus.CANCELLED },
      scheduledAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  })
}

export async function assertWeeklyPrivateLimit(
  expertId: string,
  anchorDate: Date
): Promise<void> {
  const weeklyCount = await countWeeklyPrivateSessions(expertId, anchorDate)
  if (weeklyCount >= WEEKLY_LIMIT) {
    throw new Error(WEEKLY_PRIVATE_LIMIT_MESSAGE)
  }
}

export async function isActiveFocusSubscriber(
  userId: string
): Promise<boolean> {
  const now = new Date()
  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      product: {
        code: FOCUS_PRODUCT_CODE,
      },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  })

  return Boolean(subscription)
}

export async function getAvailablePrivateSlots(
  expertId: string,
  from: Date,
  to: Date
) {
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
    .map((session) => ({
      session,
      remaining: session.capacity - session._count.attendees,
    }))
    .filter((row) => row.remaining > 0)
}

export async function bookPrivateSlot(userId: string, sessionId: string) {
  const session = await prisma.zoomSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })
  if (!session) throw new Error('session_not_found')
  if (session.type !== ZoomSessionType.PRIVATE)
    throw new Error('not_private_session')
  if (!session.expertId) throw new Error('expert_not_found')

  await assertWeeklyPrivateLimit(session.expertId, session.scheduledAt)

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
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  return { success: true, session }
}

export async function cancelPrivateBooking(userId: string, sessionId: string) {
  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    include: { session: { select: { scheduledAt: true } } },
  })
  if (!attendee) throw new Error('booking_not_found')

  const minCancellationAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  if (attendee.session.scheduledAt <= minCancellationAt)
    throw new Error('too_late_to_cancel')

  await prisma.zoomSessionAttendee.delete({
    where: { sessionId_userId: { sessionId, userId } },
  })

  void afterZoomOperation(bot, {
    operation: 'unbook',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  return { success: true }
}
