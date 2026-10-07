import type { Telegraf } from 'telegraf'

import { launchBot } from '../lib/telegram.js'
import { assertTelegramBotIdentity } from '../modules/telegram-mentor/runtime/botConfig.js'
import { buildZoomCalendarUrl } from '../modules/zoom/urls.js'
import { syncTelegramWebhookContract } from './telegramWebhookSync.js'

type RunningMode = 'webhook' | 'polling'

type StartupLogger = Pick<typeof console, 'log' | 'warn' | 'error'>

type ZoomRole = 'user' | 'coach'

type PersistentZoomCalendarMenu = {
  type: 'web_app'
  text: 'ZOOM КАЛЕНДАР'
  web_app: { url: string }
}

const MENU_VERIFICATION_ATTEMPTS = 7
const MENU_VERIFICATION_RETRY_DELAY_MS = 400
const PRIVATE_MENU_ENSURE_TTL_MS = 60_000

type ZoomMenuVerificationTarget = {
  chatId?: number
}

type CachedPrivateMenu = {
  url: string
  expiresAt: number
}

const privateMenuCache = new WeakMap<Telegraf, Map<string, CachedPrivateMenu>>()

type MainTelegramConsumerInput = {
  bot: Telegraf
  botName: string
  telegramBotConfig: {
    token: string
    username: string
  }
  expectedUsername: string
  deliveryMode: RunningMode
  buildSha: string
  webhookUrl: string
  webhookSecret: string
  setRunningMode: (mode: RunningMode) => void
  logger?: StartupLogger
  syncTelegramWebhookContractFn?: typeof syncTelegramWebhookContract
  launchBotFn?: typeof launchBot
}

type CoachTelegramConsumerInput = {
  coachToken: string
  coachBot: Telegraf
  botName: string
  webhookUrl: string
  webhookSecret: string
  setRunningMode: (mode: RunningMode) => void
  logger?: StartupLogger
  launchBotFn?: typeof launchBot
}

type InteractiveTelegramConsumersInput = {
  main: MainTelegramConsumerInput
  coach?: CoachTelegramConsumerInput | null
  logger?: StartupLogger
  setMainRunningMode: (mode: RunningMode | null) => void
}

function resolveLogger(logger?: StartupLogger): StartupLogger {
  return logger ?? console
}

function isDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function safeStartupErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return String(error)
}

/*
 * USER ZOOM MENU CONTRACT — FROZEN
 * Conversation flows must never replace or remove this menu.
 */
function buildPersistentZoomCalendarMenu(zoomRole: ZoomRole): PersistentZoomCalendarMenu {
  const calendarUrl = new URL(buildZoomCalendarUrl())
  calendarUrl.searchParams.set('zoomRole', zoomRole)

  return {
    type: 'web_app' as const,
    text: 'ZOOM КАЛЕНДАР',
    web_app: {
      url: calendarUrl.toString(),
    },
  }
}

function isExpectedPersistentZoomCalendarMenu(
  actualMenu: unknown,
  expectedMenu: PersistentZoomCalendarMenu,
): boolean {
  if (!actualMenu || typeof actualMenu !== 'object') return false

  const actual = actualMenu as {
    type?: unknown
    text?: unknown
    web_app?: { url?: unknown }
  }

  return actual.type === expectedMenu.type
    && actual.text === expectedMenu.text
    && actual.web_app?.url === expectedMenu.web_app.url
}

function waitForMenuVerification(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs))
}

async function setPersistentZoomCalendarMenu(
  bot: Telegraf,
  expectedMenu: PersistentZoomCalendarMenu,
  target: ZoomMenuVerificationTarget = {},
): Promise<void> {
  await bot.telegram.setChatMenuButton({
    ...(target.chatId === undefined ? {} : { chatId: target.chatId }),
    menuButton: expectedMenu,
  })
}

function getPersistentZoomCalendarMenu(
  bot: Telegraf,
  target: ZoomMenuVerificationTarget = {},
) {
  return target.chatId === undefined
    ? bot.telegram.getChatMenuButton()
    : bot.telegram.getChatMenuButton({ chatId: target.chatId })
}

