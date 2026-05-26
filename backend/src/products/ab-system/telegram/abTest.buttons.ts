export type TelegramWebAppButton =
  | { text: string; web_app: { url: string } }
  | { text: string; url: string }

function normalizeEnvBaseUrl(value: string | undefined): string {
  return String(value ?? '').trim().replace(/\/$/, '')
}

function isTelegramSafeHttpsUrl(value: string): boolean {
  if (isBackendPublicUrl(value)) return false

  return (
    value.startsWith('https://') &&
    !value.includes('localhost') &&
    !value.includes('127.0.0.1')
  )
}

function originOf(value?: string | null): string | null {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function isBackendPublicUrl(value: string): boolean {
  const origin = originOf(value)
  if (!origin) return false

  return [
    process.env.PUBLIC_API_URL,
    process.env.TELEGRAM_WEBHOOK_URL,
    process.env.WAYFORPAY_CALLBACK_URL,
    process.env.BILLING_CALLBACK_URL,
  ].some(candidate => originOf(candidate) === origin)
}

export function resolveBrowserTestUrl(): string {
  const base = [
    process.env.VITE_PUBLIC_FRONTEND_URL,
    process.env.PUBLIC_FRONTEND_URL,
    process.env.TELEGRAM_WEBAPP_BASE_URL,
    process.env.FRONTEND_URL,
  ]
    .map(normalizeEnvBaseUrl)
    .find(isTelegramSafeHttpsUrl)

  if (!base) {
    throw new Error('[WebApp] No Telegram-safe HTTPS URL configured for browser button')
  }

  return `${base}/ab-test`
}

export function resolveBrowserTestUrlOrNull(): string | null {
  try {
    return resolveBrowserTestUrl()
  } catch {
    return null
  }
}

export function buildWebAppButton(
  label: string,
  path: string,
): TelegramWebAppButton | null {
  const webappBase = normalizeEnvBaseUrl(process.env.TELEGRAM_WEBAPP_BASE_URL)

  if (!isTelegramSafeHttpsUrl(webappBase)) {
    const browserUrl = resolveBrowserTestUrlOrNull()
    if (!browserUrl) {
      return null
    }
    return {
      text: label,
      url: browserUrl,
    }
  }

  return {
    text: label,
    web_app: { url: `${webappBase}${path}` },
  }
}
