import type { Context, MiddlewareFn } from 'telegraf'

import { prisma } from '../db/client.js'

function readCoachTelegramAccessId(): string {
  return String(
    process.env.COACH_TELEGRAM_ID
    ?? process.env.TEST_COACH_MENTOR_TELEGRAM_ID
    ?? '',
  ).trim()
}

export const coachOnly: MiddlewareFn<Context> = async (ctx, next) => {
  if (ctx.chat?.type && ctx.chat.type !== 'private') return

  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : ''
  if (!telegramUserId) return
  if (readCoachTelegramAccessId() === telegramUserId) {
    await next()
    return
  }

  const coach = await prisma.user.findUnique({
    where: { telegramUserId },
    select: { id: true, role: true },
  })

  if (!coach) return
  if (coach.role !== 'EXPERT' && coach.role !== 'SUPERADMIN') return

  await next()
}
