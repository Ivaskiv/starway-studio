import type { Context } from 'telegraf'

import { postAIChat } from '../api/client.js'
import { openAppKeyboard } from '../keyboards.js'

export async function handleChat(ctx: Context, message: string) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    await ctx.sendChatAction('typing')
    const result = await postAIChat(chatId, message)
    await ctx.reply(result.mentorMessage.content, {
      reply_markup: openAppKeyboard().reply_markup,
    })
  } catch (error) {
    const text = error instanceof Error ? error.message : 'Не вдалося отримати відповідь асистента.'
    await ctx.reply(`Асистент зараз недоступний.\n${text}`, {
      reply_markup: openAppKeyboard().reply_markup,
    })
  }
}

