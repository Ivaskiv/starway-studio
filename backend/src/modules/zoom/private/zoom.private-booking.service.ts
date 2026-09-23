import { FOCUS_PRODUCT_CODE } from '@/products/focus/config/focus.constants.js'
import { ZoomSessionType, ZoomStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import {
  bot,
  coachBot,
  sendDedupedTelegramMessage,
  sendOpsTelegramMessage,
} from '../../../lib/telegram.js'
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js'
import {
  createRequest,
  resolveZoomIndividualPaymentTerms,
} from '../commerce/zoom.commerce-request.service.js'
import { afterZoomOperation } from '../core/zoom.operations.service.js'
import { endOfKyivWeek, startOfKyivWeek } from '../shared/zoom.time.utils.js'

const WEEKLY_LIMIT = 3
const WEEKLY_PRIVATE_LIMIT_MESSAGE = 'Цього тижня всі слоти зайняті. Запропонувати наступний тиждень?'

function formatIndividualPayment(amount: number, currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase()
  const label = normalizedCurrency === 'UAH' ? 'ГРН' : normalizedCurrency
  return `${new Intl.NumberFormat('uk-UA', {
    maximumFractionDigits: 2,
  }).format(amount)} ${label}`
}

function isIndividualSession(session: { type: ZoomSessionType; requests: unknown }): boolean {
  if (session.type === ZoomSessionType.PRIVATE) return true
  return Boolean(
    session.requests
    && typeof session.requests === 'object'
    && !Array.isArray(session.requests)
    && (session.requests as Record<string, unknown>).type === 'individual'
  )
}

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
  void FOCUS_PRODUCT_CODE
  const accessState = await getUserAccessState(userId)
  return accessState.hasFocus
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

export async function bookPrivateSlot(userId: string, sessionId: string, questionText?: string) {
  const session = await prisma.zoomSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })
  if (!session) throw new Error('session_not_found')
  if (!isIndividualSession(session)) throw new Error('not_private_session')
  if (!session.expertId) throw new Error('expert_not_found')
  if (session.status !== ZoomStatus.SCHEDULED || session.scheduledAt <= new Date()) throw new Error('slot_unavailable')
  if (session._count.attendees >= 1) throw new Error('slot_full')

  const existing = await prisma.zoomCommerceRequest.findFirst({
    where: { kind: 'INDIVIDUAL', requesterUserId: userId, zoomSessionId: sessionId,
      status: { in: ['REQUESTED', 'APPROVED_PENDING_PAYMENT', 'PAID'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return { success: true, request: existing }

  const individualPayment = resolveZoomIndividualPaymentTerms()
  const request = await createRequest({
    kind: 'INDIVIDUAL', requesterUserId: userId, expertId: session.expertId,
    zoomSessionId: session.id, scheduledAt: session.scheduledAt,
    amount: individualPayment.amount, currency: individualPayment.currency,
  })
  if (questionText?.trim()) {
    await prisma.event.upsert({ where: { id: `zoom-context:${request.id}` }, update: {},
      create: { id: `zoom-context:${request.id}`, userId, type: 'ZOOM_COMMERCE_CONTEXT', source: 'web',
        payload: { requestId: request.id, questionText: questionText.trim() } } })
  }
  await notifyPrivateSessionRequest({
    commerceRequestId: request.id,
    sessionId: session.id,
    userId,
  }).catch((error: unknown) => {
    console.error('[zoom/private request] coach notification failed', {
      commerceRequestId: request.id,
      error: error instanceof Error ? error.message : String(error),
    })
  })
  return { success: true, request }
}

export async function notifyPrivateSessionRequest(input: {
  commerceRequestId: string
  sessionId: string
  userId: string
}): Promise<void> {
  const { sendCommerceTicket } = await import('../commerce/zoom.commerce-telegram.js')
  const { sendUserTelegramMessage } = await import('../../../lib/telegram.js')
  const { buildZoomCalendarUrl } = await import('../urls.js')

  const [session, user] = await Promise.all([
    prisma.zoomSession.findUnique({
      where: { id: input.sessionId },
      select: { scheduledAt: true, topic: true },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        telegramChatId: true,
        telegramLinks: { select: { chatId: true }, take: 1 },
      },
    }),
  ])

  await sendCommerceTicket(input.commerceRequestId)

  const userChatId =
    user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null

  if (!userChatId || !session) return

  const zoomCalendarUrl = buildZoomCalendarUrl()
  const userZoomCalendarUrl =
    `${zoomCalendarUrl}${zoomCalendarUrl.includes('?') ? '&' : '?'}zoomRole=user`

  await sendUserTelegramMessage(
    String(userChatId),
    [
      '✅ ЗАПИС НА СЕСІЮ СТВОРЕНО!',
      '',
      'Твій запит на індивідуальну сесію надіслано коучу.',
      '',
      '⏳ Очікує підтвердження',
      'Ми повідомимо тебе, коли коуч підтвердить сесію.',
    ].join('\n'),
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '📅 ВІДКРИТИ МІЙ КАЛЕНДАР',
            web_app: { url: userZoomCalendarUrl },
          },
        ]],
      },
    },
  )
}

