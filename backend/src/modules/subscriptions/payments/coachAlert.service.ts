import type { Context, Telegraf } from 'telegraf'
import { TelegramConversationRenderer } from '@/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js'
import { prisma } from '../../../db/client.js'
import { coachBotContent } from '../../../bot/content/coachBot.content.js'

interface AlertParams {
  bot: Telegraf<Context>
  coachChatId: string
  userId: string
  checkoutToken?: string | null
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

const renderer = new TelegramConversationRenderer()

export async function alertCoachAboutPaymentIssue(params: AlertParams): Promise<void> {
  if (params.checkoutToken) {
    await prisma.checkoutSession.update({
      where: { token: params.checkoutToken },
      data: { paymentIssueReportedAt: new Date() },
    }).catch(() => undefined)
  }

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

  await renderer.renderOutbound({
    chatId: params.coachChatId,
    transportBot: params.bot,
  }, {
    text: null,
    buttons: [],
    cards: [{
      kind: 'message',
      text,
      parseMode: 'HTML',
      buttons: [
        {
          kind: 'callback',
          label: coachBotContent.paymentAdmin.paymentExists,
          value: `admin:grant_focus:${params.checkoutToken ?? 'missing_checkout_token'}`,
        },
        {
          kind: 'callback',
          label: coachBotContent.paymentAdmin.paymentMissing,
          value: `admin:deny_focus:${params.checkoutToken ?? 'missing_checkout_token'}`,
        },
      ],
    }],
    media: [],
    nextActions: [],
    telemetry: {},
    analytics: {},
  })
}
