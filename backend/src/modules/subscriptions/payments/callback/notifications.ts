import { absystemContent } from '@/products/absystem/config/content.js'
import { getOrCreateFocusInviteLink } from '@/products/focus/payments/inviteLink.js'
import { TelegramConversationRenderer } from '@/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js'
import type { ConversationButton, ConversationResponse } from '@/modules/telegram-mentor/conversation/engine/types.js'
import { sendTelegramMessage } from '@/lib/telegram/messageFormatter.js'
import { bot } from '@/lib/telegram.js'
import { hasActiveFocusSubscription } from '../focus-access.js'
import { prisma } from '../../../../db/client.js'
import { FOCUS_PRODUCT_CODES } from '../focus-access.js'
import { resolveEcosystemPaymentPlan } from '../business/catalog.js'
import type { EcosystemPaymentPlanId } from '../business/types.js'
import {
  AB_TEST_BOOK_ZOOM_CTA_TEXT,
  AB_TEST_FOCUS_MENU_BUTTON_TEXT,
  AB_TEST_JOIN_CHANNEL_BUTTON_TEXT,
  AB_TEST_TRIAL_ZOOM_SUCCESS_CTA_TEXT,
} from '@/products/ab-system/content/abTest.shared.js'
import { buildZoomCalendarUrl } from '@/modules/zoom/urls.js'

let rendererInstance: TelegramConversationRenderer | null = null
const PAYMENT_SUCCESS_DELIVERY_MARKER_KEY = 'telegramPaymentSuccess'
const FOCUS_ZOOM_CALLBACK = 'focus:next_zoom'
const MAIN_MENU_CALLBACK = 'return_main_menu'
const FOCUS_MENU_CALLBACK = 'ab_test:menu'
const KYIV_TIME_ZONE = 'Europe/Kyiv'
const FOCUS_ORDER_REFERENCE_PATTERN = /^focus_(welcome_test|1month|3month|1year)_([0-9a-f-]{36})_\d+$/i

const FOCUS_PLAN_LABELS: Record<EcosystemPaymentPlanId, string> = {
  welcome_test: 'welcome_test',
  '1month': '1 місяць',
  '3month': '3 місяці',
  '1year': '1 рік',
  '1month_upgrade': '1 місяць',
  '6month': '6 місяців',
  single: 'single',
}

function getRenderer(): TelegramConversationRenderer {
  if (rendererInstance) {
    return rendererInstance
  }

  rendererInstance = new TelegramConversationRenderer()
  return rendererInstance
}

async function sendOutboundConversation(
  chatId: string,
  response: ConversationResponse,
): Promise<boolean> {
  return getRenderer().renderOutbound({ chatId }, response)
}

function buildMessageResponse(
  text: string,
  buttons: ConversationButton[] = [],
  parseMode?: 'Markdown' | 'HTML',
): ConversationResponse {
  return {
    text: null,
    buttons,
    cards: [
      {
        kind: 'message',
        text,
        parseMode,
      },
    ],
    media: [],
    nextActions: [],
    telemetry: {},
    analytics: {},
  }
}

function buildFocusChannelStepText(): string {
  return [
    'Доступ до ФОКУСУ активовано.',
    '',
    'Перейди в закритий канал. Там будуть анонси практик,',
    'матеріали та важливі повідомлення.',
  ].join('\n')
}

function buildFocusZoomStepText(): string {
  return [
    'Тепер обери найближчу Zoom-практику.',
    '',
    'Під час запису напиши ситуацію, яку хочеш розібрати.',
  ].join('\n')
}

function buildFocusChannelStepResponse(
  inviteUrl: string,
  paymentReference?: string | null,
): ConversationResponse {
  const buttons: ConversationButton[] = [
    { kind: 'callback', label: AB_TEST_BOOK_ZOOM_CTA_TEXT, value: FOCUS_ZOOM_CALLBACK },
    { kind: 'url', label: AB_TEST_JOIN_CHANNEL_BUTTON_TEXT, value: inviteUrl },
    { kind: 'callback', label: AB_TEST_FOCUS_MENU_BUTTON_TEXT, value: FOCUS_MENU_CALLBACK },
  ]
  return buildMessageResponse(
    [
      buildFocusChannelStepText(),
      paymentReference ? `Номер платежу: ${paymentReference}` : null,
    ].filter(Boolean).join('\n\n'),
    buttons,
    'HTML',
  )
}

