export function isTelegramMiniApp(pathname?: string): boolean {
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
    (window as { Telegram?: { WebApp?: { initDataUnsafe?: unknown; initData?: string } } }).Telegram?.WebApp,
  )
  const hasInitData = Boolean(
    (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData?.trim(),
  )

  return Boolean(
    pathname?.startsWith('/miniapp') ||
    hasTelegramQueryHints ||
    (hasTelegramWebAppObject && hasInitData),
  )
}

export function isTelegramMiniAppContext(pathname?: string): boolean {
  return isTelegramMiniApp(pathname)
}
