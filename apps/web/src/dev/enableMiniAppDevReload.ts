export function enableMiniAppDevReload() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return

  // Telegram WebView can hold onto stale worker registrations between reloads.
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    }).catch(() => undefined)
  }

  const isTelegramWebView =
    window.navigator.userAgent.toLowerCase().includes('telegram') ||
    window.location.search.includes('tgWebApp')

  if (!isTelegramWebView) return

  // Telegram WebView is unreliable with React Fast Refresh and can leave hooks
  // in a broken dispatcher state. In Mini App dev, prefer a hard page reload
  // for every Vite update event instead of in-place HMR patching.
  import.meta.hot?.on('vite:beforeUpdate', () => {
    window.setTimeout(() => {
      window.location.reload()
    }, 60)
  })

  let lastStamp = ''

  const poll = window.setInterval(async () => {
    try {
      const response = await fetch(`/__miniapp_reload_stamp?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'cache-control': 'no-cache, no-store, must-revalidate',
          pragma: 'no-cache',
        },
      })

      if (!response.ok) return

      const data = (await response.json()) as { stamp?: string }
      if (!data.stamp) return

      if (!lastStamp) {
        lastStamp = data.stamp
        return
      }

      if (data.stamp !== lastStamp) {
        lastStamp = data.stamp
        window.location.reload()
      }
    } catch {
      // Ignore transient tunnel/dev-server failures.
    }
  }, 1200)

  window.addEventListener('beforeunload', () => {
    window.clearInterval(poll)
  }, { once: true })
}