export async function notifyPrivateSessionPayment(input: {
  sessionId: string
  userId: string
}): Promise<void> {
  const session = await prisma.zoomSession.findUnique({
    where: { id: input.sessionId },
    select: { scheduledAt: true, expertId: true, topic: true },
  })
  if (!session) return

  const [user, coach] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        firstName: true,
        lastName: true,
        telegramChatId: true,
        telegramLinks: { select: { chatId: true }, take: 1 },
      },
    }),
    session.expertId
      ? prisma.user.findFirst({
          where: {
            expertId: session.expertId,
            role: { in: ['EXPERT', 'SUPERADMIN'] },
            deletedAt: null,
          },
          orderBy: [
            { role: 'desc' },
            { createdAt: 'asc' },
          ],
          select: {
            firstName: true,
            lastName: true,
            telegramChatId: true,
            telegramLinks: { select: { chatId: true }, take: 1 },
          },
        })
      : null,
  ])
  const userChatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  const coachChatId = coach?.telegramChatId ?? coach?.telegramLinks[0]?.chatId ?? null
  const date = session.scheduledAt.toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv', day: '2-digit', month: 'long', year: 'numeric',
  })
  const time = session.scheduledAt.toLocaleTimeString('uk-UA', {
    timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit',
  })
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Користувач'
  const coachName = [coach?.firstName, coach?.lastName].filter(Boolean).join(' ').trim()
  await Promise.all([
    userChatId
      ? sendDedupedTelegramMessage(
          userChatId,
          [
            '✅ Оплату підтверджено',
            'Індивідуальну Zoom-сесію заброньовано',
            '',
            `Дата: ${date}`,
            `Час: ${time}`,
            ...(coachName ? [`Коуч: ${coachName}`] : []),
            ...(session.topic ? [`Тема: ${session.topic}`] : []),
          ].join('\n'),
          undefined,
          bot,
        )
      : Promise.resolve(false),
    coachChatId
      ? sendDedupedTelegramMessage(
          coachChatId,
          [
            `Учасник: ${userName}`,
            'Користувач оплатив',
            'Сесію підтверджено',
            '',
            `Дата: ${date}`,
            `Час: ${time}`,
            ...(session.topic ? [`Тема: ${session.topic}`] : []),
          ].join('\n'),
          undefined,
          coachBot,
        )
      : Promise.resolve(false),
  ])
}

