import type { Context } from 'telegraf'
import { Markup } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { generateSessionsFromAvailability } from '../../../modules/zoom/booking/zoom.availability.service.js'
import { resolveCoachUserId } from './access.js'
import { buildCoachMainMenuReplyMarkup } from './menu.js'

export async function showCoachNewZoomPrompt(ctx: Context): Promise<void> {
  const coachUserId = await resolveCoachUserId(ctx)

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
    },
  })

  if (!nextSession) {
    await ctx.reply(
      'Не вдалося створити наступну Zoom-сесію. Перевір розклад коуча.'
    )
    return
  }

  const dateLabel = nextSession.scheduledAt.toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  await ctx.reply(
    [
      '🎙️ Наступний Zoom',
      '',
      nextSession.topic,
      dateLabel,
      '',
      `sessionId: ${nextSession.id}`,
      '',
      'Сесія активна для запису.',
    ].join('\n'),
    {
      ...buildCoachMainMenuReplyMarkup(),
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            'Підтвердити наступний Zoom',
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
      requests: true,
    },
  })

  if (!session || session.status !== 'SCHEDULED') {
    await ctx.answerCbQuery('Сесія недоступна').catch(() => undefined)
    return
  }

  const bookingClosesAt = new Date(
    session.scheduledAt.getTime() - 60 * 60 * 1000
  )

  const bookingOpensAt = new Date(
    session.scheduledAt.getTime() - (6 * 24 + 23) * 60 * 60 * 1000
  )

  const currentRequests =
    session.requests &&
    typeof session.requests === 'object' &&
    !Array.isArray(session.requests)
      ? (session.requests as Record<string, unknown>)
      : {}

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

  await ctx.answerCbQuery('Zoom підтверджено').catch(() => undefined)

  await ctx.reply(
    [
      '✅ Zoom підтверджено',
      '',
      `Запис відкритий: ${bookingOpensAt.toLocaleString('uk-UA', {
        timeZone: 'Europe/Kyiv',
      })}`,
      `Запис закривається: ${bookingClosesAt.toLocaleString('uk-UA', {
        timeZone: 'Europe/Kyiv',
      })}`,
    ].join('\n')
  )
}
