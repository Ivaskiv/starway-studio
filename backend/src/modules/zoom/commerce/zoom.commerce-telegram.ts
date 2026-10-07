import type { Context } from 'telegraf'
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

const dialogueType = 'ZOOM_COMMERCE_DIALOGUE'

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
  const time = value.toLocaleTimeString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} · ${time}`
}

function formatPaymentDeadline(value: Date): string {
  return value.toLocaleTimeString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
  })
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
          '✅ СЕСІЮ ПІДТВЕРДЖЕНО',
          '',
          'Коуч підтвердив твій запис.',
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
          '✅ ЗАПИТ ПІДТВЕРДЖЕНО',
          '',
          `👤 ${requesterName(request)}`,
          `📅 ${formatCommerceDate(request.scheduledAt)}`,
          ...(request.zoomSession?.topic ? [`💬 ${request.zoomSession.topic}`] : []),
          `💳 ${commercePriceLabel(request)}`,
          '',
          '🕒 Статус: Очікує оплату',
        ].join('\n'),
      )
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
          '✅ ОПЛАТУ ПІДТВЕРДЖЕНО',
          '',
          'Твоя індивідуальна Zoom-сесія оплачена.',
          '',
          `📅 ${formatCommerceDate(request.scheduledAt)}`,
          ...(meaningfulQuestion ? [`💬 ${meaningfulQuestion}`] : []),
          '',
          'Запис підтверджено.',
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
        'Статус: PAID',
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



type PaymentNudgeKind =
  | 'INDIVIDUAL_MID_WINDOW'
  | 'INDIVIDUAL_DEADLINE_MINUS_10M'

export function resolvePaymentNudges(input: {
  approvedAt: Date
  deadline: Date
}): Array<{
  kind: PaymentNudgeKind
  dueAt: Date
  text: string
}> {
  const MINUTE = 60 * 1000
  const deadlineLabel = formatPaymentDeadline(input.deadline)
  const midWindowDueAt = new Date(
    input.approvedAt.getTime() + (input.deadline.getTime() - input.approvedAt.getTime()) / 2,
  )
  const deadlineMinusTenMinutes = new Date(input.deadline.getTime() - 10 * MINUTE)
  const nudges: Array<{ kind: PaymentNudgeKind; dueAt: Date; text: string }> = []

  if (
    midWindowDueAt > input.approvedAt
    && Math.abs(midWindowDueAt.getTime() - deadlineMinusTenMinutes.getTime()) >= MINUTE
  ) {
    nudges.push({
      kind: 'INDIVIDUAL_MID_WINDOW',
      dueAt: midWindowDueAt,
      text: [
        'Оплата сесії ще не завершена.',
        `Заверши оплату до ${deadlineLabel}.`,
      ].join('\n'),
    })
  }

  if (deadlineMinusTenMinutes > input.approvedAt) {
    nudges.push({
      kind: 'INDIVIDUAL_DEADLINE_MINUS_10M',
      dueAt: deadlineMinusTenMinutes,
      text: [
        'До завершення оплати залишилось 10 хвилин.',
        `Заверши оплату до ${deadlineLabel}.`,
        'Після дедлайну слот буде звільнено.',
      ].join('\n'),
    })
  }

  return nudges
}

async function sendPaymentNudgeOnce(input: {
  requestId: string
  requesterUserId: string
  kind: PaymentNudgeKind
  now: Date
}): Promise<void> {
  const eventId =
    `zoom-payment-nudge:${input.requestId}:${input.kind}`

  const existing = await prisma.event.findUnique({
    where: { id: eventId },
    select: { state: true },
  })

  if (existing?.state === 'DELIVERED') return

  if (!existing) {
    await prisma.event.create({
      data: {
        id: eventId,
        userId: input.requesterUserId,
        type: 'ZOOM_PAYMENT_NUDGE',
        source: 'scheduler',
        state: 'PENDING',
        payload: {
          requestId: input.requestId,
          kind: input.kind,
        },
      },
    }).catch(() => undefined)
  }

  const claimed = await prisma.event.updateMany({
    where: {
      id: eventId,
      state: { in: ['PENDING', 'FAILED'] },
    },
    data: { state: 'SENDING' },
  })

  if (!claimed.count) return

  try {
    const request = await requestContext(input.requestId)
    if (
      !request
      || request.kind !== 'INDIVIDUAL'
      || request.status !== 'APPROVED_PENDING_PAYMENT'
      || !request.approvedAt
    ) {
      await prisma.event.update({ where: { id: eventId }, data: { state: 'FAILED' } })
      return
    }

    const deadline = resolveIndividualPaymentDeadline({
      approvedAt: request.approvedAt,
      scheduledAt: request.scheduledAt,
    })
    const nudge = resolvePaymentNudges({
      approvedAt: request.approvedAt,
      deadline,
    }).find((candidate) => candidate.kind === input.kind)
    const chatId = request.requester.telegramChatId ?? request.requester.telegramLinks[0]?.chatId
    const checkoutUrl = input.now < deadline
      ? await getCommerceCheckoutUrl(request.id, request.requesterUserId)
      : null
    if (!nudge || nudge.dueAt > input.now || !chatId || !checkoutUrl) {
      await prisma.event.update({ where: { id: eventId }, data: { state: 'FAILED' } })
      return
    }

    await sendUserTelegramMessage(
      String(chatId),
      nudge.text,
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '💳 ОПЛАТИТИ СЕСІЮ',
              url: checkoutUrl,
            },
          ]],
        },
      },
    )

    await prisma.event.update({
      where: { id: eventId },
      data: { state: 'DELIVERED' },
    })
  } catch (error) {
    await prisma.event.update({
      where: { id: eventId },
      data: { state: 'FAILED' },
    }).catch(() => undefined)

    throw error
  }
}

export async function processZoomPaymentLifecycleNotifications(
  now = new Date(),
): Promise<void> {
  const pending = await prisma.zoomCommerceRequest.findMany({
    where: {
      kind: 'INDIVIDUAL',
      status: 'APPROVED_PENDING_PAYMENT',
      approvedAt: { not: null },
      scheduledAt: { gt: now },
    },
    include: {
      requester: {
        select: {
          telegramChatId: true,
          telegramLinks: {
            select: { chatId: true },
            take: 1,
          },
        },
      },
    },
  })

  for (const request of pending) {
    if (!request.approvedAt) continue

    const deadline = resolveIndividualPaymentDeadline({
      approvedAt: request.approvedAt,
      scheduledAt: request.scheduledAt,
    })

    if (now >= deadline) continue

    const nudges = resolvePaymentNudges({
      approvedAt: request.approvedAt,
      deadline,
    })

    for (const nudge of nudges) {
      if (nudge.dueAt > now) continue
      if (nudge.dueAt >= deadline) continue

      await sendPaymentNudgeOnce({
        requestId: request.id,
        requesterUserId: request.requesterUserId,
        kind: nudge.kind,
        now,
      }).catch((error) => {
        console.error('[zoom/payment-nudge] delivery failed', {
          requestId: request.id,
          kind: nudge.kind,
          error: error instanceof Error
            ? error.message
            : String(error),
        })
      })
    }
  }

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

    const existing = await prisma.event.findUnique({
      where: { id: eventId },
      select: { state: true },
    })

    if (existing?.state === 'DELIVERED') continue

    if (!existing) {
      await prisma.event.create({
        data: {
          id: eventId,
          userId: request.requesterUserId,
          type: 'ZOOM_COMMERCE_EXPIRED',
          source: 'scheduler',
          state: 'PENDING',
          payload: {
            requestId: request.id,
          },
        },
      }).catch(() => undefined)
    }

    const claimed = await prisma.event.updateMany({
      where: {
        id: eventId,
        state: { in: ['PENDING', 'FAILED'] },
      },
      data: { state: 'SENDING' },
    })

    if (!claimed.count) continue

    try {
      await notifyCommerceExpired(request.id)

      await prisma.event.update({
        where: { id: eventId },
        data: { state: 'DELIVERED' },
      })
    } catch (error) {
      await prisma.event.update({
        where: { id: eventId },
        data: { state: 'FAILED' },
      }).catch(() => undefined)

      console.error('[zoom/expired] delivery failed', {
        requestId: request.id,
        error: error instanceof Error
          ? error.message
          : String(error),
      })
    }
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
        'Час на оплату завершився. Слот звільнено.',
        '',
        'Якщо хочеш записатися — обери новий зручний час.',
      ].join('\n'),
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '📅 ВІДКРИТИ КАЛЕНДАР',
              web_app: { url: userCalendarUrl },
            },
          ]],
        },
      },
    )
  }

  const topic = request.zoomSession?.topic?.trim() || '—'

  await sendOpsTelegramMessage(
    [
      '❌ ЧАС ОПЛАТИ ВИЧЕРПАНО',
      '',
      `👤 ${requesterName(request)}`,
      `📅 ${formatCommerceDate(request.scheduledAt)}`,
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
        `👤 ${requesterName(request)}`,
        `📅 ${formatCommerceDate(request.scheduledAt)}`,
        `💬 ${topic}`,
        '',
        'Користувач не завершив оплату.',
        'Цей час знову доступний.',
      ].join('\n'),
      undefined,
      coachBot,
    )
  }
}
