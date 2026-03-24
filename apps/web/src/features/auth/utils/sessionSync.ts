import type { AppDispatch } from '@/app/store'
import { accessApi } from '@/features/auth/services/accessApi'
import { clearAuth, setCredentials } from '@/features/auth/services/auth.slice'
import { getToken, hasSessionHint } from '@/features/auth/services/token'
import type { User } from '@/features/user/types/user.types'
import { DEFAULT_ACCENT, normalizeUiMode, type UiMode } from '@/theme/accent.utils'

const BAD_COLORS = new Set([
  '#ff6b00', '#FF6B00',
  '#ea580c', '#f97316', '#d97706',
  '#0a2446', '#0d1b3e',
])

const ACCESS_REFRESH_OPTIONS = {
  forceRefetch: true,
  subscribe: false,
} as const

type ThemeSyncApi = {
  setAccent: (color: string) => void
  setMode: (mode: UiMode) => void
  setBgColor: (color?: string) => void
}

type SyncAuthSessionOptions = {
  allowRefreshWithoutHint?: boolean
  dispatch: AppDispatch
  theme: ThemeSyncApi
}

type TelegramRuntimeUser = {
  id: number
  username?: string
  first_name?: string
}

function safeAccent(color?: string | null): string {
  return (!color || BAD_COLORS.has(color)) ? DEFAULT_ACCENT : color
}

function applyUserTheme(theme: ThemeSyncApi, user: User) {
  theme.setAccent(safeAccent(user.settings?.accentColor))
  theme.setMode(normalizeUiMode(user.settings?.theme))
  theme.setBgColor(user.settings?.bgColor ?? undefined)
}

async function refreshAccessState(dispatch: AppDispatch) {
  try {
    await dispatch(accessApi.endpoints.getMyAccess.initiate(undefined, ACCESS_REFRESH_OPTIONS)).unwrap()
  } catch (error) {
    console.warn('[sessionSync] Failed to refresh access state', error)
  }
}

function isLikelyTelegramMiniAppRuntime(): boolean {
  if (typeof window === 'undefined') return false

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
    window.location.pathname.startsWith('/miniapp') ||
    hasTelegramWebAppObject ||
    hasTelegramQueryHints ||
    isTelegramUserAgent ||
    isTelegramReferrer,
  )
}

function getTelegramRuntimeUser(): TelegramRuntimeUser | null {
  if (typeof window === 'undefined') return null

  const telegram = (window as {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: TelegramRuntimeUser
        }
      }
    }
  }).Telegram

  return telegram?.WebApp?.initDataUnsafe?.user ?? null
}

function getTelegramRuntimeInitData(): string {
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

function isTelegramDevFallbackAllowed(): boolean {
  if (typeof window === 'undefined') return false
  return import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

export function shouldAllowSessionProbeWithoutHint(): boolean {
  return isLikelyTelegramMiniAppRuntime()
}

export async function syncAuthSession({
  allowRefreshWithoutHint = false,
  dispatch,
  theme,
}: SyncAuthSessionOptions): Promise<boolean> {
  const token = getToken()
  const canTryRefresh =
    allowRefreshWithoutHint ||
    Boolean(token) ||
    hasSessionHint() ||
    typeof document !== 'undefined'

  const markGuest = () => {
    dispatch(clearAuth())
    return false
  }

  if (canTryRefresh) {
    try {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      })

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        const refreshedUser = (refreshData.user ?? null) as User | null
        const refreshedToken = typeof refreshData.accessToken === 'string' ? refreshData.accessToken : null

        if (refreshedUser && refreshedToken) {
          dispatch(setCredentials({ user: refreshedUser, accessToken: refreshedToken }))
          applyUserTheme(theme, refreshedUser)
          await refreshAccessState(dispatch)
          return true
        }
      }
    } catch (error) {
      console.warn('[sessionSync] Refresh probe failed', error)
    }
  }

  if (token) {
    try {
      const meRes = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (meRes.ok) {
        const meData = await meRes.json()
        const restoredUser = (meData.user ?? null) as User | null

        if (restoredUser) {
          dispatch(setCredentials({ user: restoredUser, accessToken: token }))
          applyUserTheme(theme, restoredUser)
          await refreshAccessState(dispatch)
          return true
        }
      }
    } catch (error) {
      console.warn('[sessionSync] Access-token restore failed', error)
    }
  }

  const telegramUser = getTelegramRuntimeUser()
  const telegramInitData = getTelegramRuntimeInitData()
  if (telegramUser?.id && telegramInitData && isLikelyTelegramMiniAppRuntime()) {
    try {
      const socialRes = await fetch('/api/auth/telegram', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initData: telegramInitData,
        }),
      })

      if (socialRes.ok) {
        const socialData = await socialRes.json()
        const socialUser = (socialData.user ?? null) as User | null
        const socialToken = typeof socialData.accessToken === 'string' ? socialData.accessToken : null

        if (socialUser && socialToken) {
          dispatch(setCredentials({ user: socialUser, accessToken: socialToken }))
          applyUserTheme(theme, socialUser)
          await refreshAccessState(dispatch)
          return true
        }
      }
    } catch (error) {
      console.warn('[sessionSync] Telegram social restore failed', error)
    }
  }

  if (telegramUser?.id && !telegramInitData && isLikelyTelegramMiniAppRuntime() && isTelegramDevFallbackAllowed()) {
    try {
      const socialRes = await fetch('/api/auth/social', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'telegram',
          externalId: String(telegramUser.id),
          username: telegramUser.username,
          name: telegramUser.first_name,
        }),
      })

      if (socialRes.ok) {
        const socialData = await socialRes.json()
        const socialUser = (socialData.user ?? null) as User | null
        const socialToken = typeof socialData.accessToken === 'string' ? socialData.accessToken : null

        if (socialUser && socialToken) {
          dispatch(setCredentials({ user: socialUser, accessToken: socialToken }))
          applyUserTheme(theme, socialUser)
          await refreshAccessState(dispatch)
          return true
        }
      }
    } catch (error) {
      console.warn('[sessionSync] Telegram dev fallback restore failed', error)
    }
  }

  return markGuest()
}
