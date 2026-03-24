export function isTelegramMiniAppContext(pathname?: string): boolean {
  if (typeof window === 'undefined') {
    return Boolean(pathname?.startsWith('/miniapp'))
  }

  const search = new URLSearchParams(window.location.search)
  const hasTelegramQueryHints =
    search.has('tgWebAppPlatform') ||
    search.has('tgWebAppVersion') ||
    search.has('tgWebAppThemeParams') ||
    search.has('tgWebAppStartParam')

  const hasTelegramWebAppObject = Boolean(
    (window as { Telegram?: { WebApp?: { initDataUnsafe?: unknown } } }).Telegram?.WebApp,
  )

  const ua = window.navigator.userAgent.toLowerCase()
  const isTelegramUserAgent = ua.includes('telegram')
  const isTelegramReferrer = document.referrer.includes('t.me')

  return Boolean(
    pathname?.startsWith('/miniapp') ||
    hasTelegramWebAppObject ||
    hasTelegramQueryHints ||
    isTelegramUserAgent ||
    isTelegramReferrer,
  )
}
