import type { Context } from 'telegraf'

import { postAIChat } from '../api/client.js'
import { getAccessAwareAppReplyMarkupForContext } from './start.js'

export async function handleChat(ctx: Context, message: string) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    await ctx.sendChatAction('typing')
    const result = await postAIChat(chatId, message)
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply(result.mentorMessage.content, {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  } catch (error) {
    const text = error instanceof Error ? error.message : 'Не вдалося отримати відповідь асистента.'
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply(`Асистент зараз недоступний.\n${text}`, {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  }
}
