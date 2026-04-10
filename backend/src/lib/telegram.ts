// backend/src/lib/telegram.ts
// Єдиний shared Telegram bot instance для всього backend

import crypto from 'crypto'
import { Telegraf } from 'telegraf'

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set — bot disabled')
}

export const bot: Telegraf = new Telegraf(process.env.TELEGRAM_BOT_TOKEN ?? 'disabled')
const LAST_MESSAGE_TTL_MS = 6 * 60 * 60 * 1000
const lastMessageHashes = new Map<string, { hash: string; sentAt: number }>()

const getBotLink = () =>
  `https://t.me/${process.env.TELEGRAM_BOT_USERNAME ?? 'Starway_byNadya_Bot'}`

export { getBotLink }

export async function sendDedupedTelegramMessage(
  chatId: string,
  text: string,
  options?: Parameters<typeof bot.telegram.sendMessage>[2],
): Promise<boolean> {
  const hash = crypto.createHash('sha256').update(text).digest('hex')
  const now = Date.now()
  const last = lastMessageHashes.get(chatId)

  if (last && last.hash === hash && now - last.sentAt < LAST_MESSAGE_TTL_MS) {
    console.info(`[Telegram] Skip duplicate message chatId=${chatId}`)
    return false
  }

  await bot.telegram.sendMessage(chatId, text, options)
  lastMessageHashes.set(chatId, { hash, sentAt: now })
  return true
}

export async function sendToMentor(payload: {
  fromName: string
  fromEmail: string
  message: string
  userContext: {
    streak: number
    level: number
    wheelScore: number | null
    goal: string | null
    plan: string
  }
}): Promise<boolean> {
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID
  if (!adminChatId) {
    console.warn('[sendToMentor] ADMIN_TELEGRAM_CHAT_ID not set in .env')
    return false
  }

  const text = [
    `🤖 *Повідомлення ментору від користувача*`,
    '',
    `👤 *${payload.fromName}* (${payload.fromEmail})`,
    `📊 Стрік: ${payload.userContext.streak} дн | Рівень: ${payload.userContext.level} | Колесо: ${payload.userContext.wheelScore ?? '—'}/10`,
    `🎯 Ціль: ${payload.userContext.goal ?? 'не задана'}`,
    `💳 Тариф: ${payload.userContext.plan}`,
    '',
    `💬 *Запит:*`,
    `${payload.message}`,
    '',
    `_Відповідь надішли користувачу в Telegram або через платформу_`,
  ].join('\n')

  try {
    await sendDedupedTelegramMessage(adminChatId, text, { parse_mode: 'Markdown' })
    return true
  } catch (err) {
    console.error('[sendToMentor] Failed to send:', err)
    return false
  }
}
