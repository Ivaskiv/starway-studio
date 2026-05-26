import {
  FOCUS_CHANNEL_URL,
  FOCUS_WELCOME,
  abTestFocusContent,
} from '@/products/ab-system/content/abTest.focus.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { createOnceInviteLink } from '@/products/focus/payments/inviteLink.js'
import { hasActiveFocusSubscription } from './focus.access.js'
import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { sendDedupedTelegramMessage } from '../../../lib/telegram.js'
import { resolveNotificationType } from '../../../services/notifications/domain/notificationPolicy.js'
import { NotificationEvent } from '../../../services/notifications/NotificationEvent.js'
import { FOCUS_DOJIM_TIMER_IDS } from './business.js'
import { FOCUS_PRODUCT_CODES } from './focus.access.js'

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
  const text = billing.text.replace('{inviteLink}', inviteUrl)

  const sent = await sendDedupedTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[{ text: billing.cta, url: inviteUrl }]],
    },
  })

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

export async function sendAbTestBlock12Welcome(userId: string): Promise<void> {
  console.log('[BLOCK12_DIAG]', { userId, step: 'enter' })

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
    return
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
  await sendDedupedTelegramMessage(
    chatId,
    `${FOCUS_WELCOME.msg1.body}\n${block12Url}`.trim(),
    {
    reply_markup: {
      inline_keyboard: [
        [{ text: FOCUS_WELCOME.msg1.cta, url: block12Url }],
      ],
    },
    }
  )
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

  const sent = await sendDedupedTelegramMessage(chatId, abTestFocusContent.afterJoin.body)
  if (!sent) return false

  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { channelJoinedAt: new Date() },
  })

  return true
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

export async function cancelPendingFocusDojims(userId: string): Promise<number> {
  const jobs = await prisma.notificationJob
    .findMany({
      where: {
        type: resolveNotificationType(NotificationEvent.AB_TEST_FOLLOWUP),
        status: 'PENDING',
        payload: { path: ['userId'], equals: userId },
      },
      select: {
        id: true,
        payload: true,
      },
    })
    .catch(() => [])

  const ids = jobs
    .filter((job) => {
      const payload = job.payload as Prisma.JsonObject | null
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return false
      }

      const payloadUserId =
        typeof payload.userId === 'string' ? payload.userId : null
      const flowTimerId =
        typeof payload.flow_timer_id === 'string'
          ? payload.flow_timer_id
          : typeof payload.flowTimerId === 'string'
            ? payload.flowTimerId
            : null

      return (
        payloadUserId === userId &&
        flowTimerId !== null &&
        FOCUS_DOJIM_TIMER_IDS.includes(
          flowTimerId as (typeof FOCUS_DOJIM_TIMER_IDS)[number]
        )
      )
    })
    .map((job) => job.id)

  if (!ids.length) {
    return 0
  }

  await prisma.notificationJob.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  return ids.length
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

  return sendDedupedTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: billing.cta, url: `${platformUrl}/app/wheel` }],
      ],
    },
  })
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
  return sendDedupedTelegramMessage(chatId, billing.text, {
    reply_markup: {
      inline_keyboard: [[{ text: billing.cta, url: paymentUrl }]],
    },
  })
}
