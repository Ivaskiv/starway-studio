import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { isProductionRuntime } from '../../../modules/telegram-mentor/runtime/botConfig.js'

type CoachRole = 'ADMIN' | 'EXPERT' | 'SUPERADMIN'

type CoachLinkedUser = {
  id: string
  role: string
  activeRole: string | null
  expertId: string | null
}

function readCoachTelegramAccessId(): string {
  return String(
    process.env.COACH_TELEGRAM_ID ??
      process.env.TEST_COACH_MENTOR_TELEGRAM_ID ??
      ''
  ).trim()
}

function isCoachRole(role: string | null | undefined): role is CoachRole {
  return role === 'ADMIN' || role === 'EXPERT' || role === 'SUPERADMIN'
}

function resolveEffectiveCoachRole(user: Pick<CoachLinkedUser, 'role' | 'activeRole'>): CoachRole | null {
  const candidate = isProductionRuntime()
    ? user.role
    : (user.activeRole ?? user.role)

  return isCoachRole(candidate) ? candidate : null
}

export async function resolveLinkedCoachUserByTelegramId(
  telegramUserId: string,
): Promise<CoachLinkedUser | null> {
  return prisma.user.findFirst({
    where: {
      OR: [{ telegramUserId }, { telegramChatId: telegramUserId }],
    },
    select: {
      id: true,
      role: true,
      activeRole: true,
      expertId: true,
    },
  })
}

export async function resolveCoachAccessProfileByTelegramId(
  telegramUserId: string,
): Promise<{ id: string; role: CoachRole; expertId: string | null } | null> {
  const linkedUser = await resolveLinkedCoachUserByTelegramId(telegramUserId)
  const privilegedTelegramId = readCoachTelegramAccessId()

  if (linkedUser) {
    const effectiveRole = resolveEffectiveCoachRole(linkedUser)
    if (!effectiveRole) return null

    return {
      id: linkedUser.id,
      role: effectiveRole,
      expertId: linkedUser.expertId ?? null,
    }
  }

  if (privilegedTelegramId !== telegramUserId) {
    return null
  }

  const fallbackCoach = await prisma.user.findFirst({
    where: {
      OR: [{ role: 'SUPERADMIN' }, { role: 'EXPERT' }],
    },
    orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, role: true, expertId: true },
  })

  if (!fallbackCoach || !isCoachRole(fallbackCoach.role)) {
    return null
  }

  return {
    id: fallbackCoach.id,
    role: fallbackCoach.role,
    expertId: fallbackCoach.expertId ?? null,
  }
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
  return (await resolveCoachAccessProfileByTelegramId(tgId)) !== null
}

export async function resolveCoachUserId(ctx: Context): Promise<string | null> {
  const tgId = ctx.from?.id?.toString()
  if (!tgId) return null
  return (await resolveCoachAccessProfileByTelegramId(tgId))?.id ?? null
}
