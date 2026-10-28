import type { Context } from 'telegraf'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../../db/client.js'
import {
  bot,
  coachBot,
  resolveOpsChatId,
  sendDedupedTelegramMessage,
  sendOpsTelegramMessage,
  sendUserTelegramMessage,
} from '../../../lib/telegram.js'
import { sendTelegramMessage } from '../../../lib/telegram/send.js'
import {
  approveRequest,
  rejectRequest,
  getCommerceCheckoutUrl,
  resolveIndividualPaymentDeadline,
} from './zoom.commerce-request.service.js'
import { buildZoomCalendarUrl } from '../urls.js'
import { telegramContentRegistry } from '../../telegram-mentor/content/contentRegistry.js'
import { formatKyivTimeLabel } from '../shared/zoom.time.utils.js'

const dialogueType = 'ZOOM_COMMERCE_DIALOGUE'
const EXPIRY_DELIVERY_LEASE_MS = 5 * 60 * 1000
const expiryRecipients = ['USER', 'COACH', 'OPS'] as const
type ExpiryRecipient = (typeof expiryRecipients)[number]

export function commerceActions(requestId: string) {
  return { inline_keyboard: [[
    { text: '✅ ПІДТВЕРДИТИ', callback_data: `ops:zoom:approve:${requestId}` },
    { text: '❌ ВІДХИЛИТИ', callback_data: `ops:zoom:reject:${requestId}` },
  ]] }
}

async function requestContext(requestId: string) {
  return prisma.zoomCommerceRequest.findUnique({ where: { id: requestId }, include: {
    requester: { select: { firstName: true, lastName: true, telegramChatId: true,
      telegramLinks: { select: { chatId: true }, take: 1 } } },
    zoomSession: { select: { topic: true, requests: true } },
  } })
}

function formatCommerceDate(value: Date): string {
  const date = value.toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const time = formatKyivTimeLabel(value)
  return `${date} · ${time}`
}

function formatPaymentDeadline(value: Date): string {
  return formatKyivTimeLabel(value)
}

/** Called only by the durable NotificationJob worker. */
export async function deliverIndividualPaymentReminder(input: {
  requestId: string
  expectedDeadline: string
}): Promise<'sent' | 'skipped'> {
  const request = await requestContext(input.requestId)
  if (
    !request
    || request.kind !== 'INDIVIDUAL'
    || request.status !== 'APPROVED_PENDING_PAYMENT'
    || !request.checkoutOrderReference
  ) return 'skipped'

  const checkout = await prisma.checkoutSession.findFirst({
    where: { orderReference: request.checkoutOrderReference },
    orderBy: { createdAt: 'desc' },
  })
  if (
    !checkout
    || checkout.expiresAt.toISOString() !== input.expectedDeadline
    || checkout.expiresAt <= new Date()
    || checkout.invalidatedAt
    || !['CREATED', 'OPENED'].includes(checkout.status)
  ) return 'skipped'

  const chatId = request.requester.telegramChatId ?? request.requester.telegramLinks[0]?.chatId
  const checkoutUrl = chatId
    ? await getCommerceCheckoutUrl(request.id, request.requesterUserId)
    : null
  if (!chatId || !checkoutUrl) return 'skipped'

  const delivered = await sendUserTelegramMessage(
    String(chatId),
    [
      telegramContentRegistry.zoomCommerce.paymentReminderHeading,
      '',
      telegramContentRegistry.zoomCommerce.paymentReminderBody,
      `Резервування діє до ${formatPaymentDeadline(checkout.expiresAt)}.`,
      telegramContentRegistry.zoomCommerce.paymentReminderKeepSlot,
    ].join('\n'),
    {
      reply_markup: {
        inline_keyboard: [[{
          text: telegramContentRegistry.zoomCommerce.paymentReminderCta,
          url: checkoutUrl,
        }]],
      },
    },
  )
  if (!delivered) throw new Error('COMMERCE_PAYMENT_REMINDER_DELIVERY_FAILED')
  return 'sent'
}

