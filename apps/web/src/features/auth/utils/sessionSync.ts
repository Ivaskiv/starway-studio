import type { AppDispatch } from '@/app/store'
import { clearAuth, setCredentials } from '@/features/auth/services/auth.slice'
import { getRefreshToken, getToken, hasSessionHint } from '@/features/auth/services/token'
import type { User } from '@/features/user/types/user.types'
import { resolveApiUrl } from '@/services/api'
import { DEFAULT_ACCENT, normalizeUiMode, type UiMode } from '@/theme/accent.utils'

const BAD_COLORS = new Set([
  '#ff6b00', '#FF6B00',
  '#ea580c', '#f97316', '#d97706',
  '#0a2446', '#0d1b3e',
])

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

function canUseCookieSessionRecovery(): boolean {
  return typeof document !== 'undefined' && (
    hasSessionHint() ||
    Boolean(getRefreshToken()) ||
    isLikelyTelegramMiniAppRuntime()
  )
}

async function readJsonSafely(response: Response) {
  if (!response.ok) {
    console.warn('[sessionSync] request failed', response.status)
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    console.warn('[sessionSync] unexpected response type', contentType)
    return null
  }

  return response.json()
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
  if (import.meta.env.DEV) {
    console.info('[sessionSync] start', {
      allowRefreshWithoutHint,
      hasToken: Boolean(getToken()),
      hasRefreshToken: Boolean(getRefreshToken()),
      hasSessionHint: hasSessionHint(),
      isTelegramRuntime: isLikelyTelegramMiniAppRuntime(),
    })
  }

  const token = getToken()
  const refreshToken = getRefreshToken()
  const sessionHint = hasSessionHint()
  const telegramUser = getTelegramRuntimeUser()
  const telegramInitData = getTelegramRuntimeInitData()
  const isTelegramMiniAppRuntime = isLikelyTelegramMiniAppRuntime()
  const canTryRefresh =
    Boolean(refreshToken) ||
    sessionHint ||
    (allowRefreshWithoutHint && canUseCookieSessionRecovery())

  const markGuest = () => {
    if (import.meta.env.DEV) {
      console.info('[sessionSync] mark guest', {
        allowRefreshWithoutHint,
        hasToken: Boolean(token),
        hasSessionHint: sessionHint,
        isTelegramRuntime: isTelegramMiniAppRuntime,
        telegramUserId: telegramUser?.id ?? null,
        hasTelegramInitData: Boolean(telegramInitData),
      })
    }
    dispatch(clearAuth())
    return false
  }

  // In Mini App runtime Telegram identity is canonical and must win over stale web cookies/tokens.
  if (telegramUser?.id && telegramInitData && isTelegramMiniAppRuntime) {
    try {
      const socialRes = await fetch(resolveApiUrl('/auth/telegram'), {
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
      const socialData = await readJsonSafely(socialRes)
      if (socialData) {
        const socialUser = (socialData.user ?? null) as User | null
        const socialToken = typeof socialData.accessToken === 'string' ? socialData.accessToken : null
        const socialRefreshToken = typeof socialData.refreshToken === 'string'
          ? socialData.refreshToken
          : undefined

        if (socialUser && socialToken) {
          if (import.meta.env.DEV) {
            console.info('[sessionSync] restored via telegram initData', {
              userId: socialUser.id,
              email: socialUser.email ?? null,
              telegramRuntimeUserId: telegramUser.id,
            })
          }
          dispatch(setCredentials({
            user: socialUser,
            accessToken: socialToken,
            refreshToken: socialRefreshToken,
          }))
          applyUserTheme(theme, socialUser)
          return true
        }
      }
    } catch (error) {
      console.warn('[sessionSync] Telegram social restore failed', error)
    }
  }

  if (canTryRefresh) {
    try {
      const refreshRes = await fetch(resolveApiUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: refreshToken
          ? {
              'Content-Type': 'application/json',
              'x-refresh-token': refreshToken,
            }
          : undefined,
        body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
      })
      const refreshData = await readJsonSafely(refreshRes)
      if (refreshData) {
        const refreshedUser = (refreshData.user ?? null) as User | null
        const refreshedToken = typeof refreshData.accessToken === 'string' ? refreshData.accessToken : null
        const refreshedRefreshToken = typeof refreshData.refreshToken === 'string' ? refreshData.refreshToken : undefined

        if (refreshedUser && refreshedToken) {
          if (import.meta.env.DEV) {
            console.info('[sessionSync] restored via refresh', {
              userId: refreshedUser.id,
              email: refreshedUser.email ?? null,
            })
          }
          dispatch(setCredentials({ user: refreshedUser, accessToken: refreshedToken, refreshToken: refreshedRefreshToken }))
          applyUserTheme(theme, refreshedUser)
          return true
        }
      }
    } catch (error) {
      console.warn('[sessionSync] Refresh probe failed', error)
    }
  }

  if (token) {
    try {
      const meRes = await fetch(resolveApiUrl('/auth/me'), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const meData = await readJsonSafely(meRes)
      if (meData) {
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
          return true
        }
      }
    } catch (error) {
      console.warn('[sessionSync] Access-token restore failed', error)
    }
  }

  await waitForTelegramRuntimeReady()

  if (telegramUser?.id && !telegramInitData && isTelegramMiniAppRuntime && isTelegramDevFallbackAllowed()) {
    try {
      const socialRes = await fetch(resolveApiUrl('/auth/social'), {
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

      const socialData = await readJsonSafely(socialRes)
      if (socialData) {
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
          return true
        }
      }
    } catch (error) {
      console.warn('[sessionSync] Telegram dev fallback restore failed', error)
    }
  }

  return markGuest()
}
