import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { accessApi } from '@/features/auth/services/accessApi'
import { setCredentials } from '@/features/auth/services/auth.slice'
import { useRestoreDeepLinkSessionMutation } from '@/features/auth/services/deeplinks.api'
import { DEFAULT_ACCENT, normalizeUiMode } from '@/theme/accent.utils'
import { useThemeContext } from '@/theme/ThemeProvider'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const BAD_COLORS = new Set([
  '#ff6b00', '#FF6B00',
  '#ea580c', '#f97316', '#d97706',
  '#0a2446', '#0d1b3e',
])

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
    const search = new URLSearchParams(location.search)
    const token = search.get('dl')

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

    void restoreDeepLinkSession({ token, consume: true })
      .unwrap()
      .then(result => {
        dispatch(setCredentials({ user: result.user, accessToken: result.accessToken }))
        theme.setAccent(safeAccent(result.user.settings?.accentColor))
        theme.setMode(normalizeUiMode(result.user.settings?.theme))
        theme.setBgColor(result.user.settings?.bgColor ?? undefined)

        void dispatch(accessApi.endpoints.getMyAccess.initiate(undefined, { forceRefetch: true, subscribe: false }))
        void dispatch(accessApi.endpoints.getMySystemState.initiate(undefined, { forceRefetch: true, subscribe: false }))

        const currentPath = `${location.pathname}${location.search}`
        const targetPath = result.link.path

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
  }, [dispatch, location.pathname, location.search, navigate, restoreDeepLinkSession, status, theme])

  return null
}
