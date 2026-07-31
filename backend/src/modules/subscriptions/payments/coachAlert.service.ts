import type { Context, Telegraf } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { coachBotContent } from '../../../bot/content/coachBot.content.js'
import { sendOpsTelegramMessage } from '../../../lib/telegram.js'

const INACTIVE_CHECKOUT_STATUSES = ['COMPLETED', 'INVALIDATED'] as const

export async function findRelevantFocusCheckoutSession(userId: string): Promise<{
  token: string | null
  orderReference: string | null
  amount: number
} | null> {
  const unresolved = await prisma.checkoutSession.findFirst({
    where: {
      userId,
      productCode: { equals: 'focus', mode: 'insensitive' },
      status: { notIn: [...INACTIVE_CHECKOUT_STATUSES] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      token: true,
      orderReference: true,
      amount: true,
    },
  })

  if (unresolved) {
    return unresolved
  }

  return prisma.checkoutSession.findFirst({
    where: {
      userId,
      productCode: { equals: 'focus', mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      token: true,
      orderReference: true,
      amount: true,
    },
  })
}

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

export async function alertCoachAboutPaymentIssue(params: AlertParams): Promise<void> {
  void params.bot
  void params.coachChatId

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

  await sendOpsTelegramMessage(
    text,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          {
            text: coachBotContent.paymentAdmin.paymentExists,
            callback_data: `admin:grant_focus:${params.checkoutToken ?? 'missing_checkout_token'}`,
          },
          {
            text: coachBotContent.paymentAdmin.paymentMissing,
            callback_data: `admin:deny_focus:${params.checkoutToken ?? 'missing_checkout_token'}`,
          },
        ]],
      },
    },
    {
      messageType: 'focus_payment_issue',
      source: 'alertCoachAboutPaymentIssue',
    },
  )
}
