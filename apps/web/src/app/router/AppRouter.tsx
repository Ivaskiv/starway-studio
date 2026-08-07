import { useAppSelector } from '@/app/hooks'
import { isProtectedPath } from '@/app/router/pathAccess'
import {
  ADMIN_ROUTES,
  DASHBOARD_ROUTES,
  PROTECTED_ALIASES,
  devMode,
  toLegacyRouteRedirect,
  withGuard,
} from '@/app/router/routeConfig'
import {
  AbTestLandingRouteView,
  AbTestPage,
  FocusRouteView,
  MiniAppPage,
} from '@/app/router/routePages'
import { ROUTES, toAppRoutePath } from '@/config/routes'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import {
  FOCUS_ALIAS_ROUTE,
  FOCUS_ROUTE,
} from '@/features/landings/focus/content/constants'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import CleanMiniAppZoomCalendar from '@/features/zoom/routes/CleanMiniAppZoomCalendar'
import LoadingFallback from '@/features/user/userMenu/LoadingFallback'
import MainLayout from '@/layout/MainLayout'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

const HOME_ALIASES = ['/home', '/landing', '/welcome'] as const
const TASK_REDIRECT_PATHS = ['/task', '/tasks', '/planner'] as const
const MINIAPP_TASK_TARGET = '/miniapp/mentor?section=tasks'
const MINIAPP_ZOOM_TARGET = '/miniapp/zoom-calendar'
const MINIAPP_MENTOR_TARGET = '/miniapp/mentor'

function isPublicWebsiteRoute(pathname: string): boolean {
  return (
    pathname === FOCUS_ROUTE ||
    pathname === FOCUS_ALIAS_ROUTE ||
    pathname === ROUTES.AB_TEST ||
    pathname.startsWith(`${ROUTES.AB_TEST}/`)
  )
}

function isTelegramMiniAppRoute(pathname: string): boolean {
  return (
    pathname === ROUTES.MINIAPP ||
    pathname.startsWith(`${ROUTES.MINIAPP}/`) ||
    pathname === '/zoom' ||
    pathname === '/zoom-calendar' ||
    pathname === '/task' ||
    pathname === '/tasks' ||
    pathname === '/planner' ||
    pathname === '/content'
  )
}

function hasTelegramRuntimeEvidence(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const search = new URLSearchParams(window.location.search)
  const hasTelegramQueryHints =
    search.has('tgWebAppPlatform') ||
    search.has('tgWebAppVersion') ||
    search.has('tgWebAppThemeParams') ||
    search.has('tgWebAppStartParam')

  const initData = (window as {
    Telegram?: {
      WebApp?: {
        initData?: string
      }
    }
  }).Telegram?.WebApp?.initData?.trim()

  return Boolean(initData || hasTelegramQueryHints)
}

function resolveTelegramRuntimeTarget(pathname: string, search: string): string {
  if (pathname.startsWith('/dashboard/ai-mentor')) {
    return `${MINIAPP_MENTOR_TARGET}${search}`
  }

  if (pathname.startsWith('/dashboard/profile') || pathname.startsWith('/dashboard/settings')) {
    return `/miniapp/profile${search}`
  }

  if (pathname.startsWith('/dashboard/progress') || pathname.startsWith('/dashboard/journal')) {
    return `/miniapp/tracker${search}`
  }

  return MINIAPP_ZOOM_TARGET
}

function renderAbTestRoutes() {
  return (
    <>
      <Route path={ROUTES.AB_TEST} element={<AbTestLandingRouteView />} />
      <Route path={ROUTES.AB_TEST_QUIZ} element={<AbTestPage />} />
      <Route path={`${ROUTES.AB_TEST_QUIZ}/*`} element={<AbTestPage />} />
      <Route path="/ab-test/result" element={<AbTestPage />} />
      <Route path="/ab-test/result/*" element={<AbTestPage />} />
    </>
  )
}

