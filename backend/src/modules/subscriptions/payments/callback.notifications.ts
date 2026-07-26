import {
  FOCUS_CHANNEL_URL,
  FOCUS_WELCOME,
  abTestFocusContent,
  buildFocusWelcomeMessage,
} from '@/products/ab-system/content/abTest.focus.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { createOnceInviteLink } from '@/products/focus/payments/inviteLink.js'
import { TelegramConversationRenderer } from '@/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js'
import type { ConversationButton, ConversationResponse } from '@/modules/telegram-mentor/conversation/engine/types.js'
import { resolveTelegramWebappBaseUrl } from '@/config/webapp.js'
import { bot } from '@/lib/telegram.js'
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
  const configured = String(process.env.WEBAPP_URL ?? '').trim()
  const base = configured || resolveTelegramWebappBaseUrl()
  return `${base.replace(/\/$/, '')}/miniapp/zoom-calendar?intent=booking`
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
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
    console.warn(
      `[Focus] No telegramChatId for userId=${userId} — welcome message not sent`
    )
    return false
  }

  const inviteUrl = await createOnceInviteLink(chatId)
  const billing = absystemContent.BILLING.FOCUS_PAID
  const text = buildFocusWelcomeMessage(user?.firstName, inviteUrl)

  const sent = await sendOutboundConversation(chatId, buildMessageResponse(text, [
    { kind: 'url', label: billing.cta, value: inviteUrl },
  ], 'HTML'))

  if (sent && subscription?.id) {
    await prisma.productSubscription
      .update({
        where: { id: subscription.id },
        data: {
          focusWelcomedAt: new Date(),
          focusChannelInviteLink: inviteUrl,
        },
      })
      .catch((err) =>
        console.error(
          '[Focus] Failed to update subscription after welcome',
          err
        )
      )
  }

  return sent
}

export async function sendAbTestBlock12Welcome(userId: string): Promise<boolean> {
  console.log('[BLOCK12_DIAG]', { userId, step: 'enter' })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
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
  console.log('[BLOCK12_DIAG]', {
    userId,
    chatId,
    hasTelegramChatId: Boolean(user?.telegramChatId),
    telegramLinksCount: user?.telegramLinks.length ?? 0,
    step: 'chatId_resolved',
  })

  if (!chatId) {
    console.warn(
      `[Focus] No telegramChatId for userId=${userId} — Block 12 not sent`
    )
    return false
  }

  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
    },
    select: { focusChannelInviteLink: true },
  })

  const inviteUrl =
    subscription?.focusChannelInviteLink ?? (await createOnceInviteLink(chatId))

  console.log('[BLOCK12_DIAG]', {
    userId,
    chatId,
    inviteUrl: inviteUrl.slice(0, 40),
    step: 'before_send',
  })

  const block12Url = inviteUrl || FOCUS_CHANNEL_URL
  const sentMessage = await bot.telegram.sendMessage(
    chatId,
    buildFocusWelcomeMessage(user?.firstName, block12Url),
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: FOCUS_WELCOME.msg1.cta, url: block12Url }],
          [{ text: 'Записатись на Zoom', web_app: { url: resolveZoomBookingWebAppUrl() } }],
        ],
      },
    },
  ).catch((error) => {
    console.error('[Focus] Block 12 direct send failed', error)
    return null
  })
  const sent = Boolean(sentMessage)
  console.log('[BLOCK12_DIAG]', { userId, chatId, step: 'after_send' })
  return sent
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

  const sent = await sendOutboundConversation(
    chatId,
    buildMessageResponse(
      abTestFocusContent.afterJoin.body,
      [
        { kind: 'web_app', label: 'Записатись на Zoom', value: resolveZoomBookingWebAppUrl() },
        { kind: 'url', label: 'Відкрити канал', value: FOCUS_CHANNEL_URL },
      ],
      'HTML',
    ),
  )
  if (!sent) return false

  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { channelJoinedAt: new Date() },
  })

  return true
}

export async function resendFocusAccessTelegramMessage(userId: string): Promise<boolean> {
  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      channelJoinedAt: true,
    },
  })

  if (!subscription) {
    return false
  }

  if (subscription.channelJoinedAt) {
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

    return sendOutboundConversation(
      chatId,
      buildMessageResponse(
        abTestFocusContent.afterJoin.body,
        [
          { kind: 'web_app', label: 'Записатись на Zoom', value: resolveZoomBookingWebAppUrl() },
          { kind: 'url', label: 'Відкрити канал', value: FOCUS_CHANNEL_URL },
        ],
        'HTML',
      ),
    )
  }

  return sendAbTestBlock12Welcome(userId)
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

  const billing = absystemContent.BILLING.PLATFORM_PAID
  const platformUrl = (
    process.env.FRONTEND_URL?.trim() ||
    process.env.PUBLIC_FRONTEND_URL?.trim() ||
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
    'http://localhost:5173'
  ).replace(/\/$/, '')

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
