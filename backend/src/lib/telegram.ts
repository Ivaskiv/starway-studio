// backend/src/lib/telegram.ts
// Єдиний shared Telegram bot instance для всього backend

import crypto from 'crypto'
import { Telegraf } from 'telegraf'
import { requireTelegramBotConfig } from '../modules/telegram-mentor/runtime/botConfig.js'

let telegramBotInstance: Telegraf | null = null

function getTelegramBotInstance(): Telegraf {
  if (telegramBotInstance) {
    return telegramBotInstance
  }

  const { token } = requireTelegramBotConfig('telegram bot bootstrap')
  telegramBotInstance = new Telegraf(token)
  return telegramBotInstance
}

export const bot = new Proxy({} as Telegraf, {
  get(_target, property, receiver) {
    const instance = getTelegramBotInstance()
    const value = Reflect.get(instance, property, receiver)
    return typeof value === 'function' ? value.bind(instance) : value
  },
  set(_target, property, value) {
    const instance = getTelegramBotInstance()
    return Reflect.set(instance, property, value)
  },
  has(_target, property) {
    const instance = getTelegramBotInstance()
    return Reflect.has(instance, property)
  },
}) as Telegraf
const LAST_MESSAGE_TTL_MS = 6 * 60 * 60 * 1000
const lastMessageHashes = new Map<string, { hash: string; sentAt: number }>()

const getBotLink = () =>
  requireTelegramBotConfig('telegram bot link').botLink || 'https://t.me/'

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

export async function sendUserTelegramMessage(
  chatId: string,
  text: string,
  options?: Parameters<typeof bot.telegram.sendMessage>[2],
): Promise<boolean> {
  return sendDedupedTelegramMessage(chatId, text, options)
}

export async function sendOpsTelegramMessage(
  text: string,
  options?: Parameters<typeof bot.telegram.sendMessage>[2],
): Promise<boolean> {
  const chatId = process.env.OPS_TELEGRAM_CHAT_ID?.trim()
  if (!chatId) {
    console.warn('[telegram:ops] OPS_TELEGRAM_CHAT_ID is not configured')
    return false
  }

  try {
    return await sendDedupedTelegramMessage(chatId, text, options)
  } catch (error) {
    console.error('[telegram:ops] Failed to send OPS message', error)
    return false
  }
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
