import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { ROUTE_METADATA, normalizeDashboardRoutePath } from '@/config/routes'
import AuthModal from '@/features/auth/components/AuthModal'
import { useGetMyAccessQuery, useGetMySystemStateQuery, type UserSystemState } from '@/features/auth/services/accessApi'
import { selectCurrentUser, selectIsAuthenticated } from '@/features/auth/services/auth.slice'
import { getRefreshToken, getToken, hasKnownUser, hasSessionHint, resolvePreferredAuthMode } from '@/features/auth/services/token'
import type { UserAccessResult } from '@/features/auth/types/auth.types'
import {
  isTelegramMiniAppAuthContext,
  shouldAllowSessionProbeWithoutHint,
  syncAuthSession,
} from '@/features/auth/utils/sessionSync'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { BaseModal } from '@/features/modals/BaseModal'
import LoadingFallback from '@/features/user/userMenu/LoadingFallback'
import { useThemeContext } from '@/theme/ThemeProvider'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export type SessionAppState =
  | 'booting'
  | 'auth_restoring'
  | 'authenticated'
  | 'guest'
  | 'expired'
  | 'recovery_required'

type SessionModalState =
  | {
      kind: 'closed'
    }
  | {
      kind: 'auth'
      mode: 'login' | 'register'
      reason: 'protected_route' | 'manual' | 'expired' | 'telegram_required'
      title?: string
      message?: string
    }
  | {
      kind: 'protected_access'
      title: string
      message: string
      ctaLabel: string
      ctaPath: string
    }

type RestoreReason =
  | 'bootstrap'
  | 'focus'
  | 'visibility'
  | 'storage'
  | 'manual'
  | 'navigation'
  | 'protected_route'

type DebugEvent = {
  at: string
  type: string
  data?: Record<string, unknown>
}

type NavigationRequest = {
  path: string
  replace?: boolean
}

export type AuthRestoreStatus = 'idle' | 'restoring' | 'ready' | 'failed'

type SessionOrchestratorValue = {
  appState: SessionAppState
  authRestoreStatus: AuthRestoreStatus
  routeReady: boolean
  isNavigationLocked: boolean
  isProtectedRoute: boolean
  canRunProtectedQueries: boolean
  accessData: UserAccessResult | undefined
  systemStateData: UserSystemState | undefined
  isAccessReady: boolean
  isSystemReady: boolean
  isRouteTransitioning: boolean
  restoreSession: (reason?: RestoreReason) => Promise<boolean>
  beginProtectedNavigation: (request: NavigationRequest, options?: { queue?: boolean }) => void
  completeProtectedNavigation: () => void
  openAuthModal: (options?: Partial<Extract<SessionModalState, { kind: 'auth' }>>) => void
  openProtectedAccessModal: (options: Omit<Extract<SessionModalState, { kind: 'protected_access' }>, 'kind'>) => void
  closeModal: () => void
  sessionModal: SessionModalState
}

const SessionOrchestratorContext = createContext<SessionOrchestratorValue | null>(null)

const AUTH_STORAGE_KEYS = new Set([
  'starway_access_token',
  'starway_refresh_token',
  'starway_session_hint',
  'starway_auth_user',
])
const ROUTE_TRANSITION_TIMEOUT_MS = 6000
const REHYDRATE_COOLDOWN_MS = 1500
const DEBUG_LOG_LIMIT = 50
const SAFE_GUEST_FALLBACK_ROUTE = '/'

function logAuthTrace(event: string, data: Record<string, unknown> = {}): void {
  if (!import.meta.env.DEV) return
  console.info('[AUTH_TRACE]', {
    event,
    at: new Date().toISOString(),
    ...data,
  })
}

function isProtectedPath(pathname: string): boolean {
  const normalized = normalizeDashboardRoutePath(pathname)
  const normalizedMeta = ROUTE_METADATA[normalized as keyof typeof ROUTE_METADATA]
  const rawMeta = ROUTE_METADATA[pathname as keyof typeof ROUTE_METADATA]

  if (normalizedMeta?.requiresAuth || rawMeta?.requiresAuth) {
    return true
  }

  return normalized === '/dashboard' || normalized.startsWith('/dashboard/')
}

function hasRecoverableSessionEvidence(): boolean {
  return Boolean(
    getToken() ||
      getRefreshToken() ||
      hasSessionHint() ||
      hasKnownUser() ||
      isTelegramMiniAppAuthContext(),
  )
}

