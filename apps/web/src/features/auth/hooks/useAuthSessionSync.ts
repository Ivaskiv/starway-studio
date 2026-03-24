import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import type { AppDispatch } from '@/app/store'
import { clearAuth, selectIsAuthenticated } from '@/features/auth/services/auth.slice'
import { getToken, hasSessionHint } from '@/features/auth/services/token'
import { syncAuthSession } from '@/features/auth/utils/sessionSync'
import { useThemeContext } from '@/theme/ThemeProvider'

const AUTH_STORAGE_KEYS = new Set([
  'starway_access_token',
  'starway_session_hint',
])

export function useAuthSessionSync(enabled: boolean) {
  const dispatch = useDispatch<AppDispatch>()
  const theme = useThemeContext()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const syncInFlightRef = useRef(false)

  const runSync = useCallback(async () => {
    if (!enabled || syncInFlightRef.current) return

    syncInFlightRef.current = true

    try {
      await syncAuthSession({
        allowRefreshWithoutHint: true,
        dispatch,
        theme,
      })
    } finally {
      syncInFlightRef.current = false
    }
  }, [dispatch, enabled, theme])

  useEffect(() => {
    if (!enabled) return

    const handleStorage = (event: StorageEvent) => {
      if (event.key && !AUTH_STORAGE_KEYS.has(event.key)) return

      const hasAnySessionMarker = Boolean(getToken()) || hasSessionHint()
      if (!hasAnySessionMarker) {
        if (isAuthenticated) dispatch(clearAuth())
        return
      }

      void runSync()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void runSync()
      }
    }

    const handleFocus = () => {
      void runSync()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [dispatch, enabled, isAuthenticated, runSync])
}
