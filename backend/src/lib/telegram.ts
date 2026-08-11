// backend/src/lib/telegram.ts
// Єдиний shared Telegram bot instance для всього backend

import crypto from 'crypto'
import { Telegraf } from 'telegraf'
import {
  formatTelegramCaption,
  formatTelegramMessage,
} from './telegram/messageFormatter.js'
import {
  readCoachBotToken,
  requireTelegramBotConfig,
  resolveTelegramDeliveryMode,
} from '../modules/telegram-mentor/runtime/botConfig.js'

let telegramBotInstance: Telegraf | null = null
let contentBotInstance: Telegraf | null = null
let coachBotInstance: Telegraf | null = null
let testBotInstance: Telegraf | null = null

function patchTelegramTransportFormatting(targetBot: Telegraf): Telegraf {
  const telegram = targetBot.telegram as typeof targetBot.telegram & {
    __starwayFormattingPatched__?: boolean
  }

  if (telegram.__starwayFormattingPatched__) {
    return targetBot
  }

  telegram.__starwayFormattingPatched__ = true

  const originalSendMessage = telegram.sendMessage.bind(telegram)
  const originalSendPhoto = telegram.sendPhoto.bind(telegram)
  const originalSendVoice = telegram.sendVoice.bind(telegram)
  const originalSendVideo = telegram.sendVideo.bind(telegram)
  const originalSendDocument = telegram.sendDocument.bind(telegram)

  telegram.sendMessage = (async (
    chatId: string | number,
    text: string,
    options?: Record<string, unknown>,
  ) => {
    const formatted =
      options?.parse_mode === 'HTML'
        ? formatTelegramMessage({
            text,
            preformatted: true,
          })
        : formatTelegramMessage(text)

    return originalSendMessage(chatId, formatted.text, {
      ...options,
      parse_mode: formatted.parseMode,
    })
  }) as typeof telegram.sendMessage

  telegram.sendPhoto = (async (
    chatId: string | number,
    photo: string,
    options?: Record<string, unknown>,
  ) => {
    const caption = formatTelegramCaption(
      typeof options?.caption === 'string' ? options.caption : '',
      typeof options?.parse_mode === 'string' ? options.parse_mode : null,
    )

    return originalSendPhoto(chatId, photo, {
      ...options,
      ...(caption
        ? {
            caption: caption.text,
            parse_mode: caption.parseMode,
          }
        : {}),
    })
  }) as typeof telegram.sendPhoto

  telegram.sendVoice = (async (
    chatId: string | number,
    voice: string,
    options?: Record<string, unknown>,
  ) => {
    const caption = formatTelegramCaption(
      typeof options?.caption === 'string' ? options.caption : '',
      typeof options?.parse_mode === 'string' ? options.parse_mode : null,
    )

    return originalSendVoice(chatId, voice, {
      ...options,
      ...(caption
        ? {
            caption: caption.text,
            parse_mode: caption.parseMode,
          }
        : {}),
    })
  }) as typeof telegram.sendVoice

  telegram.sendVideo = (async (
    chatId: string | number,
    video: string,
    options?: Record<string, unknown>,
  ) => {
    const caption = formatTelegramCaption(
      typeof options?.caption === 'string' ? options.caption : '',
      typeof options?.parse_mode === 'string' ? options.parse_mode : null,
    )

    return originalSendVideo(chatId, video, {
      ...options,
      ...(caption
        ? {
            caption: caption.text,
            parse_mode: caption.parseMode,
          }
        : {}),
    })
  }) as typeof telegram.sendVideo

  telegram.sendDocument = (async (
    chatId: string | number,
    document: string,
    options?: Record<string, unknown>,
  ) => {
    const caption = formatTelegramCaption(
      typeof options?.caption === 'string' ? options.caption : '',
      typeof options?.parse_mode === 'string' ? options.parse_mode : null,
    )

    return originalSendDocument(chatId, document, {
      ...options,
      ...(caption
        ? {
            caption: caption.text,
            parse_mode: caption.parseMode,
          }
        : {}),
    })
  }) as typeof telegram.sendDocument

  return targetBot
}

function getTelegramBotInstance(): Telegraf {
  if (telegramBotInstance) {
    return telegramBotInstance
  }

  const { token } = requireTelegramBotConfig('telegram bot bootstrap')
  telegramBotInstance = new Telegraf(token)
  return patchTelegramTransportFormatting(telegramBotInstance)
}

function readTelegramApiRoot(envKey: string): string {
  const value = String(process.env[envKey as keyof NodeJS.ProcessEnv] ?? '').trim()
  return value || 'https://api.telegram.org'
}

