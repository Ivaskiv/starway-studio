import { useAppDispatch, useAppSelector } from '@/app/hooks'
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
const PENDING_DEEPLINK_TOKEN_KEY = 'starway_pending_deeplink_token'

function safeAccent(color?: string | null): string {
  if (!color || BAD_COLORS.has(color)) return DEFAULT_ACCENT
  return color
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
    let token = search.get('dl')
    if (!token && location.pathname === '/auth/telegram/success') {
      token = window.sessionStorage.getItem(PENDING_DEEPLINK_TOKEN_KEY)
      window.sessionStorage.removeItem(PENDING_DEEPLINK_TOKEN_KEY)
    }

    if (!token) {
      processedTokenRef.current = null
      return
    }

    if (processedTokenRef.current === token) {
      return
    }

    if (status === 'loading') {
      return
    }

    if (status === 'authenticated' && location.pathname !== '/onboarding/continue') {
      processedTokenRef.current = token
      search.delete('dl')
      if (isTelegramMiniApp(location.pathname)) {
        navigate('/miniapp/zoom-calendar', { replace: true })
        return
      }
      navigate(
        {
          pathname: location.pathname,
          search: search.toString() ? `?${search.toString()}` : '',
        },
        { replace: true },
      )
      return
    }

    processedTokenRef.current = token
    search.delete('dl')
    navigate(
      {
        pathname: location.pathname,
        search: search.toString() ? `?${search.toString()}` : '',
        hash: location.hash,
      },
      { replace: true },
    )

    void restoreDeepLinkSession({ token, consume: true })
      .unwrap()
      .then(result => {
        dispatch(setCredentials({ user: result.user, accessToken: result.accessToken }))
        theme.setAccent(safeAccent(result.user.settings?.accentColor))
        theme.setMode(normalizeUiMode(result.user.settings?.theme))
        theme.setBgColor(result.user.settings?.bgColor ?? undefined)

        const currentPath = `${location.pathname}${location.search}`
        const targetPath = result.link.path

        if (isTelegramMiniApp(location.pathname)) {
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
        processedTokenRef.current = null
      })
  }, [dispatch, location.hash, location.pathname, location.search, navigate, restoreDeepLinkSession, status, theme])

  return null
}
