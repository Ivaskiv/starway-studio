import type { Context, MiddlewareFn } from 'telegraf'

import { prisma } from '../db/client.js'

export const coachOnly: MiddlewareFn<Context> = async (ctx, next) => {
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : ''
  if (!telegramUserId) return

  const coach = await prisma.user.findUnique({
    where: { telegramUserId },
    select: { id: true, role: true },
  })

  if (!coach) return
  if (coach.role !== 'EXPERT' && coach.role !== 'SUPERADMIN') return

  await next()
}