// function renderHomeAliasRoutes() {
//   return HOME_ALIASES.map((path) => <Route key={path} path={path} element={<HomePage />} />)
// }

function renderTaskRedirectRoutes() {
  return TASK_REDIRECT_PATHS.map((path) => (
    <Route key={path} path={path} element={<Navigate to={MINIAPP_TASK_TARGET} replace />} />
  ))
}

function PublicMiniAppRoute() {
  return <MiniAppPage />
}

function PublicWebsiteRouter() {
  return (
    <Routes>
      {renderAbTestRoutes()}
      <Route path={FOCUS_ROUTE} element={<FocusRouteView />} />
      {FOCUS_ALIAS_ROUTE !== FOCUS_ROUTE ? (
        <Route path={FOCUS_ALIAS_ROUTE} element={<Navigate to={FOCUS_ROUTE} replace />} />
      ) : null}
      <Route path="*" element={<FocusRouteView />} />
    </Routes>
  )
}

function TelegramMiniAppRouter() {
  return (
    <Routes>
      <Route path="/miniapp" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
      <Route path="/miniapp/zoom-calendar" element={<CleanMiniAppZoomCalendar />} />
      <Route path="/miniapp/*" element={<PublicMiniAppRoute />} />
      {renderTaskRedirectRoutes()}
      <Route path="/content" element={<Navigate to="/miniapp/library" replace />} />
      <Route path="/zoom" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
      <Route path="/zoom-calendar" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
      <Route path="*" element={<Navigate to={FOCUS_ROUTE} replace />} />
    </Routes>
  )
}

function ProtectedAppRouter() {
  const protectedRoutes = [...DASHBOARD_ROUTES, ...PROTECTED_ALIASES]

  return (
    <Routes>
      <Route element={<MainLayout dashboard />}>
        <Route path="/zoom" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
        <Route path="/zoom-calendar" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
        <Route path="/miniapp/zoom-calendar" element={<CleanMiniAppZoomCalendar />} />
        {protectedRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path.startsWith('/dashboard') ? toAppRoutePath(route.path) : route.path}
            element={withGuard(route)}
          />
        ))}
        {ADMIN_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={withGuard(route)} />
        ))}
        {DASHBOARD_ROUTES.map((route) => (
          <Route
            key={`legacy:${route.path}`}
            path={route.path}
            element={withGuard({
              ...route,
              element: toLegacyRouteRedirect(route.path),
              ability: route.ability ?? 'dashboard.view',
            })}
          />
        ))}
      </Route>
      {/* <Route
        path="*"
        element={<Navigate to={devMode ? toAppRoutePath('/dashboard') : ROUTES.HOME} replace />}
      /> */}
    </Routes>
  )
}

export default function AppRouter() {
  const location = useLocation()
  const user = useAppSelector(selectCurrentUser)
  const { authRestoreStatus } = useSessionOrchestrator()
  const isTelegramRuntime = isTelegramMiniApp(location.pathname)
  const isMiniAppRoute = isTelegramMiniAppRoute(location.pathname)
  const isAuthRestoring = authRestoreStatus === 'idle' || authRestoreStatus === 'restoring'

  if (isTelegramRuntime && !isMiniAppRoute && !isProtectedPath(location.pathname) && !isPublicWebsiteRoute(location.pathname)) {
    return <Navigate to={resolveTelegramRuntimeTarget(location.pathname, location.search)} replace />
  }

  if (isMiniAppRoute) {
    if (user) {
      return <TelegramMiniAppRouter />
    }

    if (isAuthRestoring || hasTelegramRuntimeEvidence()) {
      return <LoadingFallback />
    }

    return <PublicWebsiteRouter />
  }

  if (isProtectedPath(location.pathname)) {
    return <ProtectedAppRouter />
  }

  if (isPublicWebsiteRoute(location.pathname)) {
    return <PublicWebsiteRouter />
  }

  return <PublicWebsiteRouter />
}
