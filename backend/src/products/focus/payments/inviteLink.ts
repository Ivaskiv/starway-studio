import { prisma } from '../../../db/client.js'
import { resolveFocusChannelInviteLink } from '../../../modules/subscriptions/payments/business/service.js'
import { FOCUS_PRODUCT_CODES } from '../../../modules/subscriptions/payments/focus-access.js'

export async function createOnceInviteLink(chatId: string): Promise<string> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const channelId = process.env.FOCUS_TELEGRAM_CHANNEL_ID

  if (!botToken || !channelId) {
    console.warn('[Focus] TELEGRAM_BOT_TOKEN or FOCUS_TELEGRAM_CHANNEL_ID not set — using static invite link')
    return resolveFocusChannelInviteLink()
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          member_limit: 1,
          name: `focus_${chatId}_${Date.now()}`,
        }),
      }
    )
    const data = (await response.json()) as { ok: boolean; result?: { invite_link: string } }
    if (!data.ok || !data.result?.invite_link) {
      console.error('[Focus] createChatInviteLink API failed', data)
      return resolveFocusChannelInviteLink()
    }
    return data.result.invite_link
  } catch (err) {
    console.error('[Focus] createChatInviteLink fetch error', err)
    return resolveFocusChannelInviteLink()
  }
}

/** Returns stored invite link or generates + saves a new one for this user */
export async function getOrCreateFocusInviteLink(userId: string): Promise<string> {
  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
    },
    select: { id: true, focusChannelInviteLink: true },
  }).catch(() => null)

  if (subscription?.focusChannelInviteLink) {
    return subscription.focusChannelInviteLink
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
  }).catch(() => null)

  const chatId = user?.telegramChatId ?? user?.telegramLinks?.[0]?.chatId ?? null
  const inviteLink = chatId
    ? await createOnceInviteLink(chatId)
    : resolveFocusChannelInviteLink()

  if (subscription?.id && inviteLink) {
    await prisma.productSubscription.update({
      where: { id: subscription.id },
      data: { focusChannelInviteLink: inviteLink },
    }).catch(() => undefined)
  }

  return inviteLink
}