function SessionModalHost() {
  const orchestrator = useSessionOrchestrator()
  const navigate = useNavigate()
  const location = useLocation()
  const isMiniAppRuntime = isTelegramMiniApp(location.pathname)

  if (orchestrator.sessionModal.kind === 'auth') {
    if (isMiniAppRuntime) {
      return null
    }

    return (
      <AuthModal
        isOpen
        onClose={orchestrator.closeModal}
        defaultMode={orchestrator.sessionModal.mode}
      />
    )
  }

  if (orchestrator.sessionModal.kind === 'protected_access') {
    const modal = orchestrator.sessionModal

    return (
      <BaseModal isOpen onClose={orchestrator.closeModal} panelClassName="max-w-xl rounded-[28px] bg-[var(--bg-primary)] p-0 shadow-[0_24px_80px_rgba(8,15,32,0.42)]">
        <div className="rounded-[28px] border border-[var(--border-primary)] bg-[linear-gradient(180deg,rgba(18,27,47,0.96),rgba(10,14,25,0.98))] p-6 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">Доступ</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{modal.title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/72">{modal.message}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="hero-cta-secondary flex-1"
              onClick={orchestrator.closeModal}
            >
              Залишитись тут
            </button>
            <button
              type="button"
              className="hero-cta-primary flex-1"
              onClick={() => {
                orchestrator.closeModal()
                orchestrator.beginProtectedNavigation({ path: modal.ctaPath })
                navigate(modal.ctaPath)
              }}
            >
              {modal.ctaLabel}
            </button>
          </div>
        </div>
      </BaseModal>
    )
  }

  return null
}

function SessionRouteLoadingLayer() {
  const { isProtectedRoute, routeReady, isRouteTransitioning, appState } = useSessionOrchestrator()
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false)

  useEffect(() => {
    if (appState === 'auth_restoring') {
      setShowTransitionOverlay(true)
      return
    }

    if (!isRouteTransitioning) {
      setShowTransitionOverlay(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowTransitionOverlay(true)
    }, 120)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [appState, isRouteTransitioning])

  if (!isProtectedRoute) return null
  if (routeReady && !isRouteTransitioning) return null
  if (appState !== 'auth_restoring' && !showTransitionOverlay) return null

  const label =
    appState === 'auth_restoring'
      ? 'Відновлюємо сесію'
      : isRouteTransitioning
        ? 'Відкриваємо модуль'
        : 'Готуємо простір'

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[rgba(6,10,18,0.58)] backdrop-blur-sm">
      <div className="w-full max-w-md px-4">
        <div className="rounded-[28px] border border-[var(--border-primary)] bg-[linear-gradient(180deg,rgba(16,24,42,0.96),rgba(9,13,22,0.98))] p-6 shadow-[0_24px_80px_rgba(8,15,32,0.42)]">
          <LoadingFallback />
          <p className="mt-4 text-center text-sm text-white/70">{label}</p>
        </div>
      </div>
    </div>
  )
}

