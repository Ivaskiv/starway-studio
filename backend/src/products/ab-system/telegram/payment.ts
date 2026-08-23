import type { Context } from 'telegraf'
import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import {
  buildAbTestProgressPatch,
  normalizeAbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'
import {
  FOCUS_PAYMENT_ISSUE_COACH_MSG,
  FOCUS_PAYMENT_ISSUE_NO_USER_MSG,
  FOCUS_PAYMENT_ISSUE_USER_MSG,
} from '../content/abTest.focus.js'
import {
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PAYMENT_CTA_3M,
  AB_TEST_FOCUS_PAYMENT_CTA_1Y,
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_3M,
  AB_TEST_FOCUS_PRICE_1Y,
  AB_TEST_FOCUS_REAL_SITUATION_HEADER,
  AB_TEST_FOCUS_REAL_SITUATION_LINES,
  AB_TEST_FOCUS_TARIFF_HEADER,
  AB_TEST_FOCUS_TITLE,
  AB_TEST_FOCUS_WEEKLY_TEXT,
} from '../content/abTest.shared.js'
import { BLOCK10_FOCUS } from '../content/abTest.results.js'
import {
  splitTelegramContentBlocks,
  sendTelegramContentChunk,
} from './views.js'
import {
  loadAbTestProgress,
  saveAbTestProgress,
} from './progress.js'
import {
  isTestPaymentEnabled,
  resolveContextUserId,
} from './callback.js'
import { scheduleFollowups } from './scheduler.js'
import { buildEcosystemPaymentCheckoutSession } from '../../../modules/subscriptions/payments/business/service.js'
import { hasActiveFocusSubscription } from '@/modules/subscriptions/payments/focus-access.js'
import { hasTelegramCtaInteraction } from '@/modules/telegram-mentor/services/engagement/cta.js'
import {
  alertCoachAboutPaymentIssue,
  findRelevantFocusCheckoutSession,
} from '@/modules/subscriptions/payments/coach-alert.js'
import {
  coachBot,
  sendOpsTelegramMessage,
} from '../../../lib/telegram.js'
import { trackEvent } from '@/modules/events/service.js'
import {
  clearSession,
  getSession,
  updateSession,
} from '../../../modules/telegram-mentor/session.js'
import { getDevTestPaymentButton } from '../../../modules/telegram-mentor/keyboards.js'

const FOCUS_PAYMENT_EVIDENCE_ACK_MSG =
  'Дякую. Чек і деталі платежу передано в STARWAY OPS.\n\nПовернемося з відповіддю після перевірки транзакції.'

export function buildCanonicalFocusPaymentPreviewBlocks() {
  return [
    { type: 'text' as const, text: 'Супер. Якщо відгукується — нижче можеш одразу вибрати формат участі.' },
    { type: 'text' as const, text: 'Обирай зручний варіант, і після оплати ми відкриємо тобі доступ у ФОКУС.' },
    {
      type: 'pricing' as const,
      text: `${AB_TEST_FOCUS_PRICE_1M}\n${AB_TEST_FOCUS_PRICE_3M}\n${AB_TEST_FOCUS_PRICE_1Y}`,
    },
  ]
}

export async function resolveCanonicalFocusPaymentView(userId: string | null) {
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
      `${AB_TEST_FOCUS_PRICE_3M}\n` +
      AB_TEST_FOCUS_PRICE_1Y
  const focusPaymentBlocks =
    BLOCK10_FOCUS.blocks
      ? [...BLOCK10_FOCUS.blocks]
      : splitTelegramContentBlocks(text.split('\n'))

  if (!userId) {
    return {
      blocks: focusPaymentBlocks,
      progressForCheckout: null,
    }
  }

  const progressForCheckout = await loadAbTestProgress(userId).catch(() => null)
  const previewSeen =
    progressForCheckout?.result_key
      ? await hasTelegramCtaInteraction(
          userId,
          `show_inside_${progressForCheckout.result_key.toUpperCase()}`
        ).catch(() => false)
      : false

  return {
    blocks: previewSeen
      ? buildCanonicalFocusPaymentPreviewBlocks()
      : focusPaymentBlocks,
    progressForCheckout,
  }
}

function resolveOpsChatId(): string {
  const raw = String(
    process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? ''
  ).trim()
  if (!raw) return ''
  if (raw.startsWith('-')) return raw
  if (/^\d{10,}$/.test(raw)) return `-100${raw}`
  return raw
}

function buildFocusPaymentEvidenceIntro(params: {
  userId: string
  telegramId: string
  orderReference: string
  amount: number
  evidenceType: 'text' | 'photo' | 'document'
  text?: string
}): string {
  return [
    'ЧЕК ВІД КОРИСТУВАЧА',
    `User ID: ${params.userId}`,
    `Telegram ID: ${params.telegramId || 'невідомо'}`,
    `Order: ${params.orderReference}`,
    `Сума: ${params.amount} грн`,
    `Тип: ${params.evidenceType}`,
    params.text ? `Коментар: ${params.text}` : null,
  ].filter(Boolean).join('\n')
}

async function hasPendingFocusPaymentEvidence(
  userId: string,
  chatId: string,
): Promise<boolean> {
  const session = await getSession(chatId)
  return Boolean(
    session?.userId === userId &&
    session.data?.paymentIssueAwaitingEvidence === true,
  )
}

export async function renderCurrentFocusStateMenu(
  ctx: Context,
  userId: string,
): Promise<void> {
  const { sendStateMenu } = await import('../../../modules/telegram-mentor/handlers/start.menu.js')
  await sendStateMenu(ctx, userId)
}

export async function handleFocusPaymentAction(
  ctx: Context,
  payingUserId: string | null,
  chatId: string | number | null
): Promise<boolean> {
  const { deactivateCallbackMarkup, resolveContextUserId } = await import('./callback.js')

  if (!chatId) {
    return true
  }

  // Fallback: if caller didn't resolve userId, try from ctx (handles middleware gaps)
  const resolvedUserId = payingUserId ?? await resolveContextUserId(ctx)

  if (resolvedUserId) {
    const hasActive = await hasActiveFocusSubscription(resolvedUserId)
    if (hasActive) {
      await renderCurrentFocusStateMenu(ctx, resolvedUserId)
      return true
    }
  }

  if (!resolvedUserId) {
    console.error('[FOCUS_PAY] missing_user_id_for_checkout')
    await ctx.answerCbQuery('Не вдалося відкрити ФОКУС. Спробуй ще раз.').catch(() => null)
    return true
  }

  let url1m: string
  let url3m: string
  let url1y: string
  let trialZoomUrl: string | null = null
  try {
    const [session1m, session3m, session1y, trialZoomSession] = await Promise.all([
      buildEcosystemPaymentCheckoutSession('focus', '1month', resolvedUserId, 'telegram'),
      buildEcosystemPaymentCheckoutSession('focus', '3month', resolvedUserId, 'telegram'),
      buildEcosystemPaymentCheckoutSession('focus', '1year', resolvedUserId, 'telegram'),
      buildEcosystemPaymentCheckoutSession('trial_zoom', 'single', resolvedUserId, 'telegram')
        .catch((error) => {
          if (error instanceof Error && error.message === 'TRIAL_ZOOM_ALREADY_USED') {
            console.info('[FOCUS_PAY] trial_zoom_already_used', { userId: resolvedUserId })
            return null
          }
          throw error
        }),
    ])
    url1m = session1m.checkoutUrl
    url3m = session3m.checkoutUrl
    url1y = session1y.checkoutUrl
    trialZoomUrl = trialZoomSession?.checkoutUrl ?? null
  } catch (error) {
    console.error('[FOCUS_PAY] dynamic_checkout_failed', error)
    await ctx.answerCbQuery('Не вдалося відкрити ФОКУС. Спробуй ще раз.').catch(() => null)
    return true
  }
  const cta1m = BLOCK10_FOCUS?.cta_1m ?? AB_TEST_FOCUS_PAYMENT_CTA_1M
  const cta3m = BLOCK10_FOCUS?.cta_3m ?? AB_TEST_FOCUS_PAYMENT_CTA_3M
  const cta1y = AB_TEST_FOCUS_PAYMENT_CTA_1Y
  const {
    blocks: paymentBlocksToSend,
    progressForCheckout,
  } = await resolveCanonicalFocusPaymentView(resolvedUserId)
  const testPaymentButton = isTestPaymentEnabled()
    ? getDevTestPaymentButton()
    : null
  const paymentInlineKeyboard = [
    [{ text: cta1m, url: url1m }],
    [{ text: cta3m, url: url3m }],
    [{ text: cta1y, url: url1y }],
    ...(trialZoomUrl
      ? [[{ text: 'ПРОБНИЙ ZOOM — 1 ГРН', url: trialZoomUrl }]]
      : []),
    ...(testPaymentButton ? [[testPaymentButton]] : []),
    [
      {
        text: 'ПРОБЛЕМА З ОПЛАТОЮ',
        callback_data: 'focus:payment_issue',
      },
    ],
  ]
  console.info('[FOCUS_PAY_RENDER_TRACE]', {
    userId: resolvedUserId,
    chatId: String(chatId),
    trialZoomUrl,
    hasTrialZoomRow: Boolean(trialZoomUrl),
    hasTestPaymentButton: Boolean(testPaymentButton),
    inlineKeyboard: paymentInlineKeyboard,
  })
  try {
    await sendTelegramContentChunk(
      ctx,
      chatId,
      '',
      paymentBlocksToSend,
      {
        inlineKeyboard: {
          inline_keyboard: paymentInlineKeyboard,
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
      .then((progressAfterFocusClick) => {
        const progressSnapshot = normalizeAbTestProgress(progressAfterFocusClick)
        return saveAbTestProgress(
          resolvedUserId,
          buildAbTestProgressPatch(progressSnapshot, {
            focus_opened_at:
              progressSnapshot.focus_opened_at ??
              new Date().toISOString(),
            last_event_at: new Date().toISOString(),
          })
        )
      })
      .catch((error: Error) =>
        console.error('[FOCUS_PAYMENT] save progress failed', error)
      )
  }
  if (resolvedUserId && progressForCheckout) {
    await scheduleFollowups(resolvedUserId, progressForCheckout, 'S4_FOCUS_INVITE')
  }
  return true
}

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
    await updateSession(
      issueUserId,
      String(chatId),
      'chat',
      {
        paymentIssueAwaitingEvidence: true,
        paymentIssueRequestedAt: new Date().toISOString(),
      },
      0,
    ).catch(() => undefined)
  }

  const lastCheckout = await findRelevantFocusCheckoutSession(issueUserId)

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
      checkoutToken: lastCheckout?.token ?? null,
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

export async function handlePendingFocusPaymentEvidenceText(
  ctx: Context,
  userId: string | null,
  text: string,
): Promise<boolean> {
  const chatId = String(ctx.chat?.id ?? '').trim()
  const resolvedUserId = String(userId ?? '').trim()
  const trimmedText = text.trim()
  if (!chatId || !resolvedUserId || !trimmedText) {
    return false
  }

  if (!(await hasPendingFocusPaymentEvidence(resolvedUserId, chatId))) {
    return false
  }

  const lastCheckout = await findRelevantFocusCheckoutSession(resolvedUserId)
  const telegramId = String(ctx.from?.id ?? '').trim()
  await sendOpsTelegramMessage(
    buildFocusPaymentEvidenceIntro({
      userId: resolvedUserId,
      telegramId,
      orderReference: lastCheckout?.orderReference ?? 'unknown',
      amount: lastCheckout?.amount ?? 0,
      evidenceType: 'text',
      text: trimmedText,
    }),
    undefined,
    {
      messageType: 'focus_payment_evidence',
      source: 'handlePendingFocusPaymentEvidenceText',
    },
  ).catch(() => false)

  await clearSession(resolvedUserId, chatId)
  await ctx.telegram.sendMessage(chatId, FOCUS_PAYMENT_EVIDENCE_ACK_MSG)
  return true
}

export async function handlePendingFocusPaymentEvidenceAttachment(
  ctx: Context,
  userId: string | null,
): Promise<boolean> {
  const chatId = String(ctx.chat?.id ?? '').trim()
  const resolvedUserId = String(userId ?? '').trim()
  if (!chatId || !resolvedUserId || !('message' in ctx) || !ctx.message) {
    return false
  }

  if (!(await hasPendingFocusPaymentEvidence(resolvedUserId, chatId))) {
    return false
  }

  const message = ctx.message as {
    caption?: string
    photo?: Array<{ file_id: string }>
    document?: { file_id: string; file_name?: string | null }
  }
  const photo = Array.isArray(message.photo) ? message.photo.at(-1) ?? null : null
  const document = message.document ?? null
  const fileId = photo?.file_id ?? document?.file_id ?? null
  if (!fileId) {
    return false
  }

  const opsChatId = resolveOpsChatId()
  if (!opsChatId) {
    return false
  }

  const lastCheckout = await findRelevantFocusCheckoutSession(resolvedUserId)
  const telegramId = String(ctx.from?.id ?? '').trim()
  const caption = String(message.caption ?? '').trim()
  const evidenceType = photo ? 'photo' : 'document'

  await sendOpsTelegramMessage(
    buildFocusPaymentEvidenceIntro({
      userId: resolvedUserId,
      telegramId,
      orderReference: lastCheckout?.orderReference ?? 'unknown',
      amount: lastCheckout?.amount ?? 0,
      evidenceType,
      text: caption || undefined,
    }),
    undefined,
    {
      messageType: 'focus_payment_evidence',
      source: 'handlePendingFocusPaymentEvidenceAttachment',
    },
  ).catch(() => false)

  const fileUrl = await ctx.telegram.getFileLink(fileId)
  if (photo) {
    await coachBot.telegram.sendPhoto(opsChatId, fileUrl.toString(), {
      caption: caption || `Чек від userId ${resolvedUserId}`,
    })
  } else {
    await coachBot.telegram.sendDocument(opsChatId, fileUrl.toString(), {
      caption: caption || `Чек від userId ${resolvedUserId}`,
    })
  }

  await clearSession(resolvedUserId, chatId)
  await ctx.telegram.sendMessage(chatId, FOCUS_PAYMENT_EVIDENCE_ACK_MSG)
  return true
}
