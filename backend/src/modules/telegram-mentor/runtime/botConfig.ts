// botConfig.ts — єдине місце вибору Telegram bot токену.
//
// ПРАВИЛО:
//   production (NODE_ENV=production) → TELEGRAM_BOT_TOKEN     (@Test_ABsystem_bot)
//   local/dev  (NODE_ENV≠production) → TEST_TELEGRAM_BOT_TOKEN (@Test_ABsystem_bot)
//
// Жодних fallback між ними. Якщо env var відсутній — процес падає.

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
export type LocalTelegramConsumerDisableReason =
  | 'missing_test_token'
  | 'same_as_production_token'

export type LocalTelegramConsumerState = {
  enabled: boolean
  reason: LocalTelegramConsumerDisableReason | null
}

// Expected bot identities per environment — used for runtime guard in index.ts
export const EXPECTED_BOT_PRODUCTION = 'Test_ABsystem_bot'
export const EXPECTED_BOT_LOCAL      = 'Test_ABsystem_bot'

function normalizeEnv(value: string | undefined): string {
  return String(value ?? '').trim()
}

function uniqueTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens.filter(Boolean)))
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function resolveLocalTelegramConsumerState(): LocalTelegramConsumerState {
  if (isProductionRuntime()) {
    return {
      enabled: true,
      reason: null,
    }
  }

  const testToken = normalizeEnv(process.env.TEST_TELEGRAM_BOT_TOKEN)
  const productionToken = normalizeEnv(process.env.TELEGRAM_BOT_TOKEN)

  if (!testToken) {
    return {
      enabled: false,
      reason: 'missing_test_token',
    }
  }

  if (productionToken && testToken === productionToken) {
    return {
      enabled: false,
      reason: 'same_as_production_token',
    }
  }

  return {
    enabled: true,
    reason: null,
  }
}

export function describeLocalTelegramConsumerDisableReason(
  reason: LocalTelegramConsumerDisableReason | null,
): string {
  switch (reason) {
    case 'missing_test_token':
      return 'TEST_TELEGRAM_BOT_TOKEN is missing'
    case 'same_as_production_token':
      return 'TEST_TELEGRAM_BOT_TOKEN matches TELEGRAM_BOT_TOKEN'
    default:
      return 'local telegram consumer enabled'
  }
}

export function readTelegramBotConfig(): TelegramBotConfig {
  const isProd = isProductionRuntime()

  const token = isProd
    ? normalizeEnv(process.env.TELEGRAM_BOT_TOKEN)
    : normalizeEnv(process.env.TEST_TELEGRAM_BOT_TOKEN)

  const username = isProd
    ? normalizeEnv(process.env.TELEGRAM_BOT_USERNAME)
    : normalizeEnv(process.env.TEST_TELEGRAM_BOT_USERNAME)

  return {
    token,
    username,
    botLink: username ? `https://t.me/${username}` : '',
  }
}

export function readTelegramVerificationTokens(): string[] {
  const runtimeToken = readTelegramBotConfig().token

  return uniqueTokens([
    runtimeToken,
    normalizeEnv(process.env.TELEGRAM_BOT_TOKEN),
    normalizeEnv(process.env.TEST_TELEGRAM_BOT_TOKEN),
    normalizeEnv(process.env.CONTENT_BOT_TOKEN),
    normalizeEnv(process.env.COACH_BOT_TOKEN),
    normalizeEnv(process.env.TEST_BOT_TOKEN),
  ])
}

export function resolveTelegramDeliveryMode(): TelegramDeliveryMode {
  // production → завжди webhook; local → завжди polling
  if (isProductionRuntime()) {
    return 'webhook'
  }

  // Дозволяємо явне override тільки для локальних тестів webhook
  const explicit = normalizeEnv(process.env.TELEGRAM_DELIVERY_MODE).toLowerCase()
  if (explicit === 'webhook') {
    return 'webhook'
  }

  return 'polling'
}

export function readTelegramBotNames(): TelegramBotNames {
  return {
    main:  normalizeEnv(process.env.TELEGRAM_BOT_NAME)  || 'Starway Main',
    coach: normalizeEnv(process.env.COACH_BOT_NAME)     || 'Starway DNA Coach',
    test:  normalizeEnv(process.env.TEST_BOT_NAME)       || 'Starway Test',
  }
}

export function requireTelegramBotConfig(context = 'startup'): TelegramBotConfig {
  const config = readTelegramBotConfig()
  const isProd = isProductionRuntime()

  if (!config.token) {
    const envVar = isProd ? 'TELEGRAM_BOT_TOKEN' : 'TEST_TELEGRAM_BOT_TOKEN'
    throw new Error(
      `[Telegram] Missing required env var during ${context}: ${envVar}`
    )
  }

  if (!config.username) {
    const envVar = isProd ? 'TELEGRAM_BOT_USERNAME' : 'TEST_TELEGRAM_BOT_USERNAME'
    console.warn(
      `[Telegram] ${envVar} is missing during ${context}; bot links will be degraded`
    )
  }

  return config
}

export function readCoachBotToken(): string {
  return normalizeEnv(process.env.COACH_BOT_TOKEN)
}
