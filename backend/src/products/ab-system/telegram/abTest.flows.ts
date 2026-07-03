//backend/src/products/ab-system/telegram/abTest.flows.ts
import type { Context, Telegraf } from 'telegraf'
import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import {
  buildAbTestProgressPatch,
  normalizeAbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'
import {
  FOCUS_ALREADY_ACTIVE_MSG,
  FOCUS_PAYMENT_ISSUE_COACH_MSG,
  FOCUS_PAYMENT_ISSUE_NO_USER_MSG,
  FOCUS_PAYMENT_ISSUE_USER_MSG,
  FOCUS_RESEND_MISSING_USER_MSG,
  FOCUS_RESEND_NO_SUB_MSG,
  FOCUS_RESEND_SUCCESS_MSG,
} from '../content/abTest.focus.js'
import {
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PAYMENT_CTA_3M,
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_3M,
  AB_TEST_FOCUS_REAL_SITUATION_HEADER,
  AB_TEST_FOCUS_REAL_SITUATION_LINES,
  AB_TEST_FOCUS_TARIFF_HEADER,
  AB_TEST_FOCUS_TITLE,
  AB_TEST_FOCUS_WEEKLY_TEXT,
} from '../content/abTest.shared.js'
import {
  BLOCK10_FOCUS,
} from '../content/abTest.results.js'
import {
  splitTelegramContentBlocks,
  sendTelegramContentChunk,
} from './abTest.views.js'
import {
  loadAbTestProgress,
  saveAbTestProgress,
} from './abTest.progress.js'
import {
  escapeHtml,
  firstNonEmptyUrl,
  isTestPaymentEnabled,
  formatSubscriptionDate,
  resolveContextUserId,
  isValidEmail,
} from './abTest.callback.js'
import {
  attachEmailToUser,
} from '../../../modules/user/identity.service.js'
import {
  upsertTelegramBinding,
} from '../../../modules/telegram-mentor/services/linking.service.js'
import {
  buildWebDeepLink,
  generateDeepLink,
} from '../../../modules/deeplinks/service.js'
import {
  sendMagicLoginEmail,
} from '../../../modules/auth/mail.service.js'
import {
  clearPendingTelegramIdentity,
} from '../../../modules/telegram-mentor/services/pendingIdentity.service.js'
import { scheduleFollowups } from './abTest.scheduler.js'
import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'
import { buildEcosystemPaymentCheckoutSession } from '../../../modules/subscriptions/payments/business.js'
import { hasActiveFocusSubscription } from '@/modules/subscriptions/payments/focus.access.js'
import { sendAbTestBlock12Welcome } from '@/modules/subscriptions/payments/callback.notifications.js'
import { alertCoachAboutPaymentIssue } from '@/modules/subscriptions/payments/coachAlert.service.js'
import { coachBot } from '../../../lib/telegram.js'
import { trackEvent } from '@/modules/events/service.js'
import {
  planMessage,
  planAck,
} from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'

// ============================================================================
// EMAIL CAPTURE
// ============================================================================

export async function handleAbTestEmailCaptureText(
  ctx: Context,
  userId: string,
  text: string
): Promise<boolean> {
  const resolvedUserId = await resolveAbTestEmailTargetUserId(ctx, userId)
  const progress = await loadAbTestProgress(resolvedUserId)
  if (progress.email_stage !== 'pending') {
    return false
  }

  const normalizedEmail = text.trim().toLowerCase()
  if (!isValidEmail(normalizedEmail)) {
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (chatId) {
      await ctx.telegram.sendMessage(
        chatId,
        'Схоже, це не email. Введіть коректний email одним повідомленням.'
      )
    }
    return true
  }

  const chatId = String(ctx.chat?.id ?? '').trim()
  const telegramUserId = String(ctx.from?.id ?? '').trim()

  try {
    const attachment = await attachEmailToUser(resolvedUserId, normalizedEmail)
    const persistedUserId = attachment.userId

    if (chatId && telegramUserId) {
      await upsertTelegramBinding({
        userId: persistedUserId,
        chatId,
        telegramUserId,
        telegramUserName: ctx.from?.username ?? null,
        firstName: ctx.from?.first_name ?? null,
      })
    }

    const deepLink = await generateDeepLink({
      userId: persistedUserId,
      action: 'magic_login',
      source: 'telegram',
      target: 'web',
      path: '/onboarding/continue',
      payload: {
        origin: 'ab_test_email_capture',
      } satisfies Prisma.InputJsonValue,
    })
    const magicLoginUrl = buildWebDeepLink(deepLink.token, deepLink.path)
    const mailSent = await sendMagicLoginEmail({
      to: normalizedEmail,
      loginUrl: magicLoginUrl,
    })

    const nowIso = new Date().toISOString()
    const next = buildAbTestProgressPatch(progress, {
      email_stage: 'captured',
      email_captured_at: nowIso,
      last_event_at: nowIso,
    })
    await saveAbTestProgress(persistedUserId, next)
    if (chatId) {
      await clearPendingTelegramIdentity(chatId)
    }

    await testOrchestrator.onTestCompleted(
      persistedUserId,
      progress.result_key ?? null,
      normalizedEmail,
      {
        startedAt: progress.started_at
          ? new Date(progress.started_at)
          : undefined,
      }
    )
    console.info('[TEST_COMPLETED]', {
      userId: persistedUserId,
      segment: progress.result_key,
      messageId: null,
      callback: 'email_capture',
    })

    if (!mailSent) {
      console.warn('[AB_TEST_EMAIL_CAPTURE] magic_login_email_not_sent', {
        userId: persistedUserId,
        email: normalizedEmail,
      })
    }

    const scheduled = await scheduleFollowups(
      persistedUserId,
      next,
      'S3_TEST_RESULT'
    ).catch((error) => {
      console.error('[AB_TEST_EMAIL_CAPTURE] followups_failed', {
        userId: persistedUserId,
        error: error instanceof Error ? error.message : String(error),
      })
      return next
    })
    if (scheduled !== next) {
      await saveAbTestProgress(persistedUserId, scheduled)
    }

    const { renderAbTestPostEmailSubmitSequence } = await import('./abTest.views.js')
    await renderAbTestPostEmailSubmitSequence(
      ctx,
      userId,
      progress,
      {
        notifyOps: false,
        forceRedelivery: true,
      }
    )
    return true
  } catch (error) {
    console.error('[AB_TEST_EMAIL_CAPTURE] persistence_failed', {
      userId,
      chatId: chatId || null,
      telegramUserId: telegramUserId || null,
      error: error instanceof Error ? error.message : String(error),
    })

    await planMessage(
      ctx,
      'ctx.reply',
      'ab_test_email_retry',
      'Не вдалося зберегти email. Спробуйте ще раз.'
    )
    return true
  }
}

async function resolveAbTestEmailTargetUserId(
  ctx: Context,
  fallbackUserId: string
): Promise<string> {
  const chatId = String(ctx.chat?.id ?? '').trim()
  const telegramUserId = String(ctx.from?.id ?? '').trim()

  const candidate = await prisma.user.findFirst({
    where: {
      OR: [
        { id: fallbackUserId },
        ...(telegramUserId ? [{ telegramUserId }] : []),
        ...(chatId ? [{ telegramChatId: chatId }] : []),
      ],
    },
    select: { id: true },
  })

  return candidate?.id ?? fallbackUserId
}

// ============================================================================
// FOCUS SHORTCUTS
// ============================================================================

export async function resolveFocusShortcutCallback(
  ctx: Context,
  action: string,
  userId: string
): Promise<boolean> {
  const { handleStatus } = await import('../../../modules/telegram-mentor/handlers/status.js')
  const { handleAIMentor } = await import('../../../modules/telegram-mentor/handlers/aiMentor.js')
  const { sendStateMenu } = await import('../../../modules/telegram-mentor/handlers/start.menu.js')
  const { deactivateCallbackMarkup } = await import('./abTest.callback.js')

  if (action === 'open_focus_info') {
    return handleAbTestCallback(ctx, AB_TEST_ACTIONS.FOCUS_INFO)
  }

  if (action === 'focus:calendar' || action === 'focus:next_zoom') {
    await deactivateCallbackMarkup(ctx)
    await ctx.answerCbQuery().catch(() => null)
    await handleStatus(ctx)
    return true
  }

  if (action === 'focus:menu') {
    await deactivateCallbackMarkup(ctx)
    await ctx.answerCbQuery().catch(() => null)
    await sendStateMenu(ctx, userId)
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
  const { handleAbTestCallback: importedHandler } = await import('./abTest.service.js')
  return importedHandler(ctx, action)
}

// ============================================================================
// FOCUS SUBSCRIPTION CARD
// ============================================================================

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
              text: 'Оплатити ФОКУС',
              callback_data: AB_TEST_ACTIONS.FOCUS_PAY,
            },
          ],
          [{ text: '← Меню', callback_data: 'ab_test:menu' }],
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
          ? [[{ text: '🔗 Посилання на канал', url: inviteUrl }]]
          : []),
        [
          {
            text: '🔄 Відновити доступ',
            callback_data: 'resend_focus_block12',
          },
        ],
        [{ text: '← Меню', callback_data: 'ab_test:menu' }],
      ],
    },
    'HTML'
  )
}