export async function verifyPersistentZoomCalendarMenu(
  bot: Telegraf,
  expectedMenu: PersistentZoomCalendarMenu,
  options: { attempts?: number; retryDelayMs?: number; chatId?: number } = {},
): Promise<void> {
  const attempts = options.attempts ?? MENU_VERIFICATION_ATTEMPTS
  const retryDelayMs = options.retryDelayMs ?? MENU_VERIFICATION_RETRY_DELAY_MS
  let lastMenu: unknown = null
  let lastError: unknown = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMenu = await getPersistentZoomCalendarMenu(bot, { chatId: options.chatId })
      lastError = null
      if (isExpectedPersistentZoomCalendarMenu(lastMenu, expectedMenu)) return
    } catch (error) {
      lastError = error
    }

    if (attempt < attempts) {
      await setPersistentZoomCalendarMenu(bot, expectedMenu, { chatId: options.chatId })
      await waitForMenuVerification(retryDelayMs * attempt)
    }
  }

  const observed = lastMenu && typeof lastMenu === 'object'
    ? JSON.stringify(lastMenu)
    : null
  const reason = lastError ? safeStartupErrorMessage(lastError) : observed
  throw new Error(
    `Telegram did not persist the expected Zoom Calendar default menu after ${attempts} readbacks; expected=${expectedMenu.web_app.url}; observed=${reason ?? 'no menu returned'}`,
  )
}

function isPrivateChatWithId(ctx: { chat?: { id?: string | number; type?: string } }): ctx is {
  chat: { id: string | number; type: 'private' }
} {
  return ctx.chat?.type === 'private' && Number.isFinite(Number(ctx.chat.id))
}

export async function applyZoomMenuForChat(
  bot: Telegraf,
  chatId: string | number | undefined,
  logger: StartupLogger,
  options: { zoomRole?: ZoomRole; force?: boolean } = {},
): Promise<void> {
  const zoomRole = options.zoomRole ?? 'user'
  const normalizedChatId = chatId === undefined ? undefined : String(chatId)
  const expectedMenu = buildPersistentZoomCalendarMenu(zoomRole)

  if (normalizedChatId && !options.force) {
    const cachedMenu = privateMenuCache.get(bot)?.get(normalizedChatId)
    if (cachedMenu?.url === expectedMenu.web_app.url && cachedMenu.expiresAt > Date.now()) {
      return
    }
  }

  try {
    const target = normalizedChatId ? { chatId: Number(normalizedChatId) } : {}
    await setPersistentZoomCalendarMenu(bot, expectedMenu, target)

    if (normalizedChatId && (options.force || process.env.NODE_ENV !== 'production')) {
      await verifyPersistentZoomCalendarMenu(bot, expectedMenu, {
        ...target,
        attempts: options.force ? MENU_VERIFICATION_ATTEMPTS : 2,
        retryDelayMs: options.force ? MENU_VERIFICATION_RETRY_DELAY_MS : 0,
      })
      logger.log('[ZOOM_MENU_VERIFY]', {
        type: expectedMenu.type,
        text: expectedMenu.text,
        urlHost: new URL(expectedMenu.web_app.url).host,
        matchesExpectedMenu: true,
      })
    }

    if (normalizedChatId) {
      const cache = privateMenuCache.get(bot) ?? new Map<string, CachedPrivateMenu>()
      cache.set(normalizedChatId, {
        url: expectedMenu.web_app.url,
        expiresAt: Date.now() + PRIVATE_MENU_ENSURE_TTL_MS,
      })
      privateMenuCache.set(bot, cache)
    }
  } catch (error) {
    if (normalizedChatId) {
      logger.warn('[TELEGRAM_ZOOM_MENU_CHAT_REFRESH_FAILED]', {
        chatId: normalizedChatId,
        error: safeStartupErrorMessage(error),
      })
      return
    }
    throw error
  }
}

