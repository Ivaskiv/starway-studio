import type { Telegraf } from 'telegraf'
import { coachBotContent } from '../../../bot/content/coachBot.content.js'
import { sendTelegramMessage } from '../../../lib/telegram/messageFormatter.js'

function formatKyivDateTime(date: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

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

export async function notifyCoachAboutSuccessfulPayment(params: {
  coachBot: Telegraf
  coachChatId: string
  userId: string
  userLabel?: string | null
  productLabel: string
  planLabel: string
  amount: number
  currency: string
  orderReference: string
  finalExpiresAt: Date
}): Promise<boolean> {
  const text = [
    '✅ Оплату підтверджено',
    '',
    `👤 userId: <code>${params.userId}</code>`,
    params.userLabel ? `🧑 ${params.userLabel}` : null,
    `📦 Продукт: ${params.productLabel}`,
    `Тариф: ${params.planLabel}`,
    `Сума: ${params.amount} ${params.currency}`,
    `Платіж: <code>${params.orderReference}</code>`,
    `Доступ активний до: ${formatKyivDateTime(params.finalExpiresAt)}`,
  ].filter(Boolean).join('\n')

  console.info(
    `[OPS_ROUTE_DEBUG] messageType=payment_success_confirmed chatId=${params.coachChatId} source=notifyCoachAboutSuccessfulPayment bot=coachBot`,
  )

  return sendTelegramMessage(
    params.coachBot,
    params.coachChatId,
    {
      text,
      parseMode: 'HTML',
    },
  ).then(() => {
    console.info(
      `[OPS_ROUTE_OK] messageType=payment_success_confirmed chatId=${params.coachChatId} source=notifyCoachAboutSuccessfulPayment bot=coachBot`,
    )
    return true
  }).catch((error) => {
    console.error(
      `[OPS_ROUTE_ERROR] messageType=payment_success_confirmed chatId=${params.coachChatId} source=notifyCoachAboutSuccessfulPayment bot=coachBot`,
      error,
    )
    return false
  })
}
