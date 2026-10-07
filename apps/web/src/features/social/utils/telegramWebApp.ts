type TelegramWebAppBootstrap = {
  ready?: () => void
  expand?: () => void
  initDataUnsafe?: unknown
  initData?: string
}

let telegramWebAppReadySignaled = false

function getTelegramWebApp(): TelegramWebAppBootstrap | undefined {
  if (typeof window === 'undefined') return undefined

  return (window as typeof window & {
    Telegram?: { WebApp?: TelegramWebAppBootstrap }
  }).Telegram?.WebApp
}

/**
 * Shared Telegram Mini App readiness boundary. It deliberately runs before
 * auth/session restoration: Telegram readiness means the React shell mounted,
 * not that the user has been authenticated.
 */
export function signalTelegramWebAppReady(): boolean {
  if (telegramWebAppReadySignaled) return false

  const webApp = getTelegramWebApp()
  if (typeof webApp?.ready !== 'function') return false

  telegramWebAppReadySignaled = true
  webApp.ready()
  webApp.expand?.()
  return true
}

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

  const webApp = getTelegramWebApp()
  const hasTelegramWebAppObject = Boolean(webApp)
  const hasInitData = Boolean(
    webApp?.initData?.trim(),
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
