import { SwapStatus, ZoomSessionType, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { bot, sendDedupedTelegramMessage } from '../../../lib/telegram.js'
import { afterZoomOperation } from '../core/zoom.operations.service.js'
import { isActiveFocusSubscriber } from '../private/zoom.private-booking.service.js'

const KYIV_TIME_ZONE = 'Europe/Kyiv'

function getSafeName(firstName?: string | null): string { if (!firstName) return ''; const trimmed=firstName.replace(/[<>{}\[\]]/g,'' ).replace(/\s+/g,' ').trim().slice(0,40); if (!trimmed) return ''; const lowered=trimmed.toLowerCase(); if (new Set(['undefined','null','user','test','admin','bot','учень','coach']).has(lowered) || lowered.startsWith('telegram-guest') || /^\d+$/.test(trimmed) || trimmed.length<2) return ''; return trimmed }
function isPrismaTableMissingError(err: unknown): err is { code: string } { return err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2021' }
async function notifyCoach(expertId: string | null | undefined, details: { swapId: string }): Promise<void> { if (!expertId) return; const expertUser=await prisma.user.findFirst({where:{expertId},select:{telegramChatId:true}}); if (!expertUser?.telegramChatId) return; await sendDedupedTelegramMessage(expertUser.telegramChatId, `💱 Відбувся обмін слотами. Swap #${details.swapId}`).catch(()=>undefined) }

function formatPrivateSessionSlotLabel(date: Date): string {
  return date.toLocaleString('uk-UA', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TIME_ZONE,
  })
}

export async function getSwapCandidates(
  requesterId: string,
  sessionIdFrom: string
) {
  const sessionFrom = await prisma.zoomSession.findUnique({
    where: { id: sessionIdFrom },
    select: {
      id: true,
      expertId: true,
      scheduledAt: true,
      type: true,
      status: true,
    },
  })
  if (!sessionFrom) throw new Error('session_not_found')
  if (sessionFrom.type !== ZoomSessionType.PRIVATE)
    throw new Error('not_private_session')

  const requesterAttendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: { sessionId: sessionIdFrom, userId: requesterId },
    },
    select: { id: true },
  })
  if (!requesterAttendee) throw new Error('requester_not_attendee')

  const candidateSessions = await prisma.zoomSession.findMany({
    where: {
      expertId: sessionFrom.expertId,
      type: ZoomSessionType.PRIVATE,
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gt: new Date() },
      id: { not: sessionIdFrom },
      attendees: {
        some: {
          userId: { not: requesterId },
        },
      },
    },
    select: {
      id: true,
      scheduledAt: true,
      topic: true,
      attendees: {
        where: {
          userId: { not: requesterId },
        },
        take: 1,
        select: {
          userId: true,
          user: {
            select: {
              firstName: true,
            },
          },
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 12,
  })

  return candidateSessions
    .map((session) => {
      const attendee = session.attendees[0]
      if (!attendee) return null

      return {
        sessionId: session.id,
        scheduledAt: session.scheduledAt,
        topic: session.topic,
        targetUserId: attendee.userId,
        targetUserName: getSafeName(attendee.user.firstName) || 'Учасник',
        slotLabel: formatPrivateSessionSlotLabel(session.scheduledAt),
      }
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate)
    )
}

export async function createSwapRequest(
  requesterId: string,
  sessionIdFrom: string,
  options?: {
    targetUserId?: string
    sessionIdTo?: string
    targetUserIds?: string[]
  }
) {
  try {
    const isSubscriber = await isActiveFocusSubscriber(requesterId)
    if (!isSubscriber) throw new Error('focus_subscription_required')

    const sessionFrom = await prisma.zoomSession.findUnique({
      where: { id: sessionIdFrom },
    })
    if (!sessionFrom) throw new Error('session_not_found')
    if (sessionFrom.type !== ZoomSessionType.PRIVATE)
      throw new Error('not_private_session')

    const requesterAttendee = await prisma.zoomSessionAttendee.findUnique({
      where: {
        sessionId_userId: { sessionId: sessionIdFrom, userId: requesterId },
      },
      select: { id: true },
    })
    if (!requesterAttendee) throw new Error('requester_not_attendee')

    const targetUserId = options?.targetUserId?.trim() || undefined
    const sessionIdTo = options?.sessionIdTo?.trim() || undefined

    if ((targetUserId && !sessionIdTo) || (!targetUserId && sessionIdTo)) {
      throw new Error('swap_target_incomplete')
    }

    if (targetUserId && sessionIdTo) {
      const targetAttendee = await prisma.zoomSessionAttendee.findUnique({
        where: {
          sessionId_userId: { sessionId: sessionIdTo, userId: targetUserId },
        },
        select: {
          id: true,
          user: {
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
          },
          session: {
            select: {
              id: true,
              type: true,
              status: true,
              expertId: true,
              scheduledAt: true,
            },
          },
        },
      })
      if (!targetAttendee) throw new Error('swap_target_not_found')
      if (targetAttendee.session.type !== ZoomSessionType.PRIVATE)
        throw new Error('not_private_session')
      if (targetAttendee.session.status === ZoomStatus.CANCELLED)
        throw new Error('swap_target_unavailable')
      if (targetAttendee.session.expertId !== sessionFrom.expertId)
        throw new Error('swap_target_mismatch')
      if (targetUserId === requesterId) throw new Error('swap_self_forbidden')

      const duplicate = await prisma.zoomSlotSwapRequest.findFirst({
        where: {
          requesterId,
          sessionIdFrom,
          targetUserId,
          sessionIdTo,
          status: SwapStatus.PENDING,
        },
        select: { id: true },
      })
      if (duplicate) throw new Error('swap_request_already_sent')

      const swap = await prisma.zoomSlotSwapRequest.create({
        data: {
          requesterId,
          sessionIdFrom,
          targetUserId,
          sessionIdTo,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          status: SwapStatus.PENDING,
        },
      })

      const requesterUser = await prisma.user.findUnique({
        where: { id: requesterId },
        select: { firstName: true },
      })

      const targetChatId =
        targetAttendee.user.telegramChatId ??
        targetAttendee.user.telegramLinks[0]?.chatId ??
        null

      if (targetChatId) {
        const requesterName = getSafeName(requesterUser?.firstName) || 'Учасник'
        await sendDedupedTelegramMessage(
          targetChatId,
          [
            `💱 ${requesterName} пропонує обміняти слот.`,
            '',
            `Її слот: ${formatPrivateSessionSlotLabel(sessionFrom.scheduledAt)}`,
            `Твій слот: ${formatPrivateSessionSlotLabel(targetAttendee.session.scheduledAt)}`,
          ].join('\n'),
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Прийняти',
                    callback_data: `zoom:swap:accept:${swap.id}:${sessionIdTo}`,
                  },
                  {
                    text: 'Відхилити',
                    callback_data: `zoom:swap:decline:${swap.id}`,
                  },
                ],
              ],
            },
          }
        ).catch(() => undefined)
      }

      return {
        swapId: swap.id,
        targetUserId,
        sessionIdTo,
        sent: true,
      }
    }

    const candidates = await getSwapCandidates(requesterId, sessionIdFrom)
    return {
      swapId: null,
      candidates,
    }
  } catch (err: unknown) {
    if (isPrismaTableMissingError(err)) {
      console.warn(
        '[zoom/service] ZoomSlotSwapRequest table not found — run prisma migrate deploy to apply migration. Skipping createSwapRequest.'
      )
      throw new Error('swap_storage_unavailable')
    }
    throw err
  }
}

