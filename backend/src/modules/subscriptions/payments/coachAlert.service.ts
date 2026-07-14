import type { Context, Telegraf } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { coachBotContent } from '../../../bot/content/coachBot.content.js'

interface AlertParams {
  bot: Telegraf<Context>
  coachChatId: string
  userId: string
  checkoutToken: string
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
  await prisma.checkoutSession.update({
    where: { token: params.checkoutToken },
    data: { paymentIssueReportedAt: new Date() },
  }).catch(() => undefined)

  const text = [
    SCENARIO_LABELS[params.scenario],
    '',
    `👤 <code>${params.userId}</code>`,
    `📋 <code>${params.orderReference}</code>`,
    `💰 ${params.amount} грн`,
    `❗ ${params.reason}`,
    `📌 Сценарій: ${params.scenario}`,
    '',
    coachBotContent.paymentAdmin.reviewPrompt,
  ].join('\n')

  await params.bot.telegram.sendMessage(params.coachChatId, text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        {
          text: coachBotContent.paymentAdmin.paymentExists,
          callback_data: `admin:grant_focus:${params.checkoutToken}`,
        },
        {
          text: coachBotContent.paymentAdmin.paymentMissing,
          callback_data: `admin:deny_focus:${params.checkoutToken}`,
        },
      ]],
    },
  })
}
