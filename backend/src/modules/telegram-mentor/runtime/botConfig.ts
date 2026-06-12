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

function normalizeEnv(value: string | undefined): string {
  return String(value ?? '').trim()
}

export function readTelegramBotConfig(): TelegramBotConfig {
  const token = normalizeEnv(process.env.TELEGRAM_BOT_TOKEN)
  const username = normalizeEnv(process.env.TELEGRAM_BOT_USERNAME)

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