// ============================================================================
// FOCUS PAYMENT
// ============================================================================

export async function handleFocusPaymentAction(
  ctx: Context,
  payingUserId: string | null,
  chatId: string | number | null
): Promise<boolean> {
  const { deactivateCallbackMarkup, resolveContextUserId } = await import('./abTest.callback.js')

  if (!chatId) {
    return true
  }

  // Fallback: if caller didn't resolve userId, try from ctx (handles middleware gaps)
  const resolvedUserId = payingUserId ?? await resolveContextUserId(ctx)

  if (resolvedUserId) {
    const hasActive = await hasActiveFocusSubscription(resolvedUserId)
    if (hasActive) {
      const inviteUrl = String(
        process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ?? ''
      ).trim()
      await ctx.telegram.sendMessage(
        chatId,
        FOCUS_ALREADY_ACTIVE_MSG(inviteUrl),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              ...(inviteUrl
                ? [
                    [
                      {
                        text: '🔗 Перейти в канал ФОКУС',
                        url: inviteUrl,
                      },
                    ],
                  ]
                : []),
              [
                {
                  text: '🔄 Відновити доступ',
                  callback_data: 'resend_focus_block12',
                },
              ],
              [
                {
                  text: '📋 Моя підписка',
                  callback_data: 'ab_test:subscription',
                },
              ],
              [
                {
                  text: '← Меню',
                  callback_data: 'ab_test:menu',
                },
              ],
            ],
          },
        }
      )
      return true
    }
  }

  const url1m = firstNonEmptyUrl(
    process.env.WAYFORPAY_FOCUS_BOT_1M_URL,
    process.env.WAYFORPAY_FOCUS_1M_URL,
    process.env.FOCUS_1M_URL,
    process.env.WAYFORPAY_FOCUS_LANDING_URL
  )
  const url3m = firstNonEmptyUrl(
    process.env.WAYFORPAY_FOCUS_BOT_3M_URL,
    process.env.WAYFORPAY_FOCUS_3M_URL,
    process.env.FOCUS_3M_URL,
    process.env.WAYFORPAY_FOCUS_LANDING_URL
  )
  const text =
    BLOCK10_FOCUS?.text ??
    `${AB_TEST_FOCUS_TITLE}\n\n` +
      `${AB_TEST_FOCUS_WEEKLY_TEXT}\n` +
      '\n' +
      `${AB_TEST_FOCUS_REAL_SITUATION_HEADER}\n` +
      `${AB_TEST_FOCUS_REAL_SITUATION_LINES.join('\n')}\n\n` +
      `${AB_TEST_FOCUS_TARIFF_HEADER}\n` +
      '\n' +
      `${AB_TEST_FOCUS_PRICE_1M}\n` +
      AB_TEST_FOCUS_PRICE_3M
  const cta1m = BLOCK10_FOCUS?.cta_1m ?? AB_TEST_FOCUS_PAYMENT_CTA_1M
  const cta3m = BLOCK10_FOCUS?.cta_3m ?? AB_TEST_FOCUS_PAYMENT_CTA_3M
  const focusPaymentBlocks =
    BLOCK10_FOCUS.blocks
      ? [...BLOCK10_FOCUS.blocks]
      : splitTelegramContentBlocks(text.split('\n'))
  let testButtonRow: Array<{ text: string; url: string }> = []
  if (resolvedUserId && isTestPaymentEnabled()) {
    try {
      const testSession = await buildEcosystemPaymentCheckoutSession(
        'focus',
        '1month',
        resolvedUserId,
        {
          amountOverride: 1,
          orderRefTag: 'test1uah',
        }
      )
      testButtonRow = [
        { text: '🧪 Тест 1 грн', url: testSession.checkoutUrl },
      ]
    } catch (error) {
      console.error('[TEST_PAYMENT] failed_to_build_checkout', error)
    }
  }
  try {
    await sendTelegramContentChunk(
      ctx,
      chatId,
      '',
      focusPaymentBlocks,
      {
        inlineKeyboard: {
          inline_keyboard: [
            [{ text: cta1m, url: url1m }],
            [{ text: cta3m, url: url3m }],
            ...testButtonRow.map((row) => [row]),
            [
              {
                text: '⚠️ Проблема з оплатою',
                callback_data: 'focus:payment_issue',
              },
            ],
          ],
        },
        parseMode: 'HTML',
        separateBlocks: true,
      }
    )
    console.log('[FOCUS_PAY] sent ok', { userId: resolvedUserId, chatId })
    if (resolvedUserId) {
      await trackEvent({
        userId: resolvedUserId,
        type: 'PAYMENT_OPENED',
        source: 'telegram',
        state: 'S5_PAYMENT',
        productId: 'focus',
        payload: {
          checkout_urls: [url1m, url3m].filter((value): value is string => Boolean(value)),
          source_action: 'open_focus_payment',
        } satisfies Prisma.JsonObject,
      })
    }
  } catch (error) {
    console.error('[FOCUS_PAY] FAILED', error)
  }
  if (resolvedUserId) {
    loadAbTestProgress(resolvedUserId)
      .then((progressAfterFocusClick) =>
        saveAbTestProgress(
          resolvedUserId,
          buildAbTestProgressPatch(progressAfterFocusClick, {
            focus_opened_at:
              progressAfterFocusClick.focus_opened_at ??
              new Date().toISOString(),
            last_event_at: new Date().toISOString(),
          })
        )
      )
      .catch((error: Error) =>
        console.error('[FOCUS_PAYMENT] save progress failed', error)
      )
  }
  return true
}

