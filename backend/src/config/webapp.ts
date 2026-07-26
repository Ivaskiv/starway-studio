const PROD_FRONTEND_FALLBACK = (
  process.env.FRONTEND_URL?.trim()
  || 'http://localhost:5173'
).replace(/\/$/, '')

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, '')
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

function joinPath(base: string, path: string): string {
  return `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`
}

export function resolveTelegramWebappBaseUrl(): string {
  const explicitWebappBase = process.env.TELEGRAM_WEBAPP_BASE_URL?.trim()
  if (explicitWebappBase) {
    return normalizeBaseUrl(explicitWebappBase)
  }

  const candidates = [
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim(),
    process.env.PUBLIC_FRONTEND_URL?.trim(),
    process.env.VITE_PUBLIC_FRONTEND_URL?.trim(),
    process.env.FRONTEND_URL?.trim(),
  ].filter((value): value is string => Boolean(value))

  const frontendUrl = candidates.find(value => !isBackendPublicUrl(value))
  if (frontendUrl) return normalizeBaseUrl(frontendUrl)

  return process.env.NODE_ENV !== 'production'
    ? 'http://localhost:5173'
    : PROD_FRONTEND_FALLBACK
}

export function resolveTelegramWebappUrl(path = '/ab-test'): string {
  return joinPath(resolveTelegramWebappBaseUrl(), path)
}

export function resolveBrowserAbTestUrl(): string {
  return resolveTelegramWebappUrl('/ab-test')
}

export function resolveTelegramSafeBrowserAbTestUrl(): string {
  return resolveBrowserAbTestUrl()
}
