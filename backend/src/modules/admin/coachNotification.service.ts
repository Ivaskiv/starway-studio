import type { Telegraf } from 'telegraf'

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
    '⚠️ <b>Оплата потребує уваги</b>',
    '',
    `👤 userId: <code>${userId}</code>`,
    userTelegramId ? `📱 tg: <code>${userTelegramId}</code>` : null,
    `📋 Order: <code>${orderReference}</code>`,
    `💰 Сума: ${amount} грн`,
    `❌ Причина: ${reason}`,
    '',
    'Натисни кнопку щоб відкрити доступ вручну:',
  ].filter(Boolean).join('\n')

  await coachBot.telegram.sendMessage(coachChatId, text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        {
          text: '✅ Відкрити доступ до ФОКУС',
          callback_data: `admin:grant_focus:${userId}:${orderReference}`,
        },
        {
          text: '❌ Відхилити',
          callback_data: `admin:deny_focus:${userId}`,
        },
      ]],
    },
  })
}
