import type { Context } from 'telegraf'

import { postMorningAction } from '../api/client.js'
import { getAccessAwareAppReplyMarkupForContext } from './start.js'
import { answerQuestion, resumeQuestionSession, startQuestionSession } from './questionFlow.js'
import { renderDecisionUnlessAllowed } from '../services/decisionTransport.service.js'

export async function handleMorning(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    if (await renderDecisionUnlessAllowed(ctx, 'morning_requested', ['show_product', 'resume_session'])) {
      return
    }

    await postMorningAction(chatId)
    await startQuestionSession(ctx, 'morning')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося запустити ранкову сесію.'
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply(`Не вдалося запустити ранкову сесію.\n${message}`, {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  }
}

export async function handleMorningAnswer(ctx: Context, answer: string) {
  return answerQuestion(ctx, 'morning', answer)
}

export { resumeQuestionSession }
