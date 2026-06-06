export type TelegramTrafficSource =
  | 'AB_TEST_LANDING'
  | 'FOCUS_LANDING'
  | 'WHEEL_LANDING'
  | 'INSTAGRAM'
  | 'DIRECT'
  | 'UNKNOWN'

type TelegramDeepLinkOptions = {
  source: TelegramTrafficSource
  startParam?: string
}

const DEFAULT_BOT_USERNAME = 'test_starway_bot'

function resolveBotUsername(): string {
  const username = import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim()
  return username || DEFAULT_BOT_USERNAME
}

function normalizeStartParam(value: string): string {
  return value.trim().replace(/^start=/i, '').replace(/^\?/, '')
}

export function buildTelegramDeepLink({
  source,
  startParam,
}: TelegramDeepLinkOptions): string {
  const botUsername = resolveBotUsername()
  const normalizedStartParam =
    startParam?.trim() ||
    ({
      AB_TEST_LANDING: 'abtest_landing_v1',
      FOCUS_LANDING: 'focus_landing_v1',
      WHEEL_LANDING: 'wheel_landing_v1',
      INSTAGRAM: 'instagram_landing_v1',
      DIRECT: 'direct',
      UNKNOWN: 'unknown',
    } satisfies Record<TelegramTrafficSource, string>)[source]

  const search = new URLSearchParams({
    start: normalizeStartParam(normalizedStartParam),
  })

  return `https://t.me/${botUsername}?${search.toString()}`
}

export function buildTelegramProfileLink(username: string): string {
  const normalizedUsername = username.trim().replace(/^@/, '')
  return `https://t.me/${normalizedUsername}`
}

export function buildAbTestLink(): string {
  return buildTelegramDeepLink({ source: 'AB_TEST_LANDING' })
}

export function buildFocusLink(): string {
  return buildTelegramDeepLink({ source: 'FOCUS_LANDING' })
}

export function buildWheelLink(): string {
  return buildTelegramDeepLink({ source: 'WHEEL_LANDING' })
}