function buildFocusZoomStepResponse(
  inviteUrl?: string | null,
  paymentReference?: string | null,
): ConversationResponse {
  const buttons: ConversationButton[] = [
    { kind: 'callback', label: AB_TEST_BOOK_ZOOM_CTA_TEXT, value: FOCUS_ZOOM_CALLBACK },
  ]

  if (inviteUrl) {
    buttons.push({ kind: 'url', label: AB_TEST_JOIN_CHANNEL_BUTTON_TEXT, value: inviteUrl })
  }

  buttons.push({ kind: 'callback', label: AB_TEST_FOCUS_MENU_BUTTON_TEXT, value: FOCUS_MENU_CALLBACK })

  return buildMessageResponse(
    [
      buildFocusZoomStepText(),
      paymentReference ? `Номер платежу: ${paymentReference}` : null,
    ].filter(Boolean).join('\n\n'),
    buttons,
    'HTML',
  )
}

function buildTrialZoomSuccessResponse(paymentReference?: string | null): ConversationResponse {
  return buildMessageResponse(
    [
      '✅ Оплату підтверджено',
      '',
      'Тобі доступний один пробний Zoom за 1 грн.',
      paymentReference ? `Номер платежу: ${paymentReference}` : '',
      '',
      'Обери найближчу Zoom-практику та запишись.',
    ].join('\n'),
    [
      {
        kind: 'web_app',
        label: AB_TEST_TRIAL_ZOOM_SUCCESS_CTA_TEXT,
        value: buildZoomCalendarUrl({ intent: 'booking' }),
      },
    ],
    'HTML',
  )
}

function parseFocusPaymentOrderReference(orderReference: string): {
  planId: EcosystemPaymentPlanId
  userId: string
} | null {
  const match = String(orderReference ?? '').trim().match(FOCUS_ORDER_REFERENCE_PATTERN)
  if (!match) return null

  return {
    planId: match[1] as EcosystemPaymentPlanId,
    userId: match[2],
  }
}

