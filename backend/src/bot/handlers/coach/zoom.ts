import type { Context } from 'telegraf'
import { Markup } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { notificationService } from '../../../services/notifications/NotificationService.js'
import { generateSessionsFromAvailability } from '../../../modules/zoom/booking/zoom.availability.service.js'
import { FOCUS_PRODUCT_CODES } from '../../../modules/subscriptions/payments/focus-access.js'
import { buildZoomCalendarUrl } from '../../../modules/zoom/urls.js'
import {
  extractZoomLinkFromRequests,
  resolveRequestedSessionType,
} from '../../../modules/zoom/shared/zoom.session-selection.js'
import { resolveCoachUserId } from './access.js'
import { buildCoachMainMenuReplyMarkup } from './menu.js'
import { resolveCoachAccess } from '../coach-content/shared.js'

function formatSessionDate(value: Date): string {
  return value.toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  })
}

function formatSessionTime(value: Date): string {
  return value.toLocaleTimeString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCoachSessionTitle(requests: unknown): string {
  const type = resolveRequestedSessionType(requests)

  switch (type) {
    case 'individual':
      return 'Нова індивідуальна Zoom-сесія'
    case 'intensive':
      return 'Новий Zoom-інтенсив'
    case 'battle_review':
      return 'Новий Zoom Battle'
    default:
      return 'Нова групова Zoom-практика'
  }
}

function parseSessionRequests(requests: unknown): Record<string, unknown> {
  if (!requests || typeof requests !== 'object' || Array.isArray(requests)) {
    return {}
  }

  return requests as Record<string, unknown>
}

function isSessionAlreadyOpened(requests: Record<string, unknown>): boolean {
  return typeof requests.coachConfirmedAt === 'string' && requests.coachConfirmedAt.trim().length > 0
}

async function notifyEligibleFocusUsersAboutOpenBooking(session: {
  id: string
  scheduledAt: Date
  topic: string | null
  requests: unknown
}): Promise<void> {
  if (resolveRequestedSessionType(session.requests) !== 'group_practice') {
    return
  }

  const eligibleUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      telegramEnabled: { not: false },
      productSubscriptions: {
        some: {
          status: 'ACTIVE',
          product: {
            is: {
              code: { in: [...FOCUS_PRODUCT_CODES] },
            },
          },
        },
      },
    },
    select: {
      id: true,
    },
  })

  const ctaUrl = buildZoomCalendarUrl({
    intent: 'booking',
    sessionId: session.id,
  })

  await Promise.all(
    eligibleUsers.map((user) =>
      notificationService.sendZoomBookingOpenedNotification({
        userId: user.id,
        sessionId: session.id,
        topic: session.topic ?? 'Zoom-практика',
        scheduledAt: session.scheduledAt,
        ctaUrl,
      }),
    ),
  )
}

export async function showCoachNewZoomPrompt(ctx: Context): Promise<void> {
  const coachUserId = await resolveCoachUserId(ctx)
  const coachAccess = await resolveCoachAccess(ctx)

  if (!coachUserId) {
    await ctx.reply('Не вдалося визначити профіль коуча.')
    return
  }

  const coach = await prisma.user.findUnique({
    where: { id: coachUserId },
    select: { expertId: true },
  })

  const expertId =
    coach?.expertId ??
    (
      await prisma.expert.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
    )?.id ??
    null

  if (!expertId) {
    await ctx.reply('Активний профіль експерта не знайдено.')
    return
  }

  await generateSessionsFromAvailability(expertId, 4)

  const nextSession = await prisma.zoomSession.findFirst({
    where: {
      expertId,
      status: 'SCHEDULED',
      scheduledAt: { gt: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      scheduledAt: true,
      topic: true,
      status: true,
      requests: true,
    },
  })

  if (!nextSession) {
    await ctx.reply(
      'Не вдалося створити наступну Zoom-сесію. Перевір розклад коуча.'
    )
    return
  }

  const zoomLink = extractZoomLinkFromRequests(nextSession.requests)

  await ctx.reply(
    [
      'Новий Zoom',
      '',
      formatCoachSessionTitle(nextSession.requests),
      '',
      `Дата: ${formatSessionDate(nextSession.scheduledAt)}`,
      `Час: ${formatSessionTime(nextSession.scheduledAt)}`,
      `Тема: ${nextSession.topic}`,
      `Zoom-посилання: ${zoomLink ? 'додано' : 'ще не додано'}`,
      '',
      'Нагадування:',
      '2 години — увімкнено',
      '5 хвилин — увімкнено',
    ].join('\n'),
    {
      ...buildCoachMainMenuReplyMarkup(coachAccess?.role ?? 'EXPERT'),
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            'ВІДКРИТИ СЕСІЮ',
            `coach:zoom:confirm:${nextSession.id}`
          ),
        ],
      ]),
    }
  )
}

export async function confirmCoachZoomSession(
  ctx: Context,
  sessionId: string
): Promise<void> {
  const session = await prisma.zoomSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      topic: true,
      requests: true,
    },
  })

  if (!session || session.status !== 'SCHEDULED') {
    await ctx.answerCbQuery('Сесія недоступна').catch(() => undefined)
    return
  }

  const currentRequests = parseSessionRequests(session.requests)
  if (isSessionAlreadyOpened(currentRequests)) {
    await ctx.answerCbQuery('Сесію вже відкрито').catch(() => undefined)
    return
  }

  const bookingClosesAt = new Date(
    session.scheduledAt.getTime() - 60 * 60 * 1000
  )

  const bookingOpensAt = new Date()

  await prisma.zoomSession.update({
    where: { id: session.id },
    data: {
      requests: {
        ...currentRequests,
        bookingOpensAt: bookingOpensAt.toISOString(),
        bookingClosesAt: bookingClosesAt.toISOString(),
        coachConfirmedAt: new Date().toISOString(),
        bookingSource: 'coach',
      },
    },
  })

  await notifyEligibleFocusUsersAboutOpenBooking(session)

  await ctx.answerCbQuery('Сесію відкрито').catch(() => undefined)

  await ctx.reply(
    [
      'Сесію відкрито',
      '',
      session.topic ?? 'Zoom-практика',
      `${formatSessionDate(session.scheduledAt)} · ${formatSessionTime(session.scheduledAt)}`,
      '',
      'Учасники вже можуть записуватися та додавати питання до практики.',
    ].join('\n')
  )
}
