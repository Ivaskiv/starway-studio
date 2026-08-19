import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { sendUserTelegramMessage } from '../../../lib/telegram.js'
import {
  buildExpertScopeWhere,
  coachPanelContent,
  replyOrEditPanelMessage,
  resolveCoachAccess,
  splitPayload,
} from './shared.js'

export async function handleCoachNotifyCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [mode, ...rest] = splitPayload(payload)
  if (!mode) {
    await replyOrEditPanelMessage(ctx, [
      `🔔 ${coachPanelContent.notify.title}`,
      '',
      coachPanelContent.notify.usage,
    ].join('\n'))
    return true
  }
  const normalizedMode = mode.toLowerCase()
  const message = rest.join(' ').trim()

  if (!normalizedMode || (normalizedMode !== 'all' && normalizedMode !== 'user')) {
    await replyOrEditPanelMessage(ctx, [
      `🔔 ${coachPanelContent.notify.title}`,
      '',
      coachPanelContent.notify.usage,
    ].join('\n'))
    return true
  }

  if (!message) {
    await replyOrEditPanelMessage(ctx, coachPanelContent.notify.usage)
    return true
  }

  if (normalizedMode === 'all') {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        telegramEnabled: true,
        telegramChatId: { not: null },
        ...buildExpertScopeWhere(coach),
      },
      select: {
        id: true,
        telegramChatId: true,
      },
    })

    let delivered = 0
    let failed = 0

    for (const user of users) {
      if (!user.telegramChatId) {
        failed += 1
        continue
      }

      const sent = await sendUserTelegramMessage(user.telegramChatId, message).catch(() => false)
      if (sent) {
        delivered += 1
      } else {
        failed += 1
      }
    }

    await replyOrEditPanelMessage(ctx, [
      `🔔 ${coachPanelContent.notify.title}`,
      '',
      coachPanelContent.notify.done,
      `• delivered: ${delivered}`,
      `• failed: ${failed}`,
      `• scope: ${coach.role === 'SUPERADMIN' ? 'all users' : 'expert users'}`,
    ].join('\n'))
    return true
  }

  const [target, ...messageParts] = rest
  const targetMessage = messageParts.join(' ').trim()
  if (!target || !targetMessage) {
    await replyOrEditPanelMessage(ctx, coachPanelContent.notify.usage)
    return true
  }

  const recipient = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      ...buildExpertScopeWhere(coach),
      OR: [
        { id: target },
        { email: { equals: target, mode: 'insensitive' } },
        { telegramUserId: target },
        { telegramChatId: target },
        { telegramUserName: { equals: target.replace(/^@/, ''), mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      email: true,
      telegramChatId: true,
    },
  })

  if (!recipient?.telegramChatId) {
    await replyOrEditPanelMessage(ctx, 'Користувача не знайдено або в нього немає Telegram chatId.')
    return true
  }

  const sent = await sendUserTelegramMessage(recipient.telegramChatId, targetMessage).catch(() => false)
  await replyOrEditPanelMessage(ctx, [
    `🔔 ${coachPanelContent.notify.title}`,
    '',
    sent ? coachPanelContent.notify.done : '❌ Не вдалося надіслати повідомлення.',
    `• target: ${recipient.email}`,
    `• userId: ${recipient.id}`,
  ].join('\n'))
  return true
}