function formatKyivDateTime(date: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: KYIV_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatPaymentAmount(amountCents: number, currency: string): string {
  const amount = amountCents / 100
  return `${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)} ${currency}`
}

function buildFocusPaymentSuccessButtons() {
  const zoomCalendarUrl = buildZoomCalendarUrl({ intent: 'booking' })
  return {
    inline_keyboard: [
      [
        process.env.TELEGRAM_WEBAPP_BASE_URL?.trim()
          ? {
              text: 'ВІДКРИТИ КАЛЕНДАР ZOOM',
              web_app: { url: zoomCalendarUrl },
            }
          : { text: 'ВІДКРИТИ КАЛЕНДАР ZOOM', url: zoomCalendarUrl },
      ],
      [{ text: 'ПЕРЕЙТИ ДО ФОКУСУ', callback_data: 'open_focus_info' }],
      [{ text: 'ГОЛОВНЕ МЕНЮ', callback_data: MAIN_MENU_CALLBACK }],
    ],
  }
}

function buildFocusPaymentSuccessText(input: {
  productLabel: string
  planLabel: string
  amountCents: number
  currency: string
  paidAt: Date
  orderReference: string
  periodStart: Date
  finalExpiresAt: Date
  confirmedPaymentsCount: number
}): string {
  const text = [
    '✅ Оплату підтверджено',
    '',
    'Доступ ФОКУС активний ✅',
    '',
    `Продукт: ${input.productLabel}`,
    `Тариф: ${input.planLabel}`,
    `Сплачено: ${formatPaymentAmount(input.amountCents, input.currency)}`,
    `Дата: ${formatKyivDateTime(input.paidAt)}`,
    `Платіж: ${input.orderReference}`,
    '',
    `Доданий період: ${formatKyivDateTime(input.periodStart)} — ${formatKyivDateTime(input.finalExpiresAt)}`,
    `Доступ активний до: ${formatKyivDateTime(input.finalExpiresAt)}`,
    '',
    'Наступна дія: відкрий календар Zoom.',
  ]

  if (input.confirmedPaymentsCount > 1) {
    text.push(
      '',
      `Підтверджених оплат: ${input.confirmedPaymentsCount}`,
      'Попередній оплачений час збережено.',
    )
  }

  return text.join('\n')
}

async function resolveFocusPaymentSuccessContext(input: {
  userId: string
  orderReference?: string | null
}) {
  const checkout = await resolvePaymentSuccessCheckout({
    userId: input.userId,
    orderReference: input.orderReference,
    productCode: 'focus',
  })

  if (!checkout || checkout.productCode !== 'focus') {
    return null
  }

  const parsedReference = parseFocusPaymentOrderReference(checkout.orderReference)
  if (!parsedReference) {
    return null
  }

  const focusPlan = resolveEcosystemPaymentPlan('focus', parsedReference.planId)
  if (!focusPlan) {
    return null
  }

  const paymentLog = await prisma.paymentLog.findUnique({
    where: { orderReference: checkout.orderReference },
    select: {
      amountCents: true,
      currency: true,
      processedAt: true,
      status: true,
    },
  })

  if (!paymentLog || paymentLog.status !== 'SUCCESS') {
    return null
  }

  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId: input.userId,
      product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      expiresAt: true,
    },
  })

  if (!subscription?.expiresAt) {
    return null
  }

  const canonicalSubscription = await prisma.subscription.findFirst({
    where: {
      userId: input.userId,
      status: 'ACTIVE',
      product: {
        is: {
          code: { in: [...FOCUS_PRODUCT_CODES] },
        },
      },
    },
    orderBy: { currentPeriodEnd: 'desc' },
    select: {
      currentPeriodEnd: true,
    },
  })

  const confirmedPayments = await prisma.paymentLog.findMany({
    where: {
      userId: input.userId,
      status: 'SUCCESS',
      orderReference: { startsWith: 'focus_' },
    },
    select: { id: true },
  })

  const finalExpiresAt = canonicalSubscription?.currentPeriodEnd ?? subscription.expiresAt
  const periodStart = new Date(finalExpiresAt.getTime() - focusPlan.durationDays * 86400000)

  return {
    checkout,
    paymentLog,
    planLabel: FOCUS_PLAN_LABELS[parsedReference.planId] ?? parsedReference.planId,
    periodStart,
    finalExpiresAt,
    confirmedPaymentsCount: confirmedPayments.length,
  }
}

type PaymentSuccessProductCode = 'focus' | 'trial_zoom'

type SuccessDeliveryMarker = {
  deliveredAt?: string
  productCode?: string
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function readSuccessDeliveryMarker(payload: unknown): SuccessDeliveryMarker | null {
  const marker = normalizeJsonObject(payload)[PAYMENT_SUCCESS_DELIVERY_MARKER_KEY]
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) {
    return null
  }

  return marker as SuccessDeliveryMarker
}

function writeSuccessDeliveryMarker(payload: unknown, productCode: PaymentSuccessProductCode) {
  const basePayload = normalizeJsonObject(payload)
  return {
    ...basePayload,
    [PAYMENT_SUCCESS_DELIVERY_MARKER_KEY]: {
      deliveredAt: new Date().toISOString(),
      productCode,
    },
  }
}

async function resolvePaymentSuccessCheckout(input: {
  userId: string
  orderReference?: string | null
  productCode: PaymentSuccessProductCode
}) {
  if (input.orderReference) {
    return prisma.checkoutSession.findFirst({
      where: {
        userId: input.userId,
        orderReference: input.orderReference,
      },
      select: {
        id: true,
        amount: true,
        completedAt: true,
        createdAt: true,
        currency: true,
        payload: true,
        orderReference: true,
        productCode: true,
      },
    })
  }

  return prisma.checkoutSession.findFirst({
    where: {
      userId: input.userId,
      productCode: input.productCode,
      status: 'COMPLETED',
    },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      amount: true,
      completedAt: true,
      createdAt: true,
      currency: true,
      payload: true,
      orderReference: true,
      productCode: true,
    },
  })
}

