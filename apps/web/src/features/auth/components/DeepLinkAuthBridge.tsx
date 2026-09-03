import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { AppDispatch } from '@/app/store'
import {
  logCoachWebAppTrace,
  PENDING_DEEPLINK_SESSION_EVENT,
  PENDING_DEEPLINK_TOKEN_KEY,
} from '@/features/auth/context/SessionOrchestratorContext'
import { accessApi } from '@/features/auth/services/accessApi'
import { setCredentials } from '@/features/auth/services/auth.slice'
import { useRestoreDeepLinkSessionMutation } from '@/features/auth/services/deeplinks.api'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { DEFAULT_ACCENT, normalizeUiMode } from '@/theme/accent.utils'
import { useThemeContext } from '@/theme/ThemeProvider'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const BAD_COLORS = new Set([
  '#ff6b00', '#FF6B00',
  '#ea580c', '#f97316', '#d97706',
  '#0a2446', '#0d1b3e',
])
const AUTH_CALLBACK_PARAMS = ['token', 'accessToken', 'authToken', 'refreshToken']
const TOKEN_PARAM_SAFE_PATHS = new Set(['/reset-password', '/auth/magic'])
export const DEEP_LINK_RESTORE_TIMEOUT_MS = 15_000

export function withDeepLinkRestoreTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DEEP_LINK_RESTORE_TIMEOUT_MS,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('DEEPLINK_RESTORE_TIMEOUT'))
    }, timeoutMs)

    promise.then(
      value => {
        clearTimeout(timeoutId)
        resolve(value)
      },
      error => {
        clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

export function readPendingDeepLinkToken(pathname: string, search: string): string | null {
  const params = new URLSearchParams(search)
  const directToken = params.get('dl')?.trim()
  if (directToken) {
    return directToken
  }

  if (pathname !== '/auth/telegram/success' || typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(PENDING_DEEPLINK_TOKEN_KEY)?.trim() || null
}

export function shouldRedirectTelegramRuntimeToMiniApp(pathname: string): boolean {
  return pathname === '/miniapp' || pathname.startsWith('/miniapp/')
}

export function shouldSkipDeepLinkRestore(status: string, pathname: string): boolean {
  return status === 'loading'
    || (status === 'authenticated' && pathname === '/onboarding/continue')
}

function setPendingDeepLinkToken(token: string | null): void {
  if (typeof window === 'undefined') return

  try {
    if (token?.trim()) {
      window.sessionStorage.setItem(PENDING_DEEPLINK_TOKEN_KEY, token.trim())
    } else {
      window.sessionStorage.removeItem(PENDING_DEEPLINK_TOKEN_KEY)
    }
  } catch {
    return
  } finally {
    window.dispatchEvent(new Event(PENDING_DEEPLINK_SESSION_EVENT))
  }
}

function resolveTelegramMiniAppFallback(pathname: string, search: string): string {
  if (pathname.startsWith('/dashboard/ai-mentor')) {
    return `/miniapp/mentor${search}`
  }

  if (pathname.startsWith('/dashboard/profile') || pathname.startsWith('/dashboard/settings')) {
    return `/miniapp/profile${search}`
  }

  if (pathname.startsWith('/dashboard/progress') || pathname.startsWith('/dashboard/journal')) {
    return `/miniapp/tracker${search}`
  }

  return '/miniapp/zoom-calendar'
}

function safeAccent(color?: string | null): string {
  if (!color || BAD_COLORS.has(color)) return DEFAULT_ACCENT
  return color
}

export async function refreshDeepLinkProtectedState(dispatch: AppDispatch): Promise<void> {
  await Promise.all([
    dispatch(
      accessApi.endpoints.getMyAccess.initiate(undefined, {
        forceRefetch: true,
        subscribe: false,
      }),
    ).unwrap(),
    dispatch(
      accessApi.endpoints.getMySystemState.initiate(undefined, {
        forceRefetch: true,
        subscribe: false,
      }),
    ).unwrap(),
  ])
}

export default function DeepLinkAuthBridge() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useThemeContext()
  const status = useAppSelector(state => state.auth.status)
  const [restoreDeepLinkSession] = useRestoreDeepLinkSessionMutation()
  const processedTokenRef = useRef<string | null>(null)

  useEffect(() => {
    logCoachWebAppTrace('DL_BRIDGE_MOUNTED', {
      pathname: location.pathname,
      hasDl: Boolean(new URLSearchParams(location.search).get('dl')?.trim()),
    })
  }, [location.pathname, location.search])

  useEffect(() => {
    if (TOKEN_PARAM_SAFE_PATHS.has(location.pathname)) return

    const search = new URLSearchParams(location.search)
    let hasAuthTokenParam = false

    for (const param of AUTH_CALLBACK_PARAMS) {
      if (search.has(param)) {
        search.delete(param)
        hasAuthTokenParam = true
      }
    }

    if (!hasAuthTokenParam) return

    navigate(
      {
        pathname: location.pathname,
        search: search.toString() ? `?${search.toString()}` : '',
        hash: location.hash,
      },
      { replace: true },
    )
  }, [location.hash, location.pathname, location.search, navigate])

  useEffect(() => {
    const search = new URLSearchParams(location.search)
    const token = readPendingDeepLinkToken(location.pathname, location.search)

    logCoachWebAppTrace('AUTH_STATUS', {
      pathname: location.pathname,
      status,
      hasDl: Boolean(search.get('dl')?.trim()),
      hasPendingToken: Boolean(token),
    })

    if (!token) {
      processedTokenRef.current = null
      logCoachWebAppTrace('AUTH_FAILURE', {
        reason: 'no_pending_token',
        pathname: location.pathname,
      })
      return
    }

    if (processedTokenRef.current === token) {
      logCoachWebAppTrace('PENDING_SET', {
        pathname: location.pathname,
        state: 'already_processed',
      })
      return
    }

    if (shouldSkipDeepLinkRestore(status, location.pathname)) {
      logCoachWebAppTrace('AUTH_FAILURE', {
        reason: status === 'loading' ? 'auth_loading_guard' : 'deeplink_restore_skip_guard',
        pathname: location.pathname,
      })
      return
    }

    processedTokenRef.current = token
    setPendingDeepLinkToken(token)
    logCoachWebAppTrace('RESTORE_START', {
      pathname: location.pathname,
    })
    search.delete('dl')
    navigate(
      {
        pathname: location.pathname,
        search: search.toString() ? `?${search.toString()}` : '',
        hash: location.hash,
      },
      { replace: true },
    )

    void withDeepLinkRestoreTimeout(
      restoreDeepLinkSession({ token, consume: true }).unwrap(),
    )
      .then(async result => {
        logCoachWebAppTrace('RESOLVE_HTTP_RESULT', {
          ok: true,
          pathname: location.pathname,
          targetPath: result.link.path,
        })
        dispatch(setCredentials({ user: result.user, accessToken: result.accessToken }))
        logCoachWebAppTrace('SESSION_APPLIED', {
          pathname: location.pathname,
          role: result.user.role ?? null,
          userIdPresent: Boolean(result.user.id),
        })
        await refreshDeepLinkProtectedState(dispatch)
        logCoachWebAppTrace('PROTECTED_STATE_REFRESHED', {
          pathname: location.pathname,
          role: result.user.role ?? null,
          userIdPresent: Boolean(result.user.id),
        })
        theme.setAccent(safeAccent(result.user.settings?.accentColor))
        theme.setMode(normalizeUiMode(result.user.settings?.theme))
        theme.setBgColor(result.user.settings?.bgColor ?? undefined)

        const currentPath = `${location.pathname}${location.search}`
        const targetPath = result.link.path

        if (isTelegramMiniApp(location.pathname) && shouldRedirectTelegramRuntimeToMiniApp(location.pathname)) {
          navigate('/miniapp/zoom-calendar', { replace: true })
          return
        }

        if (location.pathname === '/onboarding/continue' && targetPath) {
          navigate(targetPath, { replace: true })
          return
        }

        const nextSearch = new URLSearchParams(location.search)
        nextSearch.delete('dl')
        const sanitizedPath = `${location.pathname}${nextSearch.toString() ? `?${nextSearch.toString()}` : ''}`

        if (targetPath && targetPath !== currentPath && targetPath !== location.pathname) {
          navigate(targetPath, { replace: true })
          return
        }

        navigate(sanitizedPath, { replace: true })
      })
      .catch(error => {
        console.warn('[DeepLinkAuthBridge] failed to restore deeplink session', error)
        logCoachWebAppTrace('RESOLVE_HTTP_RESULT', {
          ok: false,
          pathname: location.pathname,
          message: error instanceof Error ? error.message : 'unknown',
        })
        processedTokenRef.current = null

        if (isTelegramMiniApp(location.pathname) && shouldRedirectTelegramRuntimeToMiniApp(location.pathname)) {
          const nextSearch = new URLSearchParams(location.search)
          nextSearch.delete('dl')
          navigate(resolveTelegramMiniAppFallback(
            location.pathname,
            nextSearch.toString() ? `?${nextSearch.toString()}` : '',
          ), { replace: true })
        }
      })
      .finally(() => {
        setPendingDeepLinkToken(null)
        logCoachWebAppTrace('PENDING_CLEAR', {
          pathname: location.pathname,
        })
      })
  }, [dispatch, location.hash, location.pathname, location.search, navigate, restoreDeepLinkSession, status, theme])

  return null
}