export async function acceptSwapRequest(
  swapId: string,
  acceptorId: string,
  sessionIdTo: string
) {
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
    if (swap.targetUserId && swap.targetUserId !== acceptorId)
      throw new Error('swap_for_another_user')
    if (swap.sessionIdTo && swap.sessionIdTo !== sessionIdTo)
      throw new Error('swap_session_mismatch')

    const acceptorAttendee = await prisma.zoomSessionAttendee.findUnique({
      where: {
        sessionId_userId: { sessionId: sessionIdTo, userId: acceptorId },
      },
      select: { id: true },
    })
    if (!acceptorAttendee) throw new Error('acceptor_not_attendee')

    await prisma.$transaction(async (tx) => {
      await tx.zoomSessionAttendee.update({
        where: {
          sessionId_userId: {
            sessionId: sessionIdFrom,
            userId: swap.requesterId,
          },
        },
        data: { userId: acceptorId },
      })
      await tx.zoomSessionAttendee.update({
        where: {
          sessionId_userId: { sessionId: sessionIdTo, userId: acceptorId },
        },
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
    }).catch((error) =>
      console.error('[zoom] afterZoomOperation failed:', error)
    )

    void afterZoomOperation(bot, {
      operation: 'swap_accept',
      sessionId: sessionIdTo,
      affectedUserIds: [acceptorId, swap.requesterId],
    }).catch((error) =>
      console.error('[zoom] afterZoomOperation failed:', error)
    )

    return {
      success: true,
      newSessionA: sessionIdTo,
      newSessionB: sessionIdFrom,
    }
  } catch (err: unknown) {
    if (isPrismaTableMissingError(err)) {
      console.warn(
        '[zoom/service] ZoomSlotSwapRequest table not found — run prisma migrate deploy to apply migration. Skipping acceptSwapRequest.'
      )
      throw new Error('swap_storage_unavailable')
    }
    throw err
  }
}

export async function declineSwapRequest(swapId: string, _declinerId: string) {
  try {
    const existing = await prisma.zoomSlotSwapRequest.findUnique({
      where: { id: swapId },
      select: { id: true, targetUserId: true },
    })
    if (!existing) throw new Error('swap_not_found')
    if (existing.targetUserId && existing.targetUserId !== _declinerId)
      throw new Error('swap_for_another_user')

    const swap = await prisma.zoomSlotSwapRequest.update({
      where: { id: swapId },
      data: { status: SwapStatus.DECLINED, resolvedAt: new Date() },
    })
    const requester = await prisma.user.findUnique({
      where: { id: swap.requesterId },
      select: { telegramChatId: true },
    })
    if (requester?.telegramChatId) {
      await sendDedupedTelegramMessage(
        requester.telegramChatId,
        'Обмін відхилено'
      ).catch(() => undefined)
    }

    if (swap.sessionIdFrom) {
      void afterZoomOperation(bot, {
        operation: 'swap_decline',
        sessionId: swap.sessionIdFrom,
        affectedUserIds: [swap.requesterId],
      }).catch((error) =>
        console.error('[zoom] afterZoomOperation failed:', error)
      )
    }

    return { success: true }
  } catch (err: unknown) {
    if (isPrismaTableMissingError(err)) {
      console.warn(
        '[zoom/service] ZoomSlotSwapRequest table not found — run prisma migrate deploy to apply migration. Skipping declineSwapRequest.'
      )
      throw new Error('swap_storage_unavailable')
    }
    throw err
  }
}