export function SessionOrchestratorProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const user = useAppSelector(selectCurrentUser)
  const { setAccent, setBgColor, setMode } = useThemeContext()

  const theme = useMemo(
    () => ({
      setAccent,
      setMode,
      setBgColor,
    }),
    [setAccent, setBgColor, setMode],
  )

  const isProtectedRoute = useMemo(() => isProtectedPath(location.pathname), [location.pathname])
  const [appState, setAppState] = useState<SessionAppState>('booting')
  const [authRestoreStatus, setAuthRestoreStatus] = useState<AuthRestoreStatus>('idle')
  const [sessionModal, setSessionModal] = useState<SessionModalState>({ kind: 'closed' })
  const [pendingNavigation, setPendingNavigation] = useState<NavigationRequest | null>(null)
  const [routeTransitionTarget, setRouteTransitionTarget] = useState<string | null>(null)
  const [restoreAttempted, setRestoreAttempted] = useState(false)
  const [lastRestoreAt, setLastRestoreAt] = useState(0)
  const [restoreFailureWithEvidence, setRestoreFailureWithEvidence] = useState(false)

  const accessQuery = useGetMyAccessQuery(undefined, {
    skip: !isAuthenticated || authRestoreStatus !== 'ready',
    refetchOnFocus: false,
    refetchOnReconnect: false,
    refetchOnMountOrArgChange: true,
  })
  const systemStateQuery = useGetMySystemStateQuery(undefined, {
    skip: !isAuthenticated || authRestoreStatus !== 'ready',
    refetchOnFocus: false,
    refetchOnReconnect: false,
    refetchOnMountOrArgChange: true,
  })

  const isAccessReady = !isAuthenticated || accessQuery.isSuccess || accessQuery.isError
  const isSystemReady = !isAuthenticated || systemStateQuery.isSuccess || systemStateQuery.isError
  const canRunProtectedQueries = isAuthenticated && authRestoreStatus === 'ready'
  const routeReady = !isProtectedRoute
    ? true
    : isAuthenticated
      ? authRestoreStatus === 'ready' && isAccessReady && isSystemReady && !routeTransitionTarget
      : authRestoreStatus === 'ready' || authRestoreStatus === 'failed'

  const isNavigationLocked =
    appState === 'booting' ||
    appState === 'auth_restoring' ||
    (isProtectedRoute && (!routeReady || !isAuthenticated)) ||
    Boolean(routeTransitionTarget)

  const restorePromiseRef = useRef<Promise<boolean> | null>(null)
  const lastSyncStartedAtRef = useRef(0)
  const debugEventsRef = useRef<DebugEvent[]>([])
  const locationPathRef = useRef(location.pathname)
  const bootstrapRestoreRef = useRef<((reason?: RestoreReason) => Promise<boolean>) | null>(null)
  const dismissedProtectedPathRef = useRef<string | null>(null)
  const isAuthenticatedRef = useRef(isAuthenticated)
  const dispatchRef = useRef(dispatch)
  const navigateRef = useRef(navigate)
  const themeRef = useRef(theme)
  const sessionModalKindRef = useRef(sessionModal.kind)

  useEffect(() => {
    locationPathRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated
  }, [isAuthenticated])

  useEffect(() => {
    dispatchRef.current = dispatch
  }, [dispatch])

  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    sessionModalKindRef.current = sessionModal.kind
  }, [sessionModal.kind])

  useEffect(() => {
    if (dismissedProtectedPathRef.current === `${location.pathname}${location.search}`) {
      dismissedProtectedPathRef.current = null
    }
  }, [location.pathname, location.search])

  const setRestoreAtAndStatus = useCallback((timestamp: number) => {
    setLastRestoreAt(timestamp)
  }, [])

  const pushDebugEvent = useCallback((type: string, data?: Record<string, unknown>) => {
    const nextEvent: DebugEvent = {
      at: new Date().toISOString(),
      type,
      data,
    }

    debugEventsRef.current = [...debugEventsRef.current.slice(-(DEBUG_LOG_LIMIT - 1)), nextEvent]
  }, [])

  const restoreSession = useCallback(async (reason: RestoreReason = 'manual') => {
    const now = Date.now()
    if (restorePromiseRef.current) {
      pushDebugEvent('restore.reused', { reason })
      return restorePromiseRef.current
    }

    if (reason !== 'bootstrap' && now - lastSyncStartedAtRef.current < REHYDRATE_COOLDOWN_MS) {
      pushDebugEvent('restore.skipped_cooldown', { reason, deltaMs: now - lastSyncStartedAtRef.current })
      return isAuthenticatedRef.current
    }

    const hadEvidence = hasRecoverableSessionEvidence()
    logAuthTrace('hydrationStarted', {
      reason,
      tokenFound: hadEvidence,
      routeGuardTriggered: isProtectedPath(locationPathRef.current),
    })
    setAuthRestoreStatus('restoring')
    setAppState('auth_restoring')
    setRestoreAttempted(true)
    lastSyncStartedAtRef.current = now
    pushDebugEvent('restore.started', {
      reason,
      hadEvidence,
      path: locationPathRef.current,
      isTelegramContext: isTelegramMiniAppAuthContext(),
    })

    const promise = syncAuthSession({
      allowRefreshWithoutHint: reason === 'bootstrap' || reason === 'navigation' || shouldAllowSessionProbeWithoutHint(),
      dispatch: dispatchRef.current,
      theme: themeRef.current,
    })
      .then(async (restored) => {
        const durationMs = Date.now() - now
        setRestoreAtAndStatus(now)
        if (restored) {
          setRestoreFailureWithEvidence(false)
          setAuthRestoreStatus('ready')
          logAuthTrace('hydrationFinished', {
            reason,
            ok: true,
            durationMs,
            tokenValid: true,
          })
          pushDebugEvent('restore.succeeded', { reason, path: locationPathRef.current })
          return true
        }

        setRestoreFailureWithEvidence(hadEvidence)
        setAuthRestoreStatus('failed')
        logAuthTrace('hydrationFinished', {
          reason,
          ok: false,
          durationMs,
          tokenValid: false,
          logoutReason: hadEvidence ? 'restore_failed_with_evidence' : 'no_session_evidence',
        })
        pushDebugEvent('restore.failed', { reason, hadEvidence, path: locationPathRef.current })
        return false
      })
      .catch((error) => {
        const durationMs = Date.now() - now
        setRestoreAtAndStatus(now)
        setRestoreFailureWithEvidence(hadEvidence)
        setAuthRestoreStatus('failed')
        logAuthTrace('hydrationFinished', {
          reason,
          ok: false,
          durationMs,
          tokenValid: false,
          logoutReason: 'restore_exception',
          unauthorizedSource: error instanceof Error ? error.message : 'unknown',
        })
        pushDebugEvent('restore.errored', {
          reason,
          hadEvidence,
          path: locationPathRef.current,
          message: error instanceof Error ? error.message : 'unknown',
        })
        return false
      })
      .finally(() => {
        restorePromiseRef.current = null
      })

    restorePromiseRef.current = promise
    return promise
  }, [])

  useEffect(() => {
    bootstrapRestoreRef.current = restoreSession
  }, [restoreSession])

  useEffect(() => {
    void bootstrapRestoreRef.current?.('bootstrap')
  }, [])

  useEffect(() => {
    if (!restoreAttempted && authRestoreStatus === 'idle') return

    if (authRestoreStatus === 'restoring') {
      setAppState('auth_restoring')
      return
    }

    if (isAuthenticated) {
      if (authRestoreStatus !== 'ready') {
        setAuthRestoreStatus('ready')
      }
      setAppState('authenticated')
      return
    }

    if (restoreFailureWithEvidence) {
      setAppState(isProtectedRoute || pendingNavigation ? 'recovery_required' : 'expired')
      return
    }

    setAppState('guest')
  }, [authRestoreStatus, isAuthenticated, isProtectedRoute, pendingNavigation, restoreAttempted, restoreFailureWithEvidence])

  useEffect(() => {
    if (!routeTransitionTarget) return

    const currentRoute = `${location.pathname}${location.search}`
    if (currentRoute === routeTransitionTarget) {
      pushDebugEvent('navigation.completed', { target: routeTransitionTarget })
      setRouteTransitionTarget(null)
      return
    }

    const timeoutId = window.setTimeout(() => {
      pushDebugEvent('navigation.timeout', {
        currentRoute,
        target: routeTransitionTarget,
      })
      setRouteTransitionTarget(null)
    }, ROUTE_TRANSITION_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [location.pathname, location.search, pushDebugEvent, routeTransitionTarget])

  useEffect(() => {
    if (!pendingNavigation) return
    if (appState === 'auth_restoring') return

    if (isAuthenticated && isAccessReady && isSystemReady) {
      const nextRequest = pendingNavigation
      setPendingNavigation(null)
      setRouteTransitionTarget(nextRequest.path)
      pushDebugEvent('navigation.resumed', { target: nextRequest.path })
      navigate(nextRequest.path, { replace: nextRequest.replace })
      return
    }

    if (!isAuthenticated) {
      setSessionModal({
        kind: 'auth',
        mode: resolvePreferredAuthMode('login'),
        reason: isTelegramMiniAppAuthContext() ? 'telegram_required' : 'protected_route',
      })
    }
  }, [appState, isAccessReady, isAuthenticated, isSystemReady, navigate, pendingNavigation, pushDebugEvent])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && !AUTH_STORAGE_KEYS.has(event.key)) return
      void restoreSession('storage')
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [restoreSession])

  useEffect(() => {
    if (!isProtectedRoute || appState === 'auth_restoring') return

    if (!isAuthenticated && restoreAttempted) {
      logAuthTrace('routeGuardTriggered', {
        routeGuardTriggered: true,
        authRestoreStatus,
        unauthorizedSource: 'protected_route_modal',
      })
      const currentPath = `${location.pathname}${location.search}`
      if (dismissedProtectedPathRef.current === currentPath) {
        return
      }

      setSessionModal((current) => {
        if (current.kind !== 'closed') return current
        return {
          kind: 'auth',
          mode: resolvePreferredAuthMode('login'),
          reason: isTelegramMiniAppAuthContext() ? 'telegram_required' : 'protected_route',
        }
      })
      setPendingNavigation((current) => current ?? { path: `${location.pathname}${location.search}` })
    }
  }, [appState, isAuthenticated, isProtectedRoute, location.pathname, location.search, restoreAttempted])

  useEffect(() => {
    if (typeof window === 'undefined' || !import.meta.env.DEV) return

    ;(window as Window & {
      __STARWAY_SESSION_DEBUG__?: {
        getEvents: () => DebugEvent[]
        getState: () => Record<string, unknown>
      }
    }).__STARWAY_SESSION_DEBUG__ = {
      getEvents: () => debugEventsRef.current,
      getState: () => ({
        appState,
        authRestoreStatus,
        isAuthenticated,
        routeReady,
        isProtectedRoute,
        routeTransitionTarget,
        pendingNavigation,
        lastRestoreAt,
        userId: user?.id ?? null,
      }),
    }
  }, [
    appState,
    authRestoreStatus,
    isAuthenticated,
    isProtectedRoute,
    lastRestoreAt,
    pendingNavigation,
    routeReady,
    routeTransitionTarget,
    user?.id,
  ])

  const beginProtectedNavigation = useCallback((request: NavigationRequest, options?: { queue?: boolean }) => {
    if (options?.queue) {
      setPendingNavigation((current) => (
        current?.path === request.path && current.replace === request.replace ? current : request
      ))
    }
    setRouteTransitionTarget((current) => current === request.path ? current : request.path)
    pushDebugEvent('navigation.started', {
      target: request.path,
      replace: request.replace ?? false,
      queued: options?.queue ?? false,
    })
  }, [pushDebugEvent])

  const completeProtectedNavigation = useCallback(() => {
    setRouteTransitionTarget((current) => current === null ? current : null)
  }, [])

  const openAuthModal = useCallback((options?: Partial<Extract<SessionModalState, { kind: 'auth' }>>) => {
    setSessionModal((current) => {
      const nextModal: SessionModalState = {
        kind: 'auth',
        mode: options?.mode ?? resolvePreferredAuthMode('login'),
        reason: options?.reason ?? 'manual',
        title: options?.title,
        message: options?.message,
      }

      if (
        current.kind === 'auth' &&
        current.mode === nextModal.mode &&
        current.reason === nextModal.reason &&
        current.title === nextModal.title &&
        current.message === nextModal.message
      ) {
        return current
      }

      return nextModal
    })
  }, [])

  const openProtectedAccessModal = useCallback((options: Omit<Extract<SessionModalState, { kind: 'protected_access' }>, 'kind'>) => {
    setSessionModal((current) => {
      const nextModal: SessionModalState = {
        kind: 'protected_access',
        ...options,
      }

      if (
        current.kind === 'protected_access' &&
        current.title === nextModal.title &&
        current.message === nextModal.message &&
        current.ctaLabel === nextModal.ctaLabel &&
        current.ctaPath === nextModal.ctaPath
      ) {
        return current
      }

      return nextModal
    })
  }, [])

  const closeModal = useCallback(() => {
    const currentPath = `${locationPathRef.current}${window.location.search}`
    if (sessionModalKindRef.current === 'auth' && !isAuthenticatedRef.current && isProtectedPath(locationPathRef.current)) {
      dismissedProtectedPathRef.current = currentPath
      setRouteTransitionTarget((current) => current === null ? current : null)
      pushDebugEvent('navigation.dismissed_to_guest', {
        currentPath,
        fallback: SAFE_GUEST_FALLBACK_ROUTE,
      })
      navigateRef.current(SAFE_GUEST_FALLBACK_ROUTE, { replace: true })
    }
    setSessionModal((current) => current.kind === 'closed' ? current : { kind: 'closed' })
  }, [pushDebugEvent])

  const contextValue = useMemo<SessionOrchestratorValue>(() => ({
    appState,
    authRestoreStatus,
    routeReady,
    isNavigationLocked,
    isProtectedRoute,
    canRunProtectedQueries,
    accessData: accessQuery.data,
    systemStateData: systemStateQuery.data,
    isAccessReady,
    isSystemReady,
    isRouteTransitioning: Boolean(routeTransitionTarget),
    restoreSession,
    beginProtectedNavigation,
    completeProtectedNavigation,
    openAuthModal,
    openProtectedAccessModal,
    closeModal,
    sessionModal,
  }), [
    appState,
    authRestoreStatus,
    beginProtectedNavigation,
    canRunProtectedQueries,
    closeModal,
    completeProtectedNavigation,
    accessQuery.data,
    isAccessReady,
    isNavigationLocked,
    isProtectedRoute,
    isSystemReady,
    openAuthModal,
    openProtectedAccessModal,
    restoreSession,
    routeReady,
    routeTransitionTarget,
    sessionModal,
    systemStateQuery.data,
  ])

  return (
    <SessionOrchestratorContext.Provider value={contextValue}>
      {children}
      <SessionRouteLoadingLayer />
      <SessionModalHost />
    </SessionOrchestratorContext.Provider>
  )
}

export function useSessionOrchestrator() {
  const value = useContext(SessionOrchestratorContext)

  if (!value) {
    throw new Error('useSessionOrchestrator must be used within SessionOrchestratorProvider')
  }

  return value
}