async function markPaymentSuccessDelivered(checkoutId: string, payload: unknown, productCode: PaymentSuccessProductCode) {
  await prisma.checkoutSession.update({
    where: { id: checkoutId },
    data: {
      payload: writeSuccessDeliveryMarker(payload, productCode),
    },
  })
}

async function resolveTelegramChatId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  return user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
}

async function sendCanonicalPaymentSuccessMessage(input: {
  userId: string
  productCode: PaymentSuccessProductCode
  orderReference?: string | null
  force?: boolean
}): Promise<boolean> {
  const checkout = await resolvePaymentSuccessCheckout(input)
  if (!checkout) {
    return false
  }

  if (!input.force && readSuccessDeliveryMarker(checkout.payload)?.deliveredAt) {
    return false
  }

  const chatId = await resolveTelegramChatId(input.userId)
  if (!chatId) {
    return false
  }

  let sent = false

  if (input.productCode === 'focus') {
    const context = await resolveFocusPaymentSuccessContext({
      userId: input.userId,
      orderReference: input.orderReference,
    })

    if (!context) {
      return false
    }

    const paidAt = context.paymentLog.processedAt ?? context.checkout.completedAt ?? context.checkout.createdAt
    const message = buildFocusPaymentSuccessText({
      productLabel: 'ФОКУС',
      planLabel: context.planLabel,
      amountCents: context.paymentLog.amountCents,
      currency: context.paymentLog.currency,
      paidAt,
      orderReference: context.checkout.orderReference,
      periodStart: context.periodStart,
      finalExpiresAt: context.finalExpiresAt,
      confirmedPaymentsCount: context.confirmedPaymentsCount,
    })

    sent = await sendTelegramMessage(
      bot,
      chatId,
      message,
      { replyMarkup: buildFocusPaymentSuccessButtons() },
    ).then(() => true).catch(() => false)
  } else if (input.productCode === 'trial_zoom') {
    sent = await sendOutboundConversation(
      chatId,
      buildTrialZoomSuccessResponse(checkout.orderReference),
    )
  } else {
    const subscription = await prisma.productSubscription.findFirst({
      where: {
        userId: input.userId,
        product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        focusChannelInviteLink: true,
        channelJoinedAt: true,
      },
    })

    if (!subscription) {
      return false
    }

    const inviteUrl =
      subscription.focusChannelInviteLink ?? (await getOrCreateFocusInviteLink(input.userId))

    const response = subscription.channelJoinedAt
      ? buildFocusZoomStepResponse(inviteUrl, checkout.orderReference)
      : buildFocusChannelStepResponse(inviteUrl, checkout.orderReference)

    sent = await sendOutboundConversation(chatId, response)
  }

  if (!sent) {
    return false
  }

  await markPaymentSuccessDelivered(checkout.id, checkout.payload, input.productCode)
  return true
}

async function sendFocusAccessStateMessage(
  userId: string,
  options?: { markWelcomed?: boolean },
): Promise<boolean> {
  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      focusWelcomedAt: true,
      focusChannelInviteLink: true,
      channelJoinedAt: true,
    },
  })
  if (!subscription) {
    return false
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })
  if (!user) {
    return false
  }

  const chatId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
  if (!chatId) {
    return false
  }

  const inviteUrl =
    subscription.focusChannelInviteLink ?? (await getOrCreateFocusInviteLink(userId))
  const response = subscription.channelJoinedAt
    ? buildFocusZoomStepResponse()
    : buildFocusChannelStepResponse(inviteUrl)
  const sent = await sendOutboundConversation(chatId, response)

  if (
    sent
    && options?.markWelcomed
    && subscription.id
    && !subscription.focusWelcomedAt
  ) {
    await prisma.productSubscription.update({
      where: { id: subscription.id },
      data: {
        focusWelcomedAt: new Date(),
        focusChannelInviteLink: inviteUrl,
      },
    }).catch((err) =>
      console.error(
        '[Focus] Failed to update subscription after onboarding send',
        err,
      ),
    )
  }

  return sent
}

export async function sendFocusPaymentSuccessTelegramMessage(userId: string) {
  return sendCanonicalPaymentSuccessMessage({ userId, productCode: 'focus' })
}

export async function sendAbTestBlock12Welcome(userId: string): Promise<boolean> {
  return sendFocusAccessStateMessage(userId, { markWelcomed: true })
}

