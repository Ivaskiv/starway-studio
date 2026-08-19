import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import {
  FOCUS_RESEND_MISSING_USER_MSG,
  FOCUS_RESEND_NO_SUB_MSG,
} from '../content/abTest.focus.js'
import {
  escapeHtml,
  formatSubscriptionDate,
  resolveContextUserId,
} from './callback.js'
import { hasActiveFocusSubscription } from '@/modules/subscriptions/payments/focus-access.js'
import { resendFocusAccessTelegramMessage } from '@/modules/subscriptions/payments/callback/notifications.js'
import {
  planAck,
  planMessage,
} from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { updateSession } from '../../../modules/telegram-mentor/session.js'
import { zoomSection } from '../../../modules/telegram-mentor/handlers/abTest.start.js'

export async function resolveFocusShortcutCallback(
  ctx: Context,
  action: string,
  userId: string
): Promise<boolean> {
  const { handleStatus } = await import('../../../modules/telegram-mentor/handlers/status.js')
  const { handleAIMentor } = await import('../../../modules/telegram-mentor/handlers/aiMentor.js')
  const { sendStateMenu } = await import('../../../modules/telegram-mentor/handlers/start.menu.js')
  const { deactivateCallbackMarkup } = await import('./callback.js')

  if (action === 'open_focus_info') {
    return handleAbTestCallback(ctx, AB_TEST_ACTIONS.FOCUS_INFO)
  }

  if (action === 'focus:next_zoom') {
    await deactivateCallbackMarkup(ctx)
    await ctx.answerCbQuery().catch(() => null)
    await handleStatus(ctx)
    return true
  }

  if (action === 'post_zoom:leave_insight') {
    const chatId = String(ctx.chat?.id ?? '').trim()
    await ctx.answerCbQuery().catch(() => null)
    if (!chatId) {
      return true
    }

    await updateSession(
      userId,
      chatId,
      'chat',
      { postZoomInsightAwaiting: true },
      0,
    )

    await ctx.telegram.sendMessage(
      chatId,
      [
        '💭 Напиши одним повідомленням:',
        '',
        '1. Який інсайт був найціннішим?',
        '2. Який один крок зробиш до наступної практики?',
      ].join('\n')
    )
    return true
  }

  if (action === 'post_zoom:absystem_cta') {
    await ctx.answerCbQuery().catch(() => null)
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId) {
      return true
    }

    const payload = await zoomSection(userId)
    await ctx.telegram.sendMessage(chatId, payload.text, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: payload.buttons },
    })
    return true
  }

  if (
    action === 'focus:ai' ||
    action === 'ai_mentor:menu' ||
    action === 'ai_mentor:plan'
  ) {
    await deactivateCallbackMarkup(ctx)
    await ctx.answerCbQuery().catch(() => null)
    await handleAIMentor(ctx)
    return true
  }

  return false
}

async function handleAbTestCallback(
  ctx: Context,
  action: string
): Promise<boolean> {
  const { handleAbTestCallback: importedHandler } = await import('./service.js')
  return importedHandler(ctx, action)
}

