import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { getOrCreateFocusInviteLink } from '@/products/focus/payments/inviteLink.js'
import { TelegramConversationRenderer } from '@/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js'
import type { ConversationButton, ConversationResponse } from '@/modules/telegram-mentor/conversation/engine/types.js'
import { buildZoomCalendarUrl } from '@/modules/zoom/urls.js'
import { hasActiveFocusSubscription } from './focus.access.js'
import { prisma } from '../../../db/client.js'
import { FOCUS_PRODUCT_CODES } from './focus.access.js'

const renderer = new TelegramConversationRenderer()

async function sendOutboundConversation(
  chatId: string,
  response: ConversationResponse,
): Promise<boolean> {
  return renderer.renderOutbound({ chatId }, response)
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

function resolveZoomBookingWebAppUrl(): string {
  return buildZoomCalendarUrl()
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

function buildFocusChannelStepResponse(inviteUrl: string): ConversationResponse {
  return buildMessageResponse(
    buildFocusChannelStepText(),
    [{ kind: 'url', label: 'ПЕРЕЙТИ В КАНАЛ', value: inviteUrl }],
    'HTML',
  )
}

function buildFocusZoomStepResponse(): ConversationResponse {
  return buildMessageResponse(
    buildFocusZoomStepText(),
    [{ kind: 'web_app', label: 'ОБРАТИ ZOOM', value: resolveZoomBookingWebAppUrl() }],
    'HTML',
  )
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
  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
    },
    select: { id: true, focusWelcomedAt: true, focusChannelInviteLink: true },
  })

  if (subscription?.focusWelcomedAt) {
    console.info(
      `[Focus] Welcome message already sent for userId=${userId}, skipping`
    )
    return false
  }

  return sendFocusAccessStateMessage(userId, { markWelcomed: true })
}

export async function sendAbTestBlock12Welcome(userId: string): Promise<boolean> {
  return sendFocusAccessStateMessage(userId, { markWelcomed: true })
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