export async function sendFocusPaymentSuccessTelegramMessageByOrder(input: {
  userId: string
  orderReference?: string | null
  force?: boolean
}): Promise<boolean> {
  return sendCanonicalPaymentSuccessMessage({
    userId: input.userId,
    orderReference: input.orderReference,
    productCode: 'focus',
    force: input.force,
  })
}

export async function sendTrialZoomPaymentSuccessTelegramMessage(input: string | {
  userId: string
  orderReference?: string | null
  force?: boolean
}): Promise<boolean> {
  const userId = typeof input === 'string' ? input : input.userId
  const orderReference = typeof input === 'string' ? undefined : input.orderReference
  const force = typeof input === 'string' ? undefined : input.force

  return sendCanonicalPaymentSuccessMessage({
    userId,
    orderReference,
    productCode: 'trial_zoom',
    force,
  })
}

function normalizeTelegramId(value: string | number | null | undefined): string {
  return String(value ?? '').trim()
}

export async function sendAbTestBlock12PostJoin(userId: string): Promise<boolean> {
  const sub = await prisma.productSubscription.findFirst({
    where: {
      userId,
      channelJoinedAt: null,
      product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
    },
    select: { id: true },
  })
  if (!sub) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })
  if (!user) return false

  const chatId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
  if (!chatId) return false

  const sent = await sendOutboundConversation(chatId, buildFocusZoomStepResponse())
  if (!sent) return false

  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { channelJoinedAt: new Date() },
  })

  return true
}

export async function resendFocusAccessTelegramMessage(userId: string): Promise<boolean> {
  return sendFocusAccessStateMessage(userId, { markWelcomed: false })
}

export async function handleFocusChannelJoinByTelegramUserId(
  telegramUserId: string,
  joinedChatId: string,
): Promise<boolean> {
  const normalizedTelegramUserId = normalizeTelegramId(telegramUserId)
  const normalizedJoinedChatId = normalizeTelegramId(joinedChatId)
  if (!normalizedTelegramUserId || !normalizedJoinedChatId) return false

  const configuredChannelId = normalizeTelegramId(process.env.FOCUS_TELEGRAM_CHANNEL_ID)
  if (!configuredChannelId) {
    console.warn(
      `[Focus] FOCUS_TELEGRAM_CHANNEL_ID is not set — post-join trigger skipped (joinedChatId=${normalizedJoinedChatId})`,
    )
    return false
  }
  if (configuredChannelId !== normalizedJoinedChatId) {
    return false
  }

  const user = await prisma.user.findFirst({
    where: { telegramUserId: normalizedTelegramUserId },
    select: { id: true },
  })
  if (!user) return false

  const focusActive = await hasActiveFocusSubscription(user.id)
  if (!focusActive) return false

  return sendAbTestBlock12PostJoin(user.id)
}

export async function sendAbsystemPaymentSuccessTelegramMessage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const chatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  if (!chatId) {
    return false
  }

  const platformUrl = (
    process.env.FRONTEND_URL?.trim() ||
    process.env.PUBLIC_FRONTEND_URL?.trim() ||
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
    'http://localhost:5173'
  ).replace(/\/$/, '')

  const billing = absystemContent.BILLING.PLATFORM_PAID
  const text = [billing.text].join('\n')

  return sendOutboundConversation(chatId, buildMessageResponse(text, [
    { kind: 'url', label: billing.cta, value: `${platformUrl}/app/wheel` },
  ]))
}

export async function sendPaymentFailedTelegramMessage(
  userId: string,
  paymentUrl: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const chatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  if (!chatId) {
    return false
  }

  const billing = absystemContent.BILLING.PAYMENT_FAILED
  return sendOutboundConversation(chatId, buildMessageResponse(billing.text, [
    { kind: 'url', label: billing.cta, value: paymentUrl },
  ]))
}

export async function notifyUserFocusPaymentIssueDenied(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const chatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  if (!chatId) {
    return false
  }

  const billing = absystemContent.BILLING.PAYMENT_FAILED
  return sendOutboundConversation(chatId, buildMessageResponse(billing.text, [
    { kind: 'callback', label: billing.cta, value: 'open_focus_payment' },
  ]))
}
