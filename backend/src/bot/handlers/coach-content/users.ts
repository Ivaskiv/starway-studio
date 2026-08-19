import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import {
  buildExpertScopeWhere,
  coachPanelContent,
  formatUserRow,
  replyOrEditPanelMessage,
  resolveCoachAccess,
} from './shared.js'

export async function handleCoachUsersCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const normalized = payload.trim()
  const searchQuery = normalized.toLowerCase().startsWith('search ')
    ? normalized.slice(7).trim()
    : normalized

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...buildExpertScopeWhere(coach),
      ...(searchQuery
        ? {
            OR: [
              { id: searchQuery },
              { email: { contains: searchQuery, mode: 'insensitive' } },
              { telegramUserId: searchQuery },
              { telegramChatId: searchQuery },
              { telegramUserName: { contains: searchQuery.replace(/^@/, ''), mode: 'insensitive' } },
              { firstName: { contains: searchQuery, mode: 'insensitive' } },
              { lastName: { contains: searchQuery, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      telegramUserId: true,
      telegramChatId: true,
      telegramUserName: true,
      role: true,
      focusPaid: true,
      expertId: true,
      createdAt: true,
    },
  })

  const header = searchQuery
    ? `${coachPanelContent.users.searchHeader}: ${searchQuery}`
    : coachPanelContent.users.listHeader

  if (users.length === 0) {
    await replyOrEditPanelMessage(ctx, [
      `👥 ${coachPanelContent.users.title}`,
      '',
      header,
      '',
      coachPanelContent.users.empty,
      '',
      coachPanelContent.users.usage,
    ].join('\n'))
    return true
  }

  await replyOrEditPanelMessage(ctx, [
    `👥 ${coachPanelContent.users.title}`,
    '',
    header,
    '',
    ...users.map(user => formatUserRow(user)),
  ].join('\n\n'))
  return true
}