function requesterName(
  request: NonNullable<Awaited<ReturnType<typeof requestContext>>>,
): string {
  return [request.requester.firstName, request.requester.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Користувач'
}

function commerceTypeLabel(
  request: NonNullable<Awaited<ReturnType<typeof requestContext>>>,
): string {
  return request.kind === 'INDIVIDUAL'
    ? '🟣 ІНДИВІДУАЛЬНА СЕСІЯ'
    : '⚔️ ZOOM BATTLE'
}

function commercePriceLabel(
  request: NonNullable<Awaited<ReturnType<typeof requestContext>>>,
): string {
  return `${Number(request.amount)} ${request.currency === 'EUR' ? '€' : request.currency}`
}

/** Stable, compact reference for recipients who are already authorized for this request. */
function shortRequestReference(requestId: string): string {
  return requestId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()
}

function opsRequestSummary(
  request: NonNullable<Awaited<ReturnType<typeof requestContext>>>,
): string {
  return [
    `👤 ${requesterName(request)}`,
    `📅 ${formatCommerceDate(request.scheduledAt)}`,
    ...(request.kind !== 'INDIVIDUAL' && request.zoomSession?.topic
      ? [`💬 ${request.zoomSession.topic}`]
      : []),
    `💳 ${commercePriceLabel(request)}`,
    '',
    '⏳ Очікує рішення',
  ].join('\n')
}

function userPaymentSummary(
  request: NonNullable<Awaited<ReturnType<typeof requestContext>>>,
): string {
  return [
    commerceTypeLabel(request),
    `📅 ${formatCommerceDate(request.scheduledAt)}`,
    ...(request.zoomSession?.topic ? [`💬 ${request.zoomSession.topic}`] : []),
    `💳 До оплати: ${commercePriceLabel(request)}`,
  ].join('\n')
}

function userRejectedSummary(
  request: NonNullable<Awaited<ReturnType<typeof requestContext>>>,
): string {
  return [
    commerceTypeLabel(request),
    `📅 ${formatCommerceDate(request.scheduledAt)}`,
    ...(request.zoomSession?.topic ? [`💬 ${request.zoomSession.topic}`] : []),
    '',
    'Запит відхилено.',
  ].join('\n')
}

export async function sendCommerceTicket(requestId: string) {
  const request = await requestContext(requestId)
  const opsChatId = resolveOpsChatId()
  if (!request || request.status !== 'REQUESTED' || !opsChatId) return false
  // The ticket and its replies use the same USER bot callback/text owners.
  const context = await prisma.event.findUnique({ where: { id: `zoom-context:${request.id}` } })
  const question = (context?.payload as { questionText?: string } | undefined)?.questionText
  const meta = request.zoomSession?.requests as { goalA?: string; goalB?: string } | null
  const contextText = question || [meta?.goalA, meta?.goalB].filter(Boolean).join(' / ')
  return sendUserTelegramMessage(
    opsChatId,
    [
      '🟣 НОВИЙ ЗАПИТ НА СЕСІЮ',
      '',
      opsRequestSummary(request),
      ...(contextText ? ['', `💬 ${contextText}`] : []),
    ].join('\n'),
    { reply_markup: commerceActions(request.id) },
  )
}

export async function handleCommerceCallback(ctx: Context): Promise<boolean> {
  const action = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : ''
  const match = action.match(/^ops:zoom:(approve|ask|reject):([\w-]+)$/)
  if (!match) return false
  if (String(ctx.chat?.id) !== resolveOpsChatId() || !ctx.from) {
    await ctx.answerCbQuery('Недоступно')
    return true
  }
  await ctx.answerCbQuery()
  try {
  const request = await requestContext(match[2])
  if (!request) return true
  const userChatId = request.requester.telegramChatId ?? request.requester.telegramLinks[0]?.chatId
  if (!userChatId) throw new Error('COMMERCE_USER_CHAT_MISSING')
  if (match[1] === 'ask') {
    if (!['REQUESTED', 'APPROVED_PENDING_PAYMENT'].includes(request.status)) return true
    const eventId = `zoom-prompt:${ctx.callbackQuery!.id}`
    const existing = await prisma.event.findUnique({ where: { id: eventId } })
    if (existing) return true
    const payload = { requestId: request.id, chatId: String(ctx.chat!.id),
      operatorId: String(ctx.from.id), userChatId: String(userChatId), direction: 'ops' }
    await prisma.event.create({ data: { id: eventId, userId: request.requesterUserId,
      type: dialogueType, source: 'telegram', state: 'PENDING', payload } })
    const prompt = await sendTelegramMessage(bot, ctx.chat!.id,
      `<a href="tg://user?id=${ctx.from.id}">Оператор</a>, напишіть уточнення до запису.`,
      { replyMarkup: { force_reply: true, selective: true } }) as { message_id: number }
    await prisma.event.update({ where: { id: eventId }, data: {
      state: 'ARMED', payload: { ...payload, promptMessageId: prompt.message_id },
    } })
    return true
  }
  if (match[1] === 'reject') {
    await rejectRequest(request.id, request.expertId)
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => undefined)
    await sendUserTelegramMessage(
      String(userChatId),
      [
        '❌ ЗАПИТ ВІДХИЛЕНО',
        '',
        userRejectedSummary(request),
      ].join('\n'),
    )
    await sendUserTelegramMessage(
      String(ctx.chat!.id),
      [
        '❌ ЗАПИТ ВІДХИЛЕНО',
        '',
        `👤 ${requesterName(request)}`,
        `📅 ${formatCommerceDate(request.scheduledAt)}`,
        ...(request.zoomSession?.topic ? [`💬 ${request.zoomSession.topic}`] : []),
        '',
        '❌ Статус: Відхилено',
      ].join('\n'),
    )
  } else {
    const approved = await approveRequest(request.id, request.expertId)
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => undefined)
    try {
      const checkoutUrl = await getCommerceCheckoutUrl(request.id, request.requesterUserId)
      if (approved.request.status === 'APPROVED_PENDING_PAYMENT' && checkoutUrl) {
        const paymentDeadline = approved.request.kind === 'INDIVIDUAL' && approved.request.approvedAt
          ? resolveIndividualPaymentDeadline({
            approvedAt: approved.request.approvedAt,
            scheduledAt: approved.request.scheduledAt,
          })
          : null
        await sendUserTelegramMessage(
          String(userChatId),
          [
            telegramContentRegistry.zoomCommerce.approvalPendingHeading,
            '',
            telegramContentRegistry.zoomCommerce.approvalPendingBody,
            'Щоб закріпити сесію, оплати її.',
            ...(paymentDeadline ? ['', `Заверши оплату до ${formatPaymentDeadline(paymentDeadline)}.`] : []),
            '',
            userPaymentSummary(request),
          ].join('\n'),
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: `💳 ОПЛАТИТИ ${commercePriceLabel(request)}`, url: checkoutUrl },
                ],
                [
                  {
                    text: '📅 ВІДКРИТИ КАЛЕНДАР',
                    web_app: {
                      url: buildZoomCalendarUrl(),
                    },
                  },
                ],
              ],
            },
          },
        )
        await sendUserTelegramMessage(
          String(ctx.chat!.id),
          [
            telegramContentRegistry.zoomCommerce.approvalOpsHeading,
            '',
            `👤 ${requesterName(request)}`,
            `📅 ${formatCommerceDate(request.scheduledAt)}`,
            ...(request.zoomSession?.topic ? [`💬 ${request.zoomSession.topic}`] : []),
            `💳 ${commercePriceLabel(request)}`,
            '',
            telegramContentRegistry.zoomCommerce.approvalOpsStatus,
          ].join('\n'),
        )
      }
    } catch (error) {
      console.error('[zoom commerce] approval delivery failed after persisted approval', {
        requestId: request.id,
        error: error instanceof Error ? error.message : String(error),
      })
      await sendUserTelegramMessage(
        String(ctx.chat!.id),
        'Сесію підтверджено. Не вдалося доставити повідомлення користувачу. Повторне натискання не створить нову оплату.',
      ).catch(() => undefined)
    }
  }
  return true
  } catch {
    await sendUserTelegramMessage(String(ctx.chat!.id), 'Не вдалося виконати дію або доставити повідомлення. Повторіть дію в картці запиту.')
    return true
  }
}

