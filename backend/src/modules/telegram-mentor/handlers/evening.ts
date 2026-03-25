import type { Context } from 'telegraf'

import { postEveningAction } from '../api/client.js'
import { openAppKeyboard } from '../keyboards.js'
import { answerQuestion, startQuestionSession } from './questionFlow.js'

export async function handleEvening(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    await postEveningAction(chatId)
    await startQuestionSession(ctx, 'evening')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося запустити вечірню сесію.'
    await ctx.reply(`Не вдалося запустити вечірню сесію.\n${message}`, {
      reply_markup: openAppKeyboard().reply_markup,
    })
  }
}

export async function handleEveningAnswer(ctx: Context, answer: string) {
  return answerQuestion(ctx, 'evening', answer)
}