export async function notifyAssignedPrivateSession(input: {
  commerceRequestId: string
  sessionId: string
  userId: string
  checkoutUrl: string
  origin: 'user_approved' | 'coach_created'
}): Promise<void> {
  const [session, commerceRequest] = await Promise.all([
    prisma.zoomSession.findUnique({
      where: { id: input.sessionId },
      select: { scheduledAt: true, expertId: true, topic: true },
    }),
    prisma.zoomCommerceRequest.findUnique({
      where: { id: input.commerceRequestId },
      select: {
        id: true,
        kind: true,
        status: true,
        amount: true,
        currency: true,
        checkoutOrderReference: true,
        requesterUserId: true,
        zoomSessionId: true,
      },
    }),
  ])
  if (
    !session
    || commerceRequest?.kind !== 'INDIVIDUAL'
    || commerceRequest.status !== 'APPROVED_PENDING_PAYMENT'
    || commerceRequest.requesterUserId !== input.userId
    || commerceRequest.zoomSessionId !== input.sessionId
  ) return

  const [user, coach] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        firstName: true,
        lastName: true,
        telegramChatId: true,
        telegramLinks: { select: { chatId: true }, take: 1 },
      },
    }),
    session.expertId
      ? prisma.user.findFirst({
          where: {
            expertId: session.expertId,
            role: { in: ['EXPERT', 'SUPERADMIN'] },
            deletedAt: null,
          },
          orderBy: [
            { role: 'desc' },
            { createdAt: 'asc' },
          ],
          select: {
            firstName: true,
            lastName: true,
            telegramChatId: true,
            telegramLinks: { select: { chatId: true }, take: 1 },
          },
        })
      : null,
  ])
  const userChatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  const coachChatId = coach?.telegramChatId ?? coach?.telegramLinks[0]?.chatId ?? null
  const date = session.scheduledAt.toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv', day: '2-digit', month: 'long', year: 'numeric',
  })
  const time = session.scheduledAt.toLocaleTimeString('uk-UA', {
    timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit',
  })
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Користувач'
  const coachName = [coach?.firstName, coach?.lastName].filter(Boolean).join(' ').trim()
  const paymentLabel = formatIndividualPayment(Number(commerceRequest.amount), commerceRequest.currency)
  const checkout = commerceRequest.checkoutOrderReference
    ? await prisma.checkoutSession.findFirst({
        where: { orderReference: commerceRequest.checkoutOrderReference },
        select: { expiresAt: true },
      })
    : null
  const paymentDeadline = checkout?.expiresAt
    ? checkout.expiresAt.toLocaleTimeString('uk-UA', {
        timeZone: 'Europe/Kyiv',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  await Promise.all([
    userChatId
      ? sendDedupedTelegramMessage(
          userChatId,
          [
            'Сесію підтверджено.',
            '',
            `Дата: ${date}`,
            `Час: ${time}`,
            ...(session.topic ? [`Тема: ${session.topic}`] : []),
            ...(coachName ? [`Коуч: ${coachName}`] : []),
            paymentDeadline ? `Час заброньований за тобою до ${paymentDeadline}.` : null,
            'Якщо оплата не надійде вчасно, бронювання скасується автоматично.',
            `Вартість: ${paymentLabel}`,
          ].filter((line): line is string => Boolean(line)).join('\n'),
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: `ОПЛАТИТИ ${paymentLabel}`, url: input.checkoutUrl }],
                [{ text: 'СКАСУВАТИ ЗАПИС', callback_data: `zoom:commerce:cancel:${commerceRequest.id}` }],
              ],
            },
          },
          bot,
        )
      : Promise.resolve(false),

    coachChatId
      ? sendDedupedTelegramMessage(
          coachChatId,
          [
            '✅ ІНДИВІДУАЛЬНА СЕСІЯ СТВОРЕНА',
            '',
            `👤 Учасник: ${userName}`,
            `📅 ${date} · ${time}`,
            ...(session.topic ? [`💬 Тема: ${session.topic}`] : []),
            '💳 Вартість: 60 €',
            '',
            '🟠 Статус: Очікує оплату користувачем',
          ].join('\n'),
          undefined,
          coachBot,
        )
      : Promise.resolve(false),

    input.origin === 'coach_created'
      ? sendOpsTelegramMessage(
          [
            '🟣 ІНДИВІДУАЛЬНА СЕСІЯ СТВОРЕНА КОУЧЕМ',
            '',
            `👤 Користувач: ${userName}`,
            `📅 ${date} · ${time}`,
            ...(coachName ? [`🧑‍💼 Коуч: ${coachName}`] : []),
            ...(session.topic ? [`💬 Тема: ${session.topic}`] : []),
            '💳 Вартість: 60 €',
            '',
            '🟠 Статус: Очікує оплату',
          ].join('\n'),
          undefined,
          {
            messageType: 'zoom_individual_coach_created',
            source: 'notifyAssignedPrivateSession',
          },
        )
      : Promise.resolve(false),
  ])
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