export async function handleCommerceReply(ctx: Context): Promise<boolean> {
  if (!ctx.message || !('text' in ctx.message) || !ctx.message.reply_to_message || !ctx.from) return false
  const chatId = String(ctx.chat?.id)
  const promptMessageId = ctx.message.reply_to_message.message_id
  const isOps = chatId === resolveOpsChatId()
  const event = await prisma.event.findFirst({ where: {
    type: dialogueType, state: 'ARMED', AND: [
      { payload: { path: ['chatId'], equals: chatId } },
      { payload: { path: ['promptMessageId'], equals: promptMessageId } },
      ...(isOps ? [{ payload: { path: ['operatorId'], equals: String(ctx.from.id) } }] : []),
    ],
  } })
  if (!event) return false
  const payload = event.payload as { requestId: string; operatorId: string; userChatId: string }
  const request = await requestContext(payload.requestId)
  if (!request) return true
  if (!isOps && (String(ctx.from.id) !== payload.userChatId || chatId !== payload.userChatId)) return true
  // Claim once before delivery; concurrent updates cannot cross or send twice.
  const claimed = await prisma.event.updateMany({ where: { id: event.id, state: 'ARMED' }, data: { state: 'SENDING' } })
  if (!claimed.count) return true
  try {
    if (isOps) {
      const nextPayload = { ...payload, chatId: payload.userChatId, direction: 'user' }
      const replyEvent = await prisma.event.create({ data: { userId: request.requesterUserId,
        type: dialogueType, source: 'telegram', state: 'PENDING', payload: nextPayload } })
      const sent = await sendTelegramMessage(bot, payload.userChatId,
        `ПІДТРИМКА ЩОДО ЗАПИСУ\n\n${ctx.message.text}`, { replyMarkup: { force_reply: true } }) as { message_id: number }
      await prisma.event.update({ where: { id: replyEvent.id }, data: { state: 'ARMED',
        payload: { ...nextPayload, promptMessageId: sent.message_id } } })
      await sendUserTelegramMessage(chatId, 'Уточнення надіслано користувачу.')
    } else {
      const sent = await sendUserTelegramMessage(resolveOpsChatId(),
        `${opsRequestSummary(request)}\n\n💬 ${ctx.message.text}`, { reply_markup: commerceActions(request.id) })
      if (!sent) throw new Error('COMMERCE_DIALOGUE_DELIVERY_FAILED')
    }
    await prisma.event.update({ where: { id: event.id }, data: { state: 'DELIVERED' } })
  } catch (error) {
    await prisma.event.update({ where: { id: event.id }, data: { state: 'ARMED' } })
    await sendUserTelegramMessage(chatId, 'Не вдалося доставити відповідь. Повторіть відповідь на це саме повідомлення.')
  }
  return true
}

