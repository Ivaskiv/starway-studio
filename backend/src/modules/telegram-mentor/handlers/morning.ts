import type { Context } from 'telegraf'

import { openAppKeyboard } from '../keyboards.js'
import { postMorningAction } from '../api/client.js'

export async function handleMorning(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    const result = await postMorningAction(chatId)
    await ctx.reply(`🌅 Ранкова сесія\n\n${result.text}`, {
      reply_markup: openAppKeyboard().reply_markup,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося запустити ранкову сесію.'
    await ctx.reply(`Не вдалося запустити ранкову сесію.\n${message}`, {
      reply_markup: openAppKeyboard().reply_markup,
    })
  }
}

export async function handleMorningAnswer(ctx: Context, _answer: string) {
  return handleMorning(ctx)
}

