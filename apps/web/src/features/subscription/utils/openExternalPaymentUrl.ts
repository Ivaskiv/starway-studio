import { resolveApiUrl } from '@/services/api'

function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return resolveApiUrl(trimmed.startsWith('/') ? trimmed : `/${trimmed}`)
}

function getTelegramWebApp() {
  if (typeof window === 'undefined') {
    return null
  }

  return (window as {
    Telegram?: {
      WebApp?: {
        openLink?: (
          url: string,
          options?: { try_instant_view?: boolean }
        ) => void
      }
    }
  }).Telegram?.WebApp
}

export function openExternalPaymentUrl(url: string): boolean {
  const targetUrl = normalizeExternalUrl(url)
  const telegramWebApp = getTelegramWebApp()

  // FIX:
  // Telegram Mini App ламає WayForPay через window.open/location.href.
  // Треба відкривати тільки через Telegram.WebApp.openLink().
  if (typeof telegramWebApp?.openLink === 'function') {
    telegramWebApp.openLink(targetUrl, {
      try_instant_view: false,
    })

    return true
  }

  // Browser fallback
  if (typeof window !== 'undefined') {
    const popup = window.open(
      targetUrl,
      '_blank',
      'noopener,noreferrer'
    )

    if (popup) {
      popup.opener = null
      return true
    }

    window.location.assign(targetUrl)

    return true
  }

  return false
}

export function handleFocusPaymentClick(
  event: { preventDefault: () => void },
  paymentUrl: string
): void {
  event.preventDefault()

  openExternalPaymentUrl(paymentUrl)
}