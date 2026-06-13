export type TelegramBotConfig = {
  token: string
  username: string
  botLink: string
}

export type TelegramBotNames = {
  main: string
  coach: string
  test: string
}

export type TelegramDeliveryMode = 'polling' | 'webhook'

function normalizeEnv(value: string | undefined): string {
  return String(value ?? '').trim()
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production'
}

function readTelegramToken(preferLocal: boolean): string {
  if (preferLocal) {
    return (
      normalizeEnv(process.env.TELEGRAM_LOCAL_BOT_TOKEN) ||
      normalizeEnv(process.env.TELEGRAM_BOT_TOKEN)
    )
  }

  return normalizeEnv(process.env.TELEGRAM_BOT_TOKEN)
}

function readTelegramUsername(preferLocal: boolean): string {
  if (preferLocal) {
    return (
      normalizeEnv(process.env.TELEGRAM_LOCAL_BOT_USERNAME) ||
      normalizeEnv(process.env.TELEGRAM_BOT_USERNAME)
    )
  }

  return normalizeEnv(process.env.TELEGRAM_BOT_USERNAME)
}

export function resolveTelegramDeliveryMode(): TelegramDeliveryMode {
  const explicit = normalizeEnv(process.env.TELEGRAM_DELIVERY_MODE).toLowerCase()
  if (explicit === 'polling' || explicit === 'webhook') {
    return explicit
  }

  if (normalizeEnv(process.env.TELEGRAM_WEBHOOK_URL)) {
    return 'webhook'
  }

  return 'polling'
}

export function readTelegramBotConfig(): TelegramBotConfig {
  const preferLocal = !isProductionRuntime()
  const token = readTelegramToken(preferLocal)
  const username = readTelegramUsername(preferLocal)

  return {
    token,
    username,
    botLink: username ? `https://t.me/${username}` : '',
  }
}

export function readTelegramBotNames(): TelegramBotNames {
  return {
    main: normalizeEnv(process.env.TELEGRAM_BOT_NAME) || 'Starway Main',
    coach: normalizeEnv(process.env.COACH_BOT_NAME) || 'Starway DNA Coach',
    test: normalizeEnv(process.env.TEST_BOT_NAME) || 'Starway Test',
  }
}

export function requireTelegramBotConfig(context = 'startup'): TelegramBotConfig {
  const config = readTelegramBotConfig()
  if (!config.token) {
    throw new Error(
      `[Telegram] Missing required env var during ${context}: TELEGRAM_BOT_TOKEN`,
    )
  }

  if (!config.username) {
    console.warn(
      `[Telegram] TELEGRAM_BOT_USERNAME is missing during ${context}; bot links will be degraded until it is configured`,
    )
  }

  return config
}

export function readCoachBotToken(): string {
  return normalizeEnv(process.env.COACH_BOT_TOKEN)
}
