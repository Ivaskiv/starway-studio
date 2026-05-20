import { prisma } from '../../db/client.js'
import { requireTelegramBotConfig } from '../../modules/telegram-mentor/runtime/botConfig.js'

const TELEGRAM_API_BASE = 'https://api.telegram.org'
const MAX_RETRIES = 2

async function resolveChatId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramUserId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  return user?.telegramLinks[0]?.chatId ?? user?.telegramChatId ?? user?.telegramUserId ?? null
}

async function sendTelegramRequest(chatId: string, text: string) {
  const token = requireTelegramBotConfig('telegram delivery').token

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`telegram_send_failed:${response.status}:${details}`)
  }
}

export async function send(message: string, userId: string) {
  const chatId = await resolveChatId(userId)
  if (!chatId) throw new Error(`telegram_chat_not_found:${userId}`)

  let attempt = 0
  while (attempt <= MAX_RETRIES) {
    try {
      await sendTelegramRequest(chatId, message)
      console.log('[DELIVERY]', { channel: 'telegram', userId, chatId, status: 'sent', attempt })
      return { delivered: true, channel: 'telegram' as const, chatId }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error'
      console.warn('[DELIVERY]', { channel: 'telegram', userId, chatId, status: 'retry', attempt, reason })
      if (attempt === MAX_RETRIES) throw error
      attempt += 1
    }
  }

  throw new Error('telegram_send_unreachable')
}
