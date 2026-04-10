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
    (window as { Telegram?: { WebApp?: { initDataUnsafe?: unknown; initData?: string } } }).Telegram?.WebApp,
  )
  const hasInitData = Boolean(
    (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData?.trim(),
  )

  return Boolean(
    window.location.pathname.startsWith('/miniapp') ||
    hasTelegramQueryHints ||
    (hasTelegramWebAppObject && hasInitData),
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

async function waitForTelegramRuntimeReady(timeoutMs = 1600): Promise<void> {
  if (typeof window === 'undefined' || !isLikelyTelegramMiniAppRuntime()) return

  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const runtimeUser = getTelegramRuntimeUser()
    const initData = getTelegramRuntimeInitData()
    const telegramReady = Boolean((window as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp)

    if (runtimeUser?.id || initData || telegramReady) {
      return
    }

    await new Promise(resolve => window.setTimeout(resolve, 100))
  }
}

function isTelegramDevFallbackAllowed(): boolean {
  if (typeof window === 'undefined') return false
  return import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

export function isTelegramMiniAppAuthContext(): boolean {
  return isLikelyTelegramMiniAppRuntime()
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
    if (import.meta.env.DEV) {
      console.info('[sessionSync] mark guest', {
        allowRefreshWithoutHint,
        hasToken: Boolean(token),
        hasSessionHint: hasSessionHint(),
        isTelegramRuntime: isLikelyTelegramMiniAppRuntime(),
        telegramUserId: getTelegramRuntimeUser()?.id ?? null,
        hasTelegramInitData: Boolean(getTelegramRuntimeInitData()),
      })
    }
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
          if (import.meta.env.DEV) {
            console.info('[sessionSync] restored via refresh', {
              userId: refreshedUser.id,
              email: refreshedUser.email ?? null,
            })
          }
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
          if (import.meta.env.DEV) {
            console.info('[sessionSync] restored via access token', {
              userId: restoredUser.id,
              email: restoredUser.email ?? null,
            })
          }
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

  await waitForTelegramRuntimeReady()

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
          if (import.meta.env.DEV) {
            console.info('[sessionSync] restored via telegram initData', {
              userId: socialUser.id,
              email: socialUser.email ?? null,
              telegramRuntimeUserId: telegramUser.id,
            })
          }
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
          if (import.meta.env.DEV) {
            console.info('[sessionSync] restored via telegram dev fallback', {
              userId: socialUser.id,
              email: socialUser.email ?? null,
              telegramRuntimeUserId: telegramUser.id,
            })
          }
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