// ============================================================================
// FOCUS RESEND BLOCK 12
// ============================================================================

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
  const [verifiedFocusPayment, paidFocusSubscription] = await Promise.all([
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

  if (!verifiedFocusPayment && !paidFocusSubscription) {
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

  const { markAbTestPaymentSuccess } = await import('./abTest.markers.js')
  await markAbTestPaymentSuccess(targetUserId)
  await sendAbTestBlock12Welcome(targetUserId)
  await prisma.productSubscription
    .updateMany({
      where: {
        userId: targetUserId,
        productId: '68c3e55a-4b70-4680-a26c-15fdd607fd59',
      },
      data: { focusWelcomedAt: new Date() },
    })
    .catch(() => undefined)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (chatId) {
    await ctx.telegram.sendMessage(String(chatId), FOCUS_RESEND_SUCCESS_MSG)
  }
  await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_resend_sent_ack').catch(
    () => undefined
  )
  return true
}

// ============================================================================
// FOCUS PAYMENT ISSUE
// ============================================================================

export async function handleFocusPaymentIssue(
  ctx: Context,
  issueUserId: string | null
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!issueUserId) {
    if (chatId) {
      await ctx.telegram.sendMessage(
        String(chatId),
        FOCUS_PAYMENT_ISSUE_NO_USER_MSG
      )
    }
    return true
  }

  if (chatId) {
    await ctx.telegram.sendMessage(
      String(chatId),
      FOCUS_PAYMENT_ISSUE_USER_MSG,
      { parse_mode: 'HTML' }
    )
  }

  const lastCheckout = await prisma.checkoutSession.findFirst({
    where: { userId: issueUserId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderReference: true,
      amount: true,
    },
  })

  await prisma.productSubscription
    .updateMany({
      where: {
        userId: issueUserId,
        product: { is: { code: { in: ['focus', 'FOCUS'] } } },
      },
      data: {
        paymentIssueCount: { increment: 1 },
        lastPaymentIssueAt: new Date(),
      },
    })
    .catch(() => undefined)

  const orderReference = lastCheckout?.orderReference ?? 'unknown'
  const coachChatId = String(
    process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? ''
  ).trim()
  if (!coachChatId) {
    console.error('[PAYMENT_ISSUE] coach alert skipped: missing ops chat id', {
      userId: issueUserId,
      orderReference,
      coachChatId,
    })
    return true
  }

  try {
    await alertCoachAboutPaymentIssue({
      bot: coachBot,
      coachChatId,
      userId: issueUserId,
      orderReference,
      amount: lastCheckout?.amount ?? 0,
      reason: FOCUS_PAYMENT_ISSUE_COACH_MSG({
        userId: issueUserId,
        orderReference,
        amount: lastCheckout?.amount ?? 0,
      }),
      scenario: 'E',
    })
  } catch (error) {
    console.error('[PAYMENT_ISSUE] coach alert failed', {
      userId: issueUserId,
      orderReference,
      coachChatId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return true
}
