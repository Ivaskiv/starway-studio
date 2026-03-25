import type { Context } from 'telegraf'

import { postEveningAction } from '../api/client.js'
import { openAppKeyboard } from '../keyboards.js'

export async function handleEvening(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    const result = await postEveningAction(chatId)
    await ctx.reply(`🌙 Вечірня сесія\n\n${result.text}`, {
      reply_markup: openAppKeyboard().reply_markup,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося запустити вечірню сесію.'
    await ctx.reply(`Не вдалося запустити вечірню сесію.\n${message}`, {
      reply_markup: openAppKeyboard().reply_markup,
    })
  }
}

export async function handleEveningAnswer(ctx: Context, _answer: string) {
  return handleEvening(ctx)
}