async function configurePersistentZoomCalendarMenu(
  bot: Telegraf,
  zoomRole: ZoomRole,
  logger: StartupLogger,
): Promise<void> {
  const expectedMenu = buildPersistentZoomCalendarMenu(zoomRole)
  try {
    await applyZoomMenuForChat(bot, undefined, logger, { zoomRole })

    /*
     * Do not treat a successful SET request as proof.
     * Read the state back from Telegram immediately.
     */
    await verifyPersistentZoomCalendarMenu(bot, expectedMenu)

    logger.log('[TELEGRAM_ZOOM_MENU_READY]', {
      role: zoomRole,
      type: expectedMenu.type,
      text: expectedMenu.text,
      url: expectedMenu.web_app.url,
    })
  } catch (error) {
    if (isDevelopmentRuntime()) {
      logger.warn('[TELEGRAM_ZOOM_MENU_CONFIGURATION_WARNING]', {
        role: zoomRole,
        environment: process.env.NODE_ENV,
        expectedUrl: expectedMenu.web_app.url,
        observedMenu: safeStartupErrorMessage(error),
      })
      return
    }

    logger.error('[TELEGRAM_ZOOM_MENU_CONFIGURATION_ERROR]', {
      role: zoomRole,
      error: safeStartupErrorMessage(error),
    })

    /*
     * This is part of the bot navigation contract.
     * Do not report the consumer as READY when Telegram rejected
     * or failed to persist the canonical Zoom Calendar menu.
     */
    throw error
  }
}

function isStartCommand(ctx: { message?: unknown }): boolean {
  const message = ctx.message
  if (!message || typeof message !== 'object' || !('text' in message)) return false

  const text = (message as { text?: unknown }).text
  return typeof text === 'string' && /^\/start(?:\s|$)/.test(text.trim())
}

export function registerZoomMenuAfterHandlerEnforcement(
  bot: Telegraf,
  options: { zoomRole: ZoomRole },
  logger: StartupLogger = console,
): void {
  bot.use(async (ctx, next) => {
    if (isPrivateChatWithId(ctx)) {
      await applyZoomMenuForChat(bot, ctx.chat.id, logger, {
        ...options,
        force: isStartCommand(ctx),
      })
    }
    await next()
  })
}

async function configureMainBotCommands(
  bot: Telegraf,
  logger: StartupLogger,
): Promise<void> {
  /*
   * Zoom Calendar is a required navigation contract.
   * Failure must propagate.
   */
  await configurePersistentZoomCalendarMenu(bot, 'user', logger)

  /*
   * Telegram slash commands are secondary setup.
   * Preserve the existing non-fatal behavior for these commands.
   */
  await bot.telegram
    .setMyCommands([
      {
        command: 'privacy',
        description: 'Політика конфіденційності чат-бота',
      },
    ])
    .catch((error) => {
      logger.warn('⚠️ [Telegram] Failed to set global commands:', error)
    })

  await bot.telegram
    .setMyCommands(
      [
        {
          command: 'privacy',
          description: 'Політика конфіденційності чат-бота',
        },
      ],
      {
        scope: { type: 'all_private_chats' },
      },
    )
    .catch((error) => {
      logger.warn('⚠️ [Telegram] Failed to set private chat commands:', error)
    })

  await bot.telegram
    .setMyCommands(
      [
        {
          command: 'privacy',
          description: 'Політика конфіденційності чат-бота',
        },
      ],
      {
        scope: { type: 'all_group_chats' },
      },
    )
    .catch((error) => {
      logger.warn('⚠️ [Telegram] Failed to set group chat commands:', error)
    })

  await bot.telegram
    .setMyCommands(
      [
        {
          command: 'privacy',
          description: 'Політика конфіденційності чат-бота',
        },
      ],
      {
        scope: { type: 'all_chat_administrators' },
      },
    )
    .catch((error) => {
      logger.warn('⚠️ [Telegram] Failed to set admin chat commands:', error)
    })
}

