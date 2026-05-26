import type { Context } from 'telegraf'

import { postEveningAction } from '../api/client.js'
import { getAccessAwareAppReplyMarkupForContext } from './start.js'
import { answerQuestion, startQuestionSession } from './questionFlow.js'
import { renderDecisionUnlessAllowed } from '../services/decisionTransport.service.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'

export async function handleEvening(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    if (await renderDecisionUnlessAllowed(ctx, 'evening_requested', ['show_product', 'resume_session'])) {
      return
    }

    await postEveningAction(chatId)
    await startQuestionSession(ctx, 'evening')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося запустити вечірню сесію.'
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await planMessage(
      ctx,
      'ctx.reply',
      'evening_error',
      `Не вдалося запустити вечірню сесію.\n${message}`,
      replyMarkup,
    )
  }
}

export async function handleEveningAnswer(ctx: Context, answer: string) {
  return answerQuestion(ctx, 'evening', answer)
}
