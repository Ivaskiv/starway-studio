// backend/src/lib/telegram.ts
// Єдиний shared Telegram bot instance для всього backend

import crypto from 'crypto'
import { Telegraf } from 'telegraf'
import { readCoachBotToken, requireTelegramBotConfig } from '../modules/telegram-mentor/runtime/botConfig.js'

let telegramBotInstance: Telegraf | null = null
let contentBotInstance: Telegraf | null = null
let coachBotInstance: Telegraf | null = null
let testBotInstance: Telegraf | null = null

function getTelegramBotInstance(): Telegraf {
  if (telegramBotInstance) {
    return telegramBotInstance
  }

  const { token } = requireTelegramBotConfig('telegram bot bootstrap')
  telegramBotInstance = new Telegraf(token)
  return telegramBotInstance
}

function getContentBotInstance(): Telegraf {
  if (contentBotInstance) {
    return contentBotInstance
  }

  const mainToken = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
  const contentToken = String(process.env.CONTENT_BOT_TOKEN ?? '').trim()
  const token = contentToken || mainToken

  if (!token) {
    throw new Error('[Telegram] Missing required env var during content bot bootstrap: CONTENT_BOT_TOKEN or TELEGRAM_BOT_TOKEN')
  }

  if (contentToken && contentToken !== mainToken) {
    console.log('[contentBot] separate bot instance')
  } else {
    console.log('[contentBot] using shared token, send-only mode')
  }

  contentBotInstance = new Telegraf(token)
  return contentBotInstance
}

function getCoachBotInstance(): Telegraf {
  if (coachBotInstance) {
    return coachBotInstance
  }

  const token = readCoachBotToken()
  if (!token) {
    throw new Error('[Telegram] Missing required env var during coach bot bootstrap: COACH_BOT_TOKEN')
  }
  coachBotInstance = new Telegraf(token)
  return coachBotInstance
}

function getTestBotInstance(): Telegraf {
  if (testBotInstance) {
    return testBotInstance
  }

  const token = String(process.env.TEST_BOT_TOKEN ?? '').trim()
  if (!token) {
    throw new Error('[Telegram] Missing required env var during test bot bootstrap: TEST_BOT_TOKEN')
  }

  testBotInstance = new Telegraf(token)
  return testBotInstance
}

function createBotProxy(resolver: () => Telegraf): Telegraf {
  return new Proxy({} as Telegraf, {
    get(_target, property, receiver) {
      const instance = resolver()
      const value = Reflect.get(instance, property, receiver)
      return typeof value === 'function' ? value.bind(instance) : value
    },
    set(_target, property, value) {
      const instance = resolver()
      return Reflect.set(instance, property, value)
    },
    has(_target, property) {
      const instance = resolver()
      return Reflect.has(instance, property)
    },
  }) as Telegraf
}

export const bot = createBotProxy(getTelegramBotInstance)
export const contentBot = createBotProxy(getContentBotInstance)
export const coachBot = createBotProxy(getCoachBotInstance)
export const testBot = createBotProxy(getTestBotInstance)
const LAST_MESSAGE_TTL_MS = 6 * 60 * 60 * 1000
const lastMessageHashes = new Map<string, { hash: string; sentAt: number }>()

const getBotLink = () =>
  requireTelegramBotConfig('telegram bot link').botLink || 'https://t.me/'

export { getBotLink }

/**
 * Запускає бота в правильному режимі.
 * Webhook — якщо передано webhookUrl.
 * Polling — fallback, якщо webhookUrl порожній.
 * Кожен бот запускається незалежно.
 */
export async function launchBot(
  targetBot: Telegraf,
  name: string,
  webhookUrl?: string,
): Promise<void> {
  try {
    const normalizedWebhookUrl = String(webhookUrl ?? '').trim()
    if (normalizedWebhookUrl) {
      await targetBot.telegram.setWebhook(normalizedWebhookUrl)
      console.log(`✓ ${name} started [webhook]`)
      return
    }

    // Polling mode requires webhook to be cleared, otherwise Telegram keeps
    // delivering updates to webhook endpoint and getUpdates sees conflicts.
    await targetBot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => undefined)
    await targetBot.launch()
    console.log(`✓ ${name} started [polling]`)
  } catch (err) {
    console.error(`✗ ${name} failed to start:`, err)
  }
}

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
  const chatId = process.env.STARWAY_OPS_CHAT_ID?.trim()
  if (!chatId) {
    console.warn('[telegram:ops] STARWAY_OPS_CHAT_ID is not configured')
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