export function normalizeTelegramWebhookUrl(
  baseUrl: string,
  endpointPath = '/api/telegram/webhook',
): string {
  const trimmedBaseUrl = String(baseUrl ?? '').trim().replace(/\/+$/, '')
  if (!trimmedBaseUrl) {
    return ''
  }

  const normalizedEndpointPath = endpointPath.startsWith('/')
    ? endpointPath
    : `/${endpointPath}`

  try {
    const url = new URL(trimmedBaseUrl)
    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/'

    if (normalizedPath.endsWith(normalizedEndpointPath)) {
      return url.toString().replace(/\/$/, '')
    }

    if (normalizedPath === '/api') {
      url.pathname = normalizedEndpointPath
      return url.toString().replace(/\/$/, '')
    }

    if (normalizedPath === '/') {
      url.pathname = normalizedEndpointPath
      return url.toString().replace(/\/$/, '')
    }

    url.pathname = `${normalizedPath}${normalizedEndpointPath}`
    return url.toString().replace(/\/$/, '')
  } catch {
    if (trimmedBaseUrl.endsWith(normalizedEndpointPath)) {
      return trimmedBaseUrl
    }

    if (trimmedBaseUrl.endsWith('/api')) {
      return `${trimmedBaseUrl}${normalizedEndpointPath.slice('/api'.length)}`
    }

    return `${trimmedBaseUrl}${normalizedEndpointPath}`
  }
}

export function normalizeTelegramChatIdForBotApi(chatId: string): string {
  const trimmed = String(chatId ?? '').trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('-')) {
    return trimmed
  }

  if (/^\d{10,}$/.test(trimmed)) {
    return `-100${trimmed}`
  }

  return trimmed
}

export type TelegramWebhookBotId = 'main' | 'coach' | 'test'

type TelegramWebhookSecretInput = {
  botId: TelegramWebhookBotId
  token: string
}

function readTelegramWebhookSecretSeed(): string {
  const botTokenSecretKey = String(process.env.BOT_TOKEN_SECRET_KEY ?? '').trim()
  if (botTokenSecretKey.length === 64) {
    return botTokenSecretKey
  }

  const legacyWebhookSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim()
  if (legacyWebhookSecret) {
    return legacyWebhookSecret
  }

  return ''
}

export function readTestBotToken(): string {
  return String(process.env.TEST_BOT_TOKEN ?? '').trim()
}

export function resolveTelegramWebhookSecret({
  botId,
  token,
}: TelegramWebhookSecretInput): string {
  const normalizedToken = String(token ?? '').trim()
  if (!normalizedToken) {
    return ''
  }

  if (botId === 'main') {
    const legacyWebhookSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim()
    if (legacyWebhookSecret) {
      return legacyWebhookSecret
    }
  }

  const seed = readTelegramWebhookSecretSeed()
  if (!seed) {
    return ''
  }

  return crypto
    .createHmac('sha256', seed)
    .update(`${botId}:${normalizedToken}`)
    .digest('hex')
}

export function resolveTelegramWebhookSecretMap(): Partial<Record<TelegramWebhookBotId, string>> {
  const mainToken = requireTelegramBotConfig('telegram webhook secret map').token
  const coachToken = readCoachBotToken()
  const testToken = readTestBotToken()

  return {
    main: resolveTelegramWebhookSecret({ botId: 'main', token: mainToken }),
    coach: coachToken
      ? resolveTelegramWebhookSecret({ botId: 'coach', token: coachToken })
      : '',
    test: testToken
      ? resolveTelegramWebhookSecret({ botId: 'test', token: testToken })
      : '',
  }
}

function getContentBotInstance(): Telegraf {
  if (contentBotInstance) {
    return contentBotInstance
  }

  const mainToken = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
  const contentToken = String(process.env.CONTENT_BOT_TOKEN ?? '').trim()
  const token = contentToken || mainToken
  const apiRoot = readTelegramApiRoot('CONTENT_BOT_API_ROOT')

  if (!token) {
    throw new Error('[Telegram] Missing required env var during content bot bootstrap: CONTENT_BOT_TOKEN or TELEGRAM_BOT_TOKEN')
  }

  if (contentToken && contentToken !== mainToken) {
    console.log('[contentBot] separate bot instance')
  } else {
    console.log('[contentBot] using shared token, send-only mode')
  }

  contentBotInstance = new Telegraf(token, {
    telegram: {
      apiRoot,
    },
  })
  return patchTelegramTransportFormatting(contentBotInstance)
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
  return patchTelegramTransportFormatting(coachBotInstance)
}

