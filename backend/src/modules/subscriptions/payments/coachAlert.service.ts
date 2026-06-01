import type { Context, Telegraf } from 'telegraf'

interface AlertParams {
  bot: Telegraf<Context>
  coachChatId: string
  userId: string
  orderReference: string
  amount: number
  reason: string
  scenario: 'B' | 'C' | 'E'
}

const SCENARIO_LABELS: Record<AlertParams['scenario'], string> = {
  B: '❌ Оплата Declined',
  C: '⚠️ Webhook не розпарсився',
  E: '🆘 Юзер повідомив про проблему',
}

export async function alertCoachAboutPaymentIssue(params: AlertParams): Promise<void> {
  const text = [
    SCENARIO_LABELS[params.scenario],
    '',
    `👤 <code>${params.userId}</code>`,
    `📋 <code>${params.orderReference}</code>`,
    `💰 ${params.amount} грн`,
    `❗ ${params.reason}`,
    `📌 Сценарій: ${params.scenario}`,
    '',
    'Перевір WayForPay кабінет і натисни:',
  ].join('\n')

  await params.bot.telegram.sendMessage(params.coachChatId, text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        {
          text: '✅ Оплата є — відкрити ФОКУС',
          callback_data: `admin:grant_focus:${params.userId}:${params.orderReference}`,
        },
        {
          text: '❌ Оплати немає',
          callback_data: `admin:deny_focus:${params.userId}`,
        },
      ]],
    },
  })
}