async function deliverCommercePaymentNotification(input: {
  eventId: string
  requestId: string
  orderReference: string
  userId: string
  destination: 'user' | 'ops'
  deliver: () => Promise<boolean>
}): Promise<boolean> {
  const existing = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: { state: true },
  })
  if (existing?.state === 'DELIVERED') return true

  if (!existing) {
    await prisma.event.create({
      data: {
        id: input.eventId,
        userId: input.userId,
        type: 'ZOOM_COMMERCE_PAID',
        source: 'payment_callback',
        state: 'PENDING',
        payload: {
          requestId: input.requestId,
          orderReference: input.orderReference,
          destination: input.destination,
        },
      },
    }).catch(() => undefined)
  }

  const claimed = await prisma.event.updateMany({
    where: { id: input.eventId, state: { in: ['PENDING', 'FAILED'] } },
    data: { state: 'SENDING' },
  })
  if (!claimed.count) return false

  try {
    const sent = await input.deliver()
    if (!sent) throw new Error('TELEGRAM_DELIVERY_RETURNED_FALSE')
    await prisma.event.update({ where: { id: input.eventId }, data: { state: 'DELIVERED' } })
    console.info('[ZOOM_COMMERCE_PAYMENT_DELIVERY_OK]', {
      requestId: input.requestId,
      orderReference: input.orderReference,
      destination: input.destination,
    })
    return true
  } catch (error) {
    await prisma.event.update({ where: { id: input.eventId }, data: { state: 'FAILED' } }).catch(() => undefined)
    console.error('[ZOOM_COMMERCE_PAYMENT_DELIVERY_FAILED]', {
      requestId: input.requestId,
      orderReference: input.orderReference,
      destination: input.destination,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

export async function notifyCommercePaid(orderReference: string) {
  const row = await prisma.zoomCommerceRequest.findUnique({
    where: { checkoutOrderReference: orderReference },
  })
  if (!row || row.status !== 'PAID') return

  const request = await requestContext(row.id)
  if (!request) return

  const requests =
    request.zoomSession?.requests
    && typeof request.zoomSession.requests === 'object'
    && !Array.isArray(request.zoomSession.requests)
      ? request.zoomSession.requests as Record<string, unknown>
      : {}

  const zoomLink = String(requests.zoomLink ?? '').trim()

  const userCalendarUrl = buildZoomCalendarUrl()

  const userChatId =
    request.requester.telegramChatId
    ?? request.requester.telegramLinks[0]?.chatId
    ?? null

  const context = await prisma.event.findUnique({ where: { id: `zoom-context:${request.id}` } })
  const question = (context?.payload as { questionText?: unknown } | undefined)?.questionText
  const meaningfulQuestion = typeof question === 'string' && question.trim() ? question.trim() : null
  const buttons: Array<Array<
    | { text: string; url: string }
    | { text: string; web_app: { url: string } }
  >> = []

  if (zoomLink) {
    buttons.push([
      {
        text: '📹 ПРИЄДНАТИСЯ ДО ZOOM',
        url: zoomLink,
      },
    ])
  }

  buttons.push([
    {
      text: '📅 ВІДКРИТИ КАЛЕНДАР',
      web_app: { url: userCalendarUrl },
    },
  ])

  const userDelivered = await deliverCommercePaymentNotification({
    eventId: `zoom-commerce-paid:user:${request.id}`,
    requestId: request.id,
    orderReference,
    userId: request.requesterUserId,
    destination: 'user',
    deliver: () => userChatId
      ? sendUserTelegramMessage(
        String(userChatId),
        [
          telegramContentRegistry.zoomCommerce.paidHeading,
          '',
          'Твоя індивідуальна Zoom-сесія оплачена.',
          '',
          `📅 ${formatCommerceDate(request.scheduledAt)}`,
          ...(meaningfulQuestion ? [`💬 ${meaningfulQuestion}`] : []),
          '',
          telegramContentRegistry.zoomCommerce.confirmedBooking,
        ].join('\n'),
        { reply_markup: { inline_keyboard: buttons } },
      )
      : Promise.resolve(false),
  })

  const opsDelivered = await deliverCommercePaymentNotification({
    eventId: `zoom-commerce-paid:ops:${request.id}`,
    requestId: request.id,
    orderReference,
    userId: request.requesterUserId,
    destination: 'ops',
    deliver: () => sendOpsTelegramMessage(
      [
        '✅ ОПЛАТУ ОТРИМАНО',
        '',
        `👤 ${requesterName(request)}`,
        `📅 ${formatCommerceDate(request.scheduledAt)}`,
        `💳 ${commercePriceLabel(request)}`,
        `🧾 ${orderReference}`,
        '',
        telegramContentRegistry.zoomCommerce.paidStatus,
      ].join('\n'),
      undefined,
      { messageType: 'zoom_commerce_paid', source: 'notifyCommercePaid' },
    ),
  })

  const coach = await prisma.user.findFirst({
    where: {
      expertId: request.expertId,
      deletedAt: null,
    },
    select: {
      firstName: true,
      lastName: true,
      telegramChatId: true,
      telegramLinks: {
        select: { chatId: true },
        take: 1,
      },
    },
  })

  const coachChatId =
    coach?.telegramChatId
    ?? coach?.telegramLinks[0]?.chatId
    ?? null

  if (coachChatId) {
    await sendDedupedTelegramMessage(
      String(coachChatId),
      [
        '💳 ОПЛАТУ ОТРИМАНО',
        '',
        `👤 ${requesterName(request)}`,
        `📅 ${formatCommerceDate(request.scheduledAt)}`,
        `💬 ${meaningfulQuestion ?? request.zoomSession?.topic?.trim() ?? 'Індивідуальна Zoom-сесія'}`,
        `💳 ${commercePriceLabel(request)}`,
        '',
        '✅ Сесію підтверджено.',
        zoomLink
          ? 'Zoom-посилання додано.'
          : '⚠️ Zoom-посилання ще не додано.',
      ].join('\n'),
      undefined,
      coachBot,
    )
  }

  if (!userDelivered || !opsDelivered) {
    throw new Error('COMMERCE_PAYMENT_NOTIFICATION_DELIVERY_FAILED')
  }
}
async function reconcileExpiryEventState(eventId: string): Promise<void> {
  const deliveries = await prisma.eventDelivery.findMany({
    where: { eventId },
    select: { state: true },
  })
  if (deliveries.length === 0) return

  const states = deliveries.map((delivery) => delivery.state)
  const terminal = states.every((state) => state === 'DELIVERED' || state === 'SKIPPED')
  const noFurtherSafeDelivery = states.every((state) => state !== 'PENDING' && state !== 'SENDING')
  await prisma.event.update({
    where: { id: eventId },
    data: { state: terminal ? 'DELIVERED' : noFurtherSafeDelivery ? 'UNKNOWN' : 'SENDING' },
  })
}

async function markExpiryDeliveryUnknown(deliveryId: string, leaseToken: string, error: string) {
  await prisma.eventDelivery.updateMany({
    where: { id: deliveryId, state: 'SENDING', leaseToken },
    data: { state: 'UNKNOWN', leaseToken: null, leaseExpiresAt: null, lastError: error },
  })
}

async function deliverExpiryRecipient(input: {
  requestId: string
  deliveryId: string
  recipient: ExpiryRecipient
  leaseToken: string
}): Promise<void> {
  const request = await requestContext(input.requestId)
  if (!request || request.kind !== 'INDIVIDUAL' || request.status !== 'EXPIRED') {
    await prisma.eventDelivery.updateMany({
      where: { id: input.deliveryId, state: 'SENDING', leaseToken: input.leaseToken },
      data: { state: 'SKIPPED', leaseToken: null, leaseExpiresAt: null, lastError: 'request_not_expired' },
    })
    return
  }

  const markDelivered = async (receipt: { messageId: string | null }) => {
    await prisma.eventDelivery.updateMany({
      where: { id: input.deliveryId, state: 'SENDING', leaseToken: input.leaseToken },
      data: {
        state: 'DELIVERED',
        leaseToken: null,
        leaseExpiresAt: null,
        deliveredAt: new Date(),
        telegramMessageId: receipt.messageId,
        lastError: null,
      },
    })
  }
  const markSkipped = async (reason: string) => {
    await prisma.eventDelivery.updateMany({
      where: { id: input.deliveryId, state: 'SENDING', leaseToken: input.leaseToken },
      data: { state: 'SKIPPED', leaseToken: null, leaseExpiresAt: null, lastError: reason },
    })
  }
  const topic = request.zoomSession?.topic?.trim() || '—'

  try {
    if (input.recipient === 'USER') {
      const chatId = request.requester.telegramChatId ?? request.requester.telegramLinks[0]?.chatId
      if (!chatId) return markSkipped('user_chat_unavailable')
      const delivered = await sendUserTelegramMessage(
        String(chatId),
        [commerceTypeLabel(request), `📅 ${formatCommerceDate(request.scheduledAt)}`,
          `🆔 Запит ${shortRequestReference(request.id)}`, '',
          telegramContentRegistry.zoomCommerce.expirationBody, '',
          'Якщо хочеш записатися — обери новий зручний час.'].join('\n'),
        { reply_markup: { inline_keyboard: [[{
          text: telegramContentRegistry.zoomCommerce.expirationChooseTimeCta,
          web_app: { url: buildZoomCalendarUrl() },
        }], [{ text: telegramContentRegistry.zoomCommerce.paymentSupportCta, callback_data: 'user_home:support' }]] } },
        markDelivered,
      )
      if (!delivered) await markExpiryDeliveryUnknown(input.deliveryId, input.leaseToken, 'telegram_deduplicated_without_receipt')
      return
    }

    if (input.recipient === 'COACH') {
      const coach = await prisma.user.findFirst({
        where: { expertId: request.expertId, deletedAt: null },
        select: { telegramChatId: true, telegramLinks: { select: { chatId: true }, take: 1 } },
      })
      const chatId = coach?.telegramChatId ?? coach?.telegramLinks[0]?.chatId
      if (!chatId) return markSkipped('coach_chat_unavailable')
      const delivered = await sendDedupedTelegramMessage(
        String(chatId),
        ['❌ СЛОТ ЗВІЛЬНЕНО', '', commerceTypeLabel(request), `👤 ${requesterName(request)}`,
          `📅 ${formatCommerceDate(request.scheduledAt)}`, `🆔 Запит ${shortRequestReference(request.id)}`,
          `💬 ${topic}`, '', 'Статус: Час оплати вичерпано — слот звільнено.'].join('\n'),
        undefined,
        coachBot,
        markDelivered,
      )
      if (!delivered) await markExpiryDeliveryUnknown(input.deliveryId, input.leaseToken, 'telegram_deduplicated_without_receipt')
      return
    }

    const delivered = await sendOpsTelegramMessage(
      ['❌ ЧАС ОПЛАТИ ВИЧЕРПАНО', '', commerceTypeLabel(request), `👤 ${requesterName(request)}`,
        `📅 ${formatCommerceDate(request.scheduledAt)}`, `🧾 Запит ${request.id}`, `💬 ${topic}`,
        `💳 ${commercePriceLabel(request)}`, '', '❌ Статус: Не оплачено · слот звільнено'].join('\n'),
      undefined,
      { messageType: 'zoom_commerce_expired', source: 'notifyCommerceExpired' },
      markDelivered,
    )
    if (!delivered) await markExpiryDeliveryUnknown(input.deliveryId, input.leaseToken, 'telegram_delivery_outcome_unknown')
  } catch (error) {
    await markExpiryDeliveryUnknown(
      input.deliveryId,
      input.leaseToken,
      error instanceof Error ? error.message : 'telegram_delivery_outcome_unknown',
    )
  }
}

async function processFutureExpiryEvent(eventId: string, requestId: string, now: Date): Promise<void> {
  // Legacy Events have no recipient records and are deliberately never replayed.
  const deliveryCount = await prisma.eventDelivery.count({ where: { eventId } })
  if (deliveryCount === 0) return

  await prisma.eventDelivery.updateMany({
    where: { eventId, state: 'SENDING', leaseExpiresAt: { lt: now } },
    data: { state: 'UNKNOWN', leaseToken: null, leaseExpiresAt: null, lastError: 'delivery_lease_expired_outcome_unknown' },
  })

  for (;;) {
    const candidate = await prisma.eventDelivery.findFirst({
      where: { eventId, state: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, recipient: true },
    })
    if (!candidate) break
    const leaseToken = randomUUID()
    const claimed = await prisma.eventDelivery.updateMany({
      where: { id: candidate.id, state: 'PENDING' },
      data: {
        state: 'SENDING',
        leaseToken,
        leaseExpiresAt: new Date(now.getTime() + EXPIRY_DELIVERY_LEASE_MS),
        attemptStartedAt: now,
        attemptCount: { increment: 1 },
      },
    })
    if (!claimed.count) continue
    await prisma.event.update({ where: { id: eventId }, data: { state: 'SENDING' } })
    await deliverExpiryRecipient({
      requestId,
      deliveryId: candidate.id,
      recipient: candidate.recipient as ExpiryRecipient,
      leaseToken,
    })
  }
  await reconcileExpiryEventState(eventId)
}

export async function processZoomPaymentLifecycleNotifications(
  now = new Date(),
): Promise<void> {
  // Retry EXPIRED delivery until it is durably marked DELIVERED.
  const expired = await prisma.zoomCommerceRequest.findMany({
    where: {
      kind: 'INDIVIDUAL',
      status: 'EXPIRED',
      approvedAt: { not: null },
    },
    select: { id: true, requesterUserId: true },
    take: 200,
  })

  for (const request of expired) {
    const eventId = `zoom-commerce-expired:${request.id}`

    let existing = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, state: true },
    })

    if (existing?.state === 'DELIVERED') continue

    if (!existing) {
      existing = await prisma.event.create({
        data: {
          id: eventId,
          userId: request.requesterUserId,
          type: 'ZOOM_COMMERCE_EXPIRED',
          source: 'scheduler',
          state: 'PENDING',
          payload: {
            requestId: request.id,
          },
          deliveries: { create: expiryRecipients.map((recipient) => ({ recipient })) },
        },
      }).catch(async () => prisma.event.findUnique({ where: { id: eventId }, select: { id: true, state: true } }))
    }

    if (existing) await processFutureExpiryEvent(existing.id, request.id, now)
  }
}


