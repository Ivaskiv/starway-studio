import { isTelegramMiniAppContext } from '@/features/social/utils/telegramWebApp'
import { getToken } from '@/features/auth/services/token'

export function getTelegramMiniAppInitData() {
  if (typeof window === 'undefined') return ''

  const telegram = (window as {
    Telegram?: {
      WebApp?: {
        initData?: string
      }
    }
  }).Telegram

  return telegram?.WebApp?.initData?.trim() ?? ''
}

export function getTelegramMiniAppAuthHeader() {
  if (typeof window === 'undefined') return null

  const initData = getTelegramMiniAppInitData()
  if (!initData || !isTelegramMiniAppContext(window.location.pathname)) {
    return null
  }

  return `tma ${initData}`
}

export function getAppAuthHeader() {
  if (typeof window === 'undefined') return null

  const token = getToken()
  if (token) {
    return `Bearer ${token}`
  }

  return getTelegramMiniAppAuthHeader()
}

export function createAppRequestHeaders(headersInit?: HeadersInit, hasBody = false) {
  const headers = new Headers(headersInit ?? {})
  const authHeader = getAppAuthHeader()

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (authHeader && !headers.has('Authorization')) {
    headers.set('Authorization', authHeader)
  }

  return headers
}

export async function miniAppFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = createAppRequestHeaders(options.headers, Boolean(options.body))

  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: unknown; message?: unknown } | null
    const details = typeof payload?.message === 'string'
      ? payload.message
      : typeof payload?.error === 'string'
        ? payload.error
        : `API error ${response.status}`
    throw new Error(details)
  }

  return response.json() as Promise<T>
}
