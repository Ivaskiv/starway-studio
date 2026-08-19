import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'

function readCoachTelegramAccessId(): string {
  return String(
    process.env.COACH_TELEGRAM_ID ??
      process.env.TEST_COACH_MENTOR_TELEGRAM_ID ??
      ''
  ).trim()
}

export async function checkCoachAccess(ctx: Context): Promise<boolean> {
  if (ctx.chat?.type && ctx.chat.type !== 'private') {
    const chatId = String(ctx.chat?.id ?? '').trim()
    const opsChatId = String(
      process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? ''
    ).trim()
    if (!chatId || !opsChatId || chatId !== opsChatId) {
      return false
    }
  }
  return checkCoachRole(ctx)
}

export function isStarwayOpsChat(ctx: Context): boolean {
  const chatId = String(ctx.chat?.id ?? '').trim()
  const opsChatId = String(
    process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? ''
  ).trim()
  return Boolean(chatId && opsChatId && chatId === opsChatId)
}

async function checkCoachRole(ctx: Context): Promise<boolean> {
  const tgId = ctx.from?.id?.toString()
  if (!tgId) return false
  if (readCoachTelegramAccessId() === tgId) return true

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ telegramUserId: tgId }, { telegramChatId: tgId }],
    },
    select: { role: true },
  })

  return user?.role === 'EXPERT' || user?.role === 'SUPERADMIN'
}

export async function resolveCoachUserId(ctx: Context): Promise<string | null> {
  const tgId = ctx.from?.id?.toString()
  if (!tgId) return null

  const privilegedTelegramId = readCoachTelegramAccessId()

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ telegramUserId: tgId }, { telegramChatId: tgId }],
    },
    select: { id: true },
  })

  if (!user && privilegedTelegramId === tgId) {
    const fallbackCoach = await prisma.user.findFirst({
      where: {
        OR: [{ role: 'SUPERADMIN' }, { role: 'EXPERT' }],
      },
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    })
    return fallbackCoach?.id ?? null
  }

  return user?.id ?? null
}
