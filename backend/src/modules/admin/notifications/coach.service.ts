import type { Telegraf } from 'telegraf'
import { coachBotContent } from '../../../bot/content/coachBot.content.js'
import { sendTelegramMessage } from '../../../lib/telegram/messageFormatter.js'

export async function notifyCoachAboutFailedPayment(params: {
  coachBot: Telegraf
  coachChatId: string
  userId: string
  userTelegramId?: string
  orderReference: string
  amount: number
  reason: string
}): Promise<void> {
  const { coachBot, coachChatId, userId, userTelegramId, orderReference, amount, reason } = params

  const text = [
    coachBotContent.paymentAdmin.paymentAttentionTitle,
    '',
    `👤 userId: <code>${userId}</code>`,
    userTelegramId ? `📱 tg: <code>${userTelegramId}</code>` : null,
    `📋 Order: <code>${orderReference}</code>`,
    `💰 Сума: ${amount} грн`,
    `❌ Причина: ${reason}`,
    '',
    coachBotContent.paymentAdmin.paymentAttentionPrompt,
  ].filter(Boolean).join('\n')

  console.info(
    `[OPS_ROUTE_DEBUG] messageType=payment_attention_required chatId=${coachChatId} source=notifyCoachAboutFailedPayment bot=coachBot`,
  )
  await sendTelegramMessage(
    coachBot,
    coachChatId,
    {
      text,
      parseMode: 'HTML',
    },
    {
      replyMarkup: {
        inline_keyboard: [[
          {
            text: coachBotContent.paymentAdmin.paymentAttentionOpen,
            callback_data: `admin:grant_focus:${userId}:${orderReference}`,
          },
          {
            text: coachBotContent.paymentAdmin.paymentAttentionDeny,
            callback_data: `admin:deny_focus:${userId}`,
          },
        ]],
      },
    },
  ).then(() => {
    console.info(
      `[OPS_ROUTE_OK] messageType=payment_attention_required chatId=${coachChatId} source=notifyCoachAboutFailedPayment bot=coachBot`,
    )
  }).catch((error) => {
    console.error(
      `[OPS_ROUTE_ERROR] messageType=payment_attention_required chatId=${coachChatId} source=notifyCoachAboutFailedPayment bot=coachBot`,
      error,
    )
    throw error
  })
}
