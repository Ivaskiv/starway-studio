import { Prisma, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { bot } from '../../../lib/telegram.js'
import type { ZoomSession } from '../types.js'
import { endOfRollingKyivWindow, startOfKyivDay } from '../shared/zoom.time.utils.js'
import { afterZoomOperation } from '../core/zoom.operations.service.js'

export async function getAvailableSlotsForUser(userId: string): Promise<
  Array<{
    id: string
    date: string
    hour: number
    bookedCount: number
    isBooked: boolean
  }>
> {
  const now = new Date()
  const startOfToday = startOfKyivDay(now)
  const nextFourteenDays = endOfRollingKyivWindow(now)

  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gte: startOfToday, lt: nextFourteenDays },
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
      const deadlineHours =
        typeof meta.bookingDeadlineHours === 'number'
          ? meta.bookingDeadlineHours
          : 24
      const deadline = new Date(
        session.scheduledAt.getTime() - deadlineHours * 60 * 60 * 1000
      )
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
    .filter(
      (
        slot
      ): slot is {
        id: string
        date: string
        hour: number
        bookedCount: number
        isBooked: boolean
      } => Boolean(slot)
    )
}

export async function patchSessionRequests(
  sessionId: string,
  requests: Prisma.InputJsonValue
): Promise<ZoomSession> {
  return prisma.zoomSession.update({
    where: { id: sessionId },
    data: { requests },
  })
}

export async function bookSlot(
  sessionId: string,
  userId: string
): Promise<{ booked: boolean; remainingSlots: number }> {
  const session = await prisma.zoomSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })

  const meta = (session.requests as Record<string, unknown>) ?? {}
  const maxSlots = typeof meta.maxSlots === 'number' ? meta.maxSlots : 50
  const deadlineHours =
    typeof meta.bookingDeadlineHours === 'number'
      ? meta.bookingDeadlineHours
      : 24

  if (session._count.attendees >= maxSlots) throw new Error('slot_full')

  const deadline = new Date(
    session.scheduledAt.getTime() - deadlineHours * 60 * 60 * 1000
  )
  if (new Date() >= deadline) throw new Error('deadline_passed')

  await prisma.zoomSessionAttendee.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, attended: false },
    update: {},
  })

  const newCount = await prisma.zoomSessionAttendee.count({
    where: { sessionId },
  })

  if (newCount >= maxSlots) {
    await patchSessionRequests(sessionId, {
      ...meta,
      slotStatus: 'booked',
    } as unknown as Prisma.InputJsonValue)
  }

  void afterZoomOperation(bot, {
    operation: 'book',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  return { booked: true, remainingSlots: maxSlots - newCount }
}

export async function unbookSlot(
  sessionId: string,
  userId: string
): Promise<void> {
  const session = await prisma.zoomSession.findUniqueOrThrow({
    where: { id: sessionId },
  })

  const cutoff = new Date(session.scheduledAt.getTime() - 24 * 60 * 60 * 1000)
  if (new Date() >= cutoff) throw new Error('too_late')

  await prisma.zoomSessionAttendee.deleteMany({ where: { sessionId, userId } })

  const meta = (session.requests as Record<string, unknown>) ?? {}
  await patchSessionRequests(sessionId, {
    ...meta,
    slotStatus: 'available',
  } as unknown as Prisma.InputJsonValue)

  void afterZoomOperation(bot, {
    operation: 'unbook',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))
}