export async function notifyCommerceExpired(requestId: string) {
  const request = await requestContext(requestId)
  if (!request || request.kind !== 'INDIVIDUAL' || request.status !== 'EXPIRED') return

  const userChatId =
    request.requester.telegramChatId
    ?? request.requester.telegramLinks[0]?.chatId
    ?? null

  const userCalendarUrl = buildZoomCalendarUrl()

  if (userChatId) {
    await sendUserTelegramMessage(
      String(userChatId),
      [
        commerceTypeLabel(request),
        `📅 ${formatCommerceDate(request.scheduledAt)}`,
        `🆔 Запит ${shortRequestReference(request.id)}`,
        '',
        telegramContentRegistry.zoomCommerce.expirationBody,
        '',
        'Якщо хочеш записатися — обери новий зручний час.',
      ].join('\n'),
      {
        reply_markup: {
          inline_keyboard: [
            [{
              text: telegramContentRegistry.zoomCommerce.expirationChooseTimeCta,
              web_app: { url: userCalendarUrl },
            }],
            [{
              text: telegramContentRegistry.zoomCommerce.paymentSupportCta,
              callback_data: 'user_home:support',
            }],
          ],
        },
      },
    )
  }

  const topic = request.zoomSession?.topic?.trim() || '—'

  await sendOpsTelegramMessage(
    [
      '❌ ЧАС ОПЛАТИ ВИЧЕРПАНО',
      '',
      commerceTypeLabel(request),
      `👤 ${requesterName(request)}`,
      `📅 ${formatCommerceDate(request.scheduledAt)}`,
      `🧾 Запит ${request.id}`,
      `💬 ${topic}`,
      `💳 ${commercePriceLabel(request)}`,
      '',
      '❌ Статус: Не оплачено · слот звільнено',
    ].join('\n'),
    undefined,
    {
      messageType: 'zoom_commerce_expired',
      source: 'notifyCommerceExpired',
    },
  )

  const coach = await prisma.user.findFirst({
    where: {
      expertId: request.expertId,
      deletedAt: null,
    },
    select: {
      telegramChatId: true,
      telegramLinks: {
        select: { chatId: true },
        take: 1,
      },
    },
  })

  const coachTelegramId =
    coach?.telegramChatId
    ?? coach?.telegramLinks[0]?.chatId
    ?? null

  if (coachTelegramId) {
    await sendDedupedTelegramMessage(
      String(coachTelegramId),
      [
        '❌ СЛОТ ЗВІЛЬНЕНО',
        '',
        commerceTypeLabel(request),
        `👤 ${requesterName(request)}`,
        `📅 ${formatCommerceDate(request.scheduledAt)}`,
        `🆔 Запит ${shortRequestReference(request.id)}`,
        `💬 ${topic}`,
        '',
        'Статус: Час оплати вичерпано — слот звільнено.',
      ].join('\n'),
      undefined,
      coachBot,
    )
  }
}
