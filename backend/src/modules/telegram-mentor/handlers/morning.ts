import type { Context } from 'telegraf'

import { openAppKeyboard } from '../keyboards.js'
import { postMorningAction } from '../api/client.js'
import { answerQuestion, resumeQuestionSession, startQuestionSession } from './questionFlow.js'

export async function handleMorning(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    await postMorningAction(chatId)
    await startQuestionSession(ctx, 'morning')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося запустити ранкову сесію.'
    await ctx.reply(`Не вдалося запустити ранкову сесію.\n${message}`, {
      reply_markup: openAppKeyboard().reply_markup,
    })
  }
}

export async function handleMorningAnswer(ctx: Context, answer: string) {
  return answerQuestion(ctx, 'morning', answer)
}

export { resumeQuestionSession }
