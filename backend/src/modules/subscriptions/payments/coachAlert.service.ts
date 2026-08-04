import type { Context, Telegraf } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { coachBotContent } from '../../../bot/content/coachBot.content.js'
import { sendOpsTelegramMessage } from '../../../lib/telegram.js'

const INACTIVE_CHECKOUT_STATUSES = ['COMPLETED', 'INVALIDATED'] as const

export async function findRelevantFocusCheckoutSession(userId: string): Promise<{
  token: string | null
  orderReference: string | null
  amount: number
  currency: string
  productCode: string | null
} | null> {
  const unresolved = await prisma.checkoutSession.findMany({
    where: {
      userId,
      status: { notIn: [...INACTIVE_CHECKOUT_STATUSES] },
    },
    orderBy: [
      { lastOpenedAt: 'desc' },
      { openedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      token: true,
      orderReference: true,
      amount: true,
      currency: true,
      productCode: true,
      status: true,
      lastOpenedAt: true,
      openedAt: true,
    },
  })

  if (unresolved.length === 1) {
    const [checkout] = unresolved
    return {
      token: checkout.token,
      orderReference: checkout.orderReference,
      amount: checkout.amount,
      currency: checkout.currency,
      productCode: checkout.productCode,
    }
  }

  const openedCheckout = unresolved.find((checkout) => checkout.status === 'OPENED')
  if (openedCheckout) {
    return {
      token: openedCheckout.token,
      orderReference: openedCheckout.orderReference,
      amount: openedCheckout.amount,
      currency: openedCheckout.currency,
      productCode: openedCheckout.productCode,
    }
  }

  return prisma.checkoutSession.findFirst({
    where: {
      userId,
    },
    orderBy: [
      { lastOpenedAt: 'desc' },
      { openedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      token: true,
      orderReference: true,
      amount: true,
      currency: true,
      productCode: true,
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
  currency?: string
  productCode?: string | null
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

  const isTrialZoom = String(params.productCode ?? '').trim().toLowerCase() === 'trial_zoom'
  const productLabel = isTrialZoom ? 'Пробний Zoom — 1 грн' : 'ФОКУС'
  const confirmLabel = isTrialZoom
    ? coachBotContent.paymentAdmin.trialPaymentExists
    : coachBotContent.paymentAdmin.paymentExists
  const confirmAction = isTrialZoom
    ? `admin:grant_trial_zoom:${params.checkoutToken ?? 'missing_checkout_token'}`
    : `admin:grant_focus:${params.checkoutToken ?? 'missing_checkout_token'}`
  const rejectLabel = isTrialZoom
    ? coachBotContent.paymentAdmin.askPaymentDetails
    : coachBotContent.paymentAdmin.paymentMissing
  const rejectAction = isTrialZoom
    ? `admin:ask_payment_details:${params.checkoutToken ?? 'missing_checkout_token'}`
    : `admin:deny_focus:${params.checkoutToken ?? 'missing_checkout_token'}`

  const text = [
    SCENARIO_LABELS[params.scenario],
    '',
    `📦 ${productLabel}`,
    `👤 <code>${params.userId}</code>`,
    `📋 <code>${params.orderReference}</code>`,
    `💰 ${params.amount} ${params.currency ?? 'грн'}`,
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
            text: confirmLabel,
            callback_data: confirmAction,
          },
          {
            text: rejectLabel,
            callback_data: rejectAction,
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
