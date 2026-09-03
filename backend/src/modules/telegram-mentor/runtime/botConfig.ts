// botConfig.ts — єдине місце вибору Telegram bot токену.
//
// ПРАВИЛО:
//   production (NODE_ENV=production) → TELEGRAM_BOT_TOKEN
//   local/dev  (NODE_ENV≠production) → TEST_TELEGRAM_BOT_TOKEN
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
  | 'same_as_content_token'
  | 'same_as_coach_token'

export type LocalTelegramConsumerState = {
  enabled: boolean
  reason: LocalTelegramConsumerDisableReason | null
}

function normalizeEnv(value: string | undefined): string {
  return String(value ?? '').trim()
}

function uniqueTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens.filter(Boolean)))
}

const LOCAL_TELEGRAM_USERNAME = 'test_starway_bot'

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production'
}

function resolveRuntimeTokenEnvKey(): 'TELEGRAM_BOT_TOKEN' | 'TEST_TELEGRAM_BOT_TOKEN' {
  return isProductionRuntime() ? 'TELEGRAM_BOT_TOKEN' : 'TEST_TELEGRAM_BOT_TOKEN'
}

function resolveRuntimeUsernameEnvKey():
  | 'TELEGRAM_BOT_USERNAME'
  | 'TEST_TELEGRAM_BOT_USERNAME' {
  return isProductionRuntime()
    ? 'TELEGRAM_BOT_USERNAME'
    : 'TEST_TELEGRAM_BOT_USERNAME'
}

function resolveLocalTelegramTokenCollision(): LocalTelegramConsumerDisableReason | null {
  if (isProductionRuntime()) {
    return null
  }

  const testToken = normalizeEnv(process.env.TEST_TELEGRAM_BOT_TOKEN)
  if (!testToken) {
    return 'missing_test_token'
  }

  const productionToken = normalizeEnv(process.env.TELEGRAM_BOT_TOKEN)
  if (productionToken && testToken === productionToken) {
    return 'same_as_production_token'
  }

  const contentToken = normalizeEnv(process.env.CONTENT_BOT_TOKEN)
  if (contentToken && testToken === contentToken) {
    return 'same_as_content_token'
  }

  const coachToken = normalizeEnv(process.env.COACH_BOT_TOKEN)
  if (coachToken && testToken === coachToken) {
    return 'same_as_coach_token'
  }

  return null
}

export function resolveLocalTelegramConsumerState(): LocalTelegramConsumerState {
  if (isProductionRuntime()) {
    return {
      enabled: true,
      reason: null,
    }
  }

  const collisionReason = resolveLocalTelegramTokenCollision()
  if (collisionReason) {
    return {
      enabled: false,
      reason: collisionReason,
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
    case 'same_as_content_token':
      return 'TEST_TELEGRAM_BOT_TOKEN matches CONTENT_BOT_TOKEN'
    case 'same_as_coach_token':
      return 'TEST_TELEGRAM_BOT_TOKEN matches COACH_BOT_TOKEN'
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
    : normalizeEnv(process.env.TEST_TELEGRAM_BOT_USERNAME) || LOCAL_TELEGRAM_USERNAME

  return {
    token,
    username,
    botLink: username ? `https://t.me/${username}` : '',
  }
}

export function readExpectedTelegramBotUsername(): string {
  return readTelegramBotConfig().username
}

export function assertTelegramBotIdentity(
  actualUsername: string | null | undefined,
  expectedUsername = readExpectedTelegramBotUsername(),
  context = 'startup',
): string {
  const normalizedActual = normalizeEnv(actualUsername ?? '').replace(/^@/, '')
  const normalizedExpected = normalizeEnv(expectedUsername).replace(/^@/, '')

  if (!normalizedExpected) {
    throw new Error(
      `[Telegram] Missing required env var during ${context}: ${resolveRuntimeUsernameEnvKey()}`,
    )
  }

  if (normalizedActual !== normalizedExpected) {
    throw new Error(
      `[TELEGRAM_BOT_MISMATCH] Expected @${normalizedExpected} from ${resolveRuntimeUsernameEnvKey()} but got @${normalizedActual || 'unknown'}.`,
    )
  }

  return normalizedExpected
}

export function readTelegramVerificationTokens(): string[] {
  const runtimeToken = readTelegramBotConfig().token

  return uniqueTokens([
    runtimeToken,
    readCoachBotToken(),
    normalizeEnv(process.env.TELEGRAM_BOT_TOKEN),
    normalizeEnv(process.env.TEST_TELEGRAM_BOT_TOKEN),
    normalizeEnv(process.env.CONTENT_BOT_TOKEN),
    normalizeEnv(process.env.TEST_BOT_TOKEN),
  ])
}

export function resolveTelegramDeliveryMode(): TelegramDeliveryMode {
  if (isProductionRuntime()) {
    return 'webhook'
  }

  return 'polling'
}

export function readTelegramBotNames(): TelegramBotNames {
  return {
    main:  normalizeEnv(process.env.TELEGRAM_BOT_NAME)  || 'Starway Main',
    coach: readCoachBotName(),
    test:  normalizeEnv(process.env.TEST_BOT_NAME)       || 'Starway Test',
  }
}

export function requireTelegramBotConfig(context = 'startup'): TelegramBotConfig {
  const config = readTelegramBotConfig()
  const tokenEnvVar = resolveRuntimeTokenEnvKey()

  if (!config.token) {
    throw new Error(
      `[Telegram] Missing required env var during ${context}: ${tokenEnvVar}`
    )
  }

  const localConsumerState = resolveLocalTelegramConsumerState()
  if (!isProductionRuntime() && !localConsumerState.enabled) {
    throw new Error(
      `[Telegram] Invalid local test bot config during ${context}: ${describeLocalTelegramConsumerDisableReason(localConsumerState.reason)}`,
    )
  }

  return config
}

export function readCoachBotToken(): string {
  return isProductionRuntime()
    ? normalizeEnv(process.env.COACH_BOT_TOKEN)
    : normalizeEnv(process.env.TEST_COACH_BOT_TOKEN)
}

export function readCoachBotName(): string {
  if (isProductionRuntime()) {
    return normalizeEnv(process.env.COACH_BOT_NAME) || 'StarwayDNACoach_bot'
  }

  return normalizeEnv(process.env.TEST_COACH_BOT_NAME) || 'StarwayDNACoachTest_bot'
}
