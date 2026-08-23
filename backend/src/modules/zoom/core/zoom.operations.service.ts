import type { Telegraf } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { sendOpsTelegramMessage } from '../../../lib/telegram.js'
import { sendTelegramMessage } from '../../../lib/telegram/messageFormatter.js'
import type { ZoomSession } from '../types.js'
import { buildZoomCalendarUrl } from '../urls.js'
import { syncChannelPost } from '../notifications/zoom.channel.service.js'

function resolveZoomCalendarUrl(params?: { intent?: string | null; sessionId?: string | null }): string { return buildZoomCalendarUrl(params) }
function canUseTelegramWebAppButton(url: string | null | undefined): boolean { return Boolean(url && url.startsWith('https://') && !url.includes('localhost') && !url.includes('127.0.0.1')) }

type ZoomOperation = 'create' | 'update' | 'cancel' | 'book' | 'unbook' | 'swap_accept' | 'swap_decline'
type ScheduleEventType = 'UPDATE' | 'CANCEL' | 'SWAP' | 'PAID_BOOKING' | 'CREATE'
interface ScheduleEventPayload { eventType: ScheduleEventType; sessionId?: string; sessionTitle?: string; affectedUserIds: string[]; coachMetadata: Record<string, unknown> }
function getSafeName(firstName?: string | null): string { if (!firstName) return ''; const trimmed=firstName.replace(/[<>{}\[\]]/g,'' ).replace(/\s+/g,' ').trim().slice(0,40); if (!trimmed) return ''; const lowered=trimmed.toLowerCase(); if (new Set(['undefined','null','user','test','admin','bot','учень','coach']).has(lowered) || lowered.startsWith('telegram-guest') || /^\d+$/.test(trimmed) || trimmed.length<2) return ''; return trimmed }
function isGroupPracticeRequest(requests: unknown): boolean { return Boolean(requests && !Array.isArray(requests) && typeof requests === 'object' && (requests as Record<string, unknown>).type === 'group_practice') }
async function getSessionAttendeeUserIds(sessionId: string): Promise<string[]> { const rows=await prisma.zoomSessionAttendee.findMany({where:{sessionId},select:{userId:true}}); return rows.map((row)=>row.userId) }
async function notifyCoach(expertId: string | null | undefined, details: { swapId: string }): Promise<void> { if (!expertId) return; const expertUser=await prisma.user.findFirst({where:{expertId},select:{telegramChatId:true}}); if (!expertUser?.telegramChatId) return; const { sendDedupedTelegramMessage }=await import('../../../lib/telegram.js'); await sendDedupedTelegramMessage(expertUser.telegramChatId, `💱 Відбувся обмін слотами. Swap #${details.swapId}`).catch(()=>undefined) }