function getTestBotInstance(): Telegraf {
  if (testBotInstance) {
    return testBotInstance
  }

  const token = readTestBotToken()
  if (!token) {
    throw new Error('[Telegram] Missing required env var during test bot bootstrap: TEST_BOT_TOKEN')
  }

  testBotInstance = new Telegraf(token)
  return patchTelegramTransportFormatting(testBotInstance)
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

type SeedableTelegraf = Telegraf & { botInfo?: unknown }

export function seedBotInfo(
  targetBot: Telegraf,
  input: {
    id?: number
    firstName: string
    username: string
  },
): void {
  const botInfo = {
    id: input.id ?? 0,
    is_bot: true as const,
    first_name: input.firstName,
    username: input.username,
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
  }

  ;(targetBot as SeedableTelegraf).botInfo = botInfo
}

export const bot = createBotProxy(getTelegramBotInstance)
export const contentBot = createBotProxy(getContentBotInstance)
export const coachBot = createBotProxy(getCoachBotInstance)
export const testBot = createBotProxy(getTestBotInstance)
const LAST_MESSAGE_TTL_MS = 6 * 60 * 60 * 1000
const lastMessageHashes = new Map<string, { hash: string; sentAt: number }>()

function destroyTelegramTransportClient(client: Telegraf | null): void {
  if (!client) return

  const options = client.telegram?.options as {
    agent?: unknown
    attachmentAgent?: unknown
  } | undefined

  for (const agent of [options?.agent, options?.attachmentAgent]) {
    if (!agent || typeof agent !== 'object') continue

    const maybeDestroy = (agent as { destroy?: () => void }).destroy
    if (typeof maybeDestroy === 'function') {
      maybeDestroy.call(agent)
    }
  }
}

export function destroyTelegramClientTransports(): void {
  destroyTelegramTransportClient(telegramBotInstance)
  destroyTelegramTransportClient(contentBotInstance)
  destroyTelegramTransportClient(coachBotInstance)
  destroyTelegramTransportClient(testBotInstance)
}

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
  options?: {
    botId?: TelegramWebhookBotId
    webhookSecret?: string
  },
): Promise<void> {
  try {
    seedBotInfo(targetBot, {
      firstName: name,
      username: name.toLowerCase().replace(/\s+/g, '_'),
    })
    const deliveryMode = resolveTelegramDeliveryMode()
    const isTestBot = options?.botId === 'test'
    const normalizedWebhookUrl = String(webhookUrl ?? '').trim()
    const shouldUseWebhook =
      normalizedWebhookUrl
      && (!isTestBot || deliveryMode === 'webhook')

    if (shouldUseWebhook) {
      const webhookSecret = String(options?.webhookSecret ?? '').trim()
      await targetBot.telegram.setWebhook(normalizedWebhookUrl, {
        ...(webhookSecret ? { secret_token: webhookSecret } : {}),
      })
      console.log(`✓ ${name} started [webhook]`)
      return
    }

    if (isTestBot && normalizedWebhookUrl && deliveryMode !== 'webhook') {
      console.warn('[Telegram] Ignoring deprecated TEST_BOT_WEBHOOK_URL because test bot uses polling mode')
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
  transportBot: Telegraf = bot,
): Promise<boolean> {
  const normalizedOptions = options
    ? JSON.stringify(options)
    : ''
  const hash = crypto
    .createHash('sha256')
    .update(`${text}::${normalizedOptions}`)
    .digest('hex')
  const now = Date.now()
  const last = lastMessageHashes.get(chatId)

  if (last && last.hash === hash && now - last.sentAt < LAST_MESSAGE_TTL_MS) {
    console.info(`[Telegram] Skip duplicate message chatId=${chatId}`)
    return false
  }

  await transportBot.telegram.sendMessage(chatId, text, options)
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
  routeMeta?: {
    messageType?: string
    source?: string
  },
): Promise<boolean> {
  const rawChatId =
    process.env.STARWAY_OPS_CHAT_ID?.trim() ||
    process.env.OPS_TELEGRAM_CHAT_ID?.trim() ||
    ''
  const chatId = normalizeTelegramChatIdForBotApi(rawChatId)
  if (!chatId) {
    console.warn('[telegram:ops] STARWAY_OPS_CHAT_ID / OPS_TELEGRAM_CHAT_ID is not configured')
    return false
  }

  const messageType =
    routeMeta?.messageType?.trim() ||
    text.split('\n')[0]?.trim() ||
    'ops_message'
  const source = routeMeta?.source?.trim() || 'sendOpsTelegramMessage'
  const botName = 'coachBot'

  console.info(
    `[OPS_ROUTE_DEBUG] messageType=${messageType} chatId=${chatId} source=${source} bot=${botName}`,
  )

  try {
    const sent = await sendDedupedTelegramMessage(chatId, text, options, coachBot)
    console.info(
      `[OPS_ROUTE_OK] messageType=${messageType} chatId=${chatId} source=${source} bot=${botName} delivered=${sent}`,
    )
    return sent
  } catch (error) {
    console.error(
      `[OPS_ROUTE_ERROR] messageType=${messageType} chatId=${chatId} source=${source} bot=${botName}`,
      error,
    )
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
