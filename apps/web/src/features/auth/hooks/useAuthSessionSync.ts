import { useCallback, useEffect, useMemo, useRef } from 'react'
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
const SYNC_COOLDOWN_MS = 1500

export function useAuthSessionSync(enabled: boolean) {
  const dispatch = useDispatch<AppDispatch>()
  const { setAccent, setMode, setBgColor } = useThemeContext()
  const theme = useMemo(
    () => ({
      setAccent,
      setMode,
      setBgColor,
    }),
    [setAccent, setMode, setBgColor],
  )
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const syncInFlightRef = useRef(false)
  const lastSyncStartedAtRef = useRef(0)

  const runSync = useCallback(async (reason: 'storage' | 'focus' | 'visibility') => {
    if (!enabled || syncInFlightRef.current) return

    const now = Date.now()
    if (now - lastSyncStartedAtRef.current < SYNC_COOLDOWN_MS) {
      if (import.meta.env.DEV) {
        console.info('[useAuthSessionSync] skip', {
          reason,
          sinceLastSyncMs: now - lastSyncStartedAtRef.current,
        })
      }
      return
    }

    syncInFlightRef.current = true
    lastSyncStartedAtRef.current = now

    try {
      if (import.meta.env.DEV) {
        console.info('[useAuthSessionSync] run', { reason })
      }
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
    // AuthRestore has just completed a session sync, so suppress the immediate
    // focus/visibility follow-up pass that commonly fires on initial page load.
    lastSyncStartedAtRef.current = Date.now()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const handleStorage = (event: StorageEvent) => {
      if (event.key && !AUTH_STORAGE_KEYS.has(event.key)) return

      const hasAnySessionMarker = Boolean(getToken()) || hasSessionHint()
      if (!hasAnySessionMarker) {
        if (isAuthenticated) dispatch(clearAuth())
        return
      }

      void runSync('storage')
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void runSync('visibility')
      }
    }

    const handleFocus = () => {
      void runSync('focus')
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