export async function renderFocusSubscriptionCard(
  ctx: Context,
  userId: string
): Promise<void> {
  const focusProductId = '68c3e55a-4b70-4680-a26c-15fdd607fd59'
  const productName = 'ФОКУС'
  const productCode = 'focus'
  const currency = 'UAH'
  const [active, subscription, checkout, user] = await Promise.all([
    hasActiveFocusSubscription(userId).catch(() => false),
    prisma.productSubscription
      .findFirst({
        where: {
          userId,
          productId: focusProductId,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          updatedAt: true,
          paidAt: true,
          trialEndsAt: true,
          expiresAt: true,
          focusWelcomedAt: true,
          channelJoinedAt: true,
          manuallyGrantedBy: true,
          manualGrantNote: true,
          paymentIssueCount: true,
          lastPaymentIssueAt: true,
        },
      })
      .catch(() => null),
    prisma.checkoutSession
      .findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
          completedAt: true,
          lastOpenedAt: true,
          paymentIssueReportedAt: true,
        },
      })
      .catch(() => null),
    prisma.user
      .findUnique({
        where: { id: userId },
        select: { email: true },
      })
      .catch(() => null),
  ])

  if (!subscription) {
    await planMessage(
      ctx,
      'ctx.reply',
      'ab_test_subscription_missing',
      [
        '<b>Підписка ФОКУС</b>',
        '',
        'Статус: <code>не знайдено</code>',
        'Ще немає оформленої підписки.',
      ].join('\n'),
      {
        inline_keyboard: [
          [
            {
              text: 'ОПЛАТИТИ ФОКУС',
              callback_data: AB_TEST_ACTIONS.FOCUS_PAY,
            },
          ],
          [{ text: '← МЕНЮ', callback_data: 'ab_test:menu' }],
        ],
      },
      'HTML'
    )
    return
  }

  const statusValue = String(subscription.status ?? '—')
  const activeLabel = active ? 'так' : 'ні'
  const amountLabel =
    subscription.amount !== null && subscription.amount !== undefined
      ? `${subscription.amount} ${currency}`
      : '—'
  const inviteUrl = String(
    process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ?? ''
  ).trim()
  const manualGrantLabel = subscription.manuallyGrantedBy
    ? `🔧 ручна активація: <code>${escapeHtml(subscription.manuallyGrantedBy)}</code>`
    : 'Автоактивація'
  const daysLeft = subscription.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000
        )
      )
    : null
  const manualGrantNoteLabel = subscription.manualGrantNote
    ? `Примітка: ${escapeHtml(subscription.manualGrantNote)}`
    : null
  const lines = [
    '<b>Підписка ФОКУС</b>',
    '',
    `Активний доступ: <b>${activeLabel}</b>`,
    `Статус: <code>${escapeHtml(statusValue)}</code>`,
    `Продукт: <code>${escapeHtml(productName)}</code> (<code>${escapeHtml(productCode)}</code>)`,
    `Сума: <b>${escapeHtml(amountLabel)}</b>`,
    `Оплачено: ${escapeHtml(formatSubscriptionDate(subscription.paidAt))}`,
    `Email: ${user?.email ? escapeHtml(user.email) : '—'}`,
    `Діє до: ${escapeHtml(formatSubscriptionDate(subscription.expiresAt))}`,
    ...(daysLeft !== null ? [`Залишилось: <b>${daysLeft} днів</b>`] : []),
    `Trial до: ${escapeHtml(formatSubscriptionDate(subscription.trialEndsAt))}`,
    `Block 12 надіслано: ${subscription.focusWelcomedAt ? '✅ надіслано' : '❌ не надіслано'}`,
    `Вступ у канал: ${subscription.channelJoinedAt ? '✅ вступив' : '⏳ не вступив'}`,
    `Проблема з оплатою: ${subscription.paymentIssueCount}`,
    `Остання проблема: ${escapeHtml(formatSubscriptionDate(subscription.lastPaymentIssueAt))}`,
    manualGrantLabel,
    ...(manualGrantNoteLabel ? [manualGrantNoteLabel] : []),
    `Оновлено: ${escapeHtml(formatSubscriptionDate(subscription.updatedAt))}`,
  ]

  if (checkout) {
    lines.push(
      '',
      '<b>Остання checkout-сесія</b>',
      `Статус: <code>${escapeHtml(String(checkout.status))}</code>`,
      `Сума: <b>${escapeHtml(`${checkout.amount} ${checkout.currency}`)}</b>`,
      `Створено: ${escapeHtml(formatSubscriptionDate(checkout.createdAt))}`,
      `Відкривали: ${escapeHtml(formatSubscriptionDate(checkout.lastOpenedAt))}`,
      `Завершено: ${escapeHtml(formatSubscriptionDate(checkout.completedAt))}`,
      `Проблема з оплатою: ${checkout.paymentIssueReportedAt ? '✅ зафіксовано' : '❌ немає'}`
    )
  }

  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_subscription_card',
    lines.join('\n'),
    {
      inline_keyboard: [
        ...(inviteUrl
          ? [[{ text: 'ПОСИЛАННЯ НА КАНАЛ', url: inviteUrl }]]
          : []),
        [
          {
            text: 'ВІДНОВИТИ ДОСТУП',
            callback_data: 'resend_focus_block12',
          },
        ],
        [{ text: '← МЕНЮ', callback_data: 'ab_test:menu' }],
      ],
    },
    'HTML'
  )
}

export async function handleResendFocusBlock12(
  ctx: Context
): Promise<boolean> {
  const targetUserId = await resolveContextUserId(ctx)
  if (!targetUserId) {
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (chatId) {
      await ctx.telegram.sendMessage(
        chatId,
        FOCUS_RESEND_MISSING_USER_MSG
      )
    }
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_resend_missing_user_ack'
    ).catch(() => undefined)
    return true
  }
  const [hasCanonicalAccess, verifiedFocusPayment, paidFocusSubscription] = await Promise.all([
    hasActiveFocusSubscription(targetUserId),
    prisma.paymentLog.findFirst({
      where: {
        userId: targetUserId,
        status: 'SUCCESS',
        OR: [
          { orderReference: { startsWith: 'focus_' } },
          { metadata: { path: ['productId'], equals: 'focus' } },
        ],
      },
      select: { id: true },
      orderBy: { processedAt: 'desc' },
    }),
    prisma.productSubscription.findFirst({
      where: {
        userId: targetUserId,
        productId: '68c3e55a-4b70-4680-a26c-15fdd607fd59',
        status: 'PAID',
        paidAt: { not: null },
      },
      select: { id: true },
      orderBy: { paidAt: 'desc' },
    }),
  ])

  if (!hasCanonicalAccess && !verifiedFocusPayment && !paidFocusSubscription) {
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (chatId) {
      await ctx.telegram.sendMessage(String(chatId), FOCUS_RESEND_NO_SUB_MSG)
    }
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_resend_inactive_ack'
    ).catch(() => undefined)
    return true
  }

  if (hasCanonicalAccess) {
    await renderCurrentFocusStateMenu(ctx, targetUserId)
  } else {
    await resendFocusAccessTelegramMessage(targetUserId)
  }
  await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_resend_sent_ack').catch(
    () => undefined
  )
  return true
}