export async function notifyAffectedUsers(
  telegramBot: Telegraf,
  operation: ZoomOperation,
  session: ZoomSession,
  userIds: string[]
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

  const messageByOperation: Record<
    ZoomOperation,
    (greeting: string) => string
  > = {
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

  const zoomUrl = resolveZoomCalendarUrl()
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
      await sendTelegramMessage(telegramBot, chatId, text, {
        replyMarkup: calendarButton
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
  payload: ScheduleEventPayload
): Promise<void> {
  const { eventType, affectedUserIds, sessionTitle, coachMetadata } = payload
  const zoomUrl = resolveZoomCalendarUrl()
  const baseUrl = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
  const bookingUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/zoom/booking`
    : null

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
        ? canUseTelegramWebAppButton(zoomUrl)
          ? { text: 'Відкрити календар зустрічей', web_app: { url: zoomUrl } }
          : { text: 'Відкрити календар зустрічей', url: zoomUrl }
        : null
      const bookBtn = bookingUrl
        ? canUseTelegramWebAppButton(bookingUrl)
          ? { text: 'Забронювати новий слот', web_app: { url: bookingUrl } }
          : { text: 'Забронювати новий слот', url: bookingUrl }
        : null

      if (eventType === 'UPDATE') {
        text =
          `${greeting}оновлено графік запланованих сесій.\n\n` +
          `Назва зустрічі: ${sessionTitle ?? 'Zoom-практика'}\n` +
          `Новий час: ${String(coachMetadata.newDateTimeFormatted ?? 'оновлено')}\n\n` +
          'Зміни автоматично внесено у персональний додаток.'
        if (zoomBtn) buttons = [[zoomBtn]]
      } else if (eventType === 'CANCEL') {
        text =
          `${greeting}індивідуальну консультацію (${String(coachMetadata.oldDateTimeFormatted ?? '—')}) скасовано.\n\n` +
          'Для вибору нового вікна скористайтеся сервісом бронювання.'
        if (bookBtn) buttons = [[bookBtn]]
      } else if (eventType === 'PAID_BOOKING') {
        text =
          `${greeting}запис на консультацію підтверджено.\n\n` +
          `Назва зустрічі: ${sessionTitle ?? 'Zoom-консультація'}\n` +
          `Час: ${String(coachMetadata.bookedDateTimeFormatted ?? '—')}`
        if (zoomBtn) buttons = [[zoomBtn]]
      }

      if (!text) continue

      try {
        await sendTelegramMessage(telegramBot, tgId, text, {
          replyMarkup:
            buttons.length > 0
              ? ({ inline_keyboard: buttons } as any)
              : undefined,
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
      {
        userId: user1Id,
        newTime: String(coachMetadata.newTime1 ?? 'оновлено'),
      },
      {
        userId: user2Id,
        newTime: String(coachMetadata.newTime2 ?? 'оновлено'),
      },
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
      const tgId =
        user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
      if (!tgId) continue
      const safeName = getSafeName(user?.firstName)
      const greeting = safeName ? `${safeName}, ` : ''
      const zoomBtn = zoomUrl
        ? canUseTelegramWebAppButton(zoomUrl)
          ? { text: 'Переглянути оновлений розклад', web_app: { url: zoomUrl } }
          : { text: 'Переглянути оновлений розклад', url: zoomUrl }
        : null
      try {
        await sendTelegramMessage(
          telegramBot,
          tgId,
          `${greeting}обмін слотом підтверджено.\n\nНовий час консультації: ${swapUser.newTime}\n\nРозклад оновлено автоматично.`,
          {
            replyMarkup: zoomBtn
              ? { inline_keyboard: [[zoomBtn]] }
              : undefined,
          }
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
  const panelUrl = panelBase
    ? `${panelBase.replace(/\/$/, '')}/app/dashboard/zoom`
    : null

  void sendOpsTelegramMessage(
    report,
    panelUrl
      ? {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Панель керування розкладом', url: panelUrl }],
            ],
          },
        }
      : undefined
  ).catch((err) => console.error('[coach feed]', err))
}

export async function afterZoomOperation(
  telegramBot: Telegraf,
  params: {
    operation: ZoomOperation
    sessionId: string
    affectedUserIds: string[]
    coachNotify?: boolean
  }
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
      console.error('[afterZoomOp] syncChannelPost:', err)
    )
  }

  const affectedUserIds =
    params.affectedUserIds.length > 0
      ? params.affectedUserIds
      : await getSessionAttendeeUserIds(sessionId)

  const shouldNotifyAffected = !(operation === 'create' && isGroup)

  if (shouldNotifyAffected && affectedUserIds.length > 0) {
    void notifyAffectedUsers(
      telegramBot,
      operation,
      session,
      affectedUserIds
    ).catch((err) => console.error('[afterZoomOp] notifyAffectedUsers:', err))
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
  }).catch((err) =>
    console.error('[afterZoomOp] processScheduleNotification:', err)
  )




  if (params.coachNotify) {
    void notifyCoach(session.expertId, {
      swapId: `${operation}:${sessionId}`,
    }).catch((err) => console.error('[afterZoomOp] notifyCoach:', err))
  }
}