export async function startMainTelegramConsumer({
  bot,
  botName,
  telegramBotConfig,
  expectedUsername,
  deliveryMode,
  buildSha,
  webhookUrl,
  webhookSecret,
  setRunningMode,
  logger,
  syncTelegramWebhookContractFn = syncTelegramWebhookContract,
  launchBotFn = launchBot,
}: MainTelegramConsumerInput): Promise<void> {
  const resolvedLogger = resolveLogger(logger)

  /*
   * Verify that menu configuration is being applied to the expected
   * USER bot, not merely to some valid Telegram client.
   */
  const me = await bot.telegram.getMe()

  assertTelegramBotIdentity(
    me.username,
    expectedUsername,
    'telegram startup identity verification',
  )

  resolvedLogger.log('[TELEGRAM_RUNTIME]', {
    role: 'user',
    env: process.env.NODE_ENV || 'development',
    username: me.username || telegramBotConfig.username || 'unknown',
    deliveryMode,
    buildSha,
  })

  await configureMainBotCommands(bot, resolvedLogger)

  if (webhookUrl) {
    await syncTelegramWebhookContractFn({
      bot,
      botName: 'main',
      webhookUrl,
      webhookSecret,
    })

    setRunningMode('webhook')

    resolvedLogger.log('[TELEGRAM_MAIN_READY]', {
      username: me.username || telegramBotConfig.username || 'unknown',
      deliveryMode: 'webhook',
      buildSha,
    })

    resolvedLogger.log(
      `🤖 Interactive Telegram ready @${telegramBotConfig.username} [webhook]`,
    )

    return
  }

  await bot.telegram
    .deleteWebhook({ drop_pending_updates: false })
    .catch(() => undefined)

  await launchBotFn(bot, botName)

  setRunningMode('polling')

  resolvedLogger.log('[TELEGRAM_MAIN_READY]', {
    username: me.username || telegramBotConfig.username || 'unknown',
    deliveryMode: 'polling',
    buildSha,
  })
}

export async function startCoachTelegramConsumer({
  coachToken,
  coachBot,
  botName,
  webhookUrl,
  webhookSecret,
  setRunningMode,
  logger,
  launchBotFn = launchBot,
}: CoachTelegramConsumerInput): Promise<void> {
  if (!coachToken) {
    return
  }

  const resolvedLogger = resolveLogger(logger)

  /*
   * Resolve the real Telegram identity before configuring navigation.
   * Do not log the token.
   */
  const me = await coachBot.telegram.getMe()

  resolvedLogger.log('[TELEGRAM_COACH_RUNTIME]', {
    role: 'coach',
    username: me.username || 'unknown',
    deliveryMode: webhookUrl ? 'webhook' : 'polling',
  })

  /*
   * Configure and verify the canonical bot-level menu before reporting
   * the Coach consumer as running.
   */
  await configurePersistentZoomCalendarMenu(
    coachBot,
    'coach',
    resolvedLogger,
  )

  await launchBotFn(
    coachBot,
    botName,
    webhookUrl || undefined,
    {
      webhookSecret: webhookSecret || undefined,
    },
  )

  setRunningMode(webhookUrl ? 'webhook' : 'polling')

  resolvedLogger.log('[TELEGRAM_COACH_READY]', {
    username: me.username || 'unknown',
    deliveryMode: webhookUrl ? 'webhook' : 'polling',
  })
}

export async function startInteractiveTelegramConsumers({
  main,
  coach,
  logger,
  setMainRunningMode,
}: InteractiveTelegramConsumersInput): Promise<void> {
  const resolvedLogger = resolveLogger(logger)

  try {
    await startMainTelegramConsumer({
      ...main,
      logger: main.logger ?? resolvedLogger,
    })
  } catch (error) {
    setMainRunningMode(null)

    resolvedLogger.error('[TELEGRAM_MAIN_STARTUP_FATAL]', {
      error: safeStartupErrorMessage(error),
    })

    throw error
  }

  if (!coach?.coachToken) {
    return
  }

  await startCoachTelegramConsumer({
    ...coach,
    logger: coach.logger ?? resolvedLogger,
  }).catch((error) => {
    resolvedLogger.error('[TELEGRAM_COACH_STARTUP_ERROR]', {
      error: safeStartupErrorMessage(error),
    })
  })
}
