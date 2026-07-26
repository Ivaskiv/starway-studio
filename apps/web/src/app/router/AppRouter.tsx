import { useAppSelector } from '@/app/hooks'
import { PUBLIC_INFO_ROUTES, isProtectedPath, isPublicPath } from '@/app/router/pathAccess'
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
  ContinueFlowPage,
  DevRoutesPage,
  FocusRouteView,
  InfoPage,
  LoginPage,
  MiniAppPage,
  ProductInfoPage,
  ResetPasswordPage,
  StartFlowPage,
  TelegramSuccessPage,
  WelcomeTestPage,
  WheelStartPage,
} from '@/app/router/routePages'
import { ROUTES, toAppRoutePath } from '@/config/routes'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'
import {
  FOCUS_ALIAS_ROUTE,
  FOCUS_ROUTE,
} from '@/features/landings/focus/content/constants'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import CleanMiniAppZoomCalendar from '@/features/zoom/routes/CleanMiniAppZoomCalendar'
import MainLayout from '@/layout/MainLayout'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

const HOME_ALIASES = ['/home', '/landing', '/welcome'] as const
const TASK_REDIRECT_PATHS = ['/task', '/tasks', '/planner'] as const
const MINIAPP_TASK_TARGET = '/miniapp/mentor?section=tasks'
const MINIAPP_ZOOM_TARGET = '/miniapp/zoom-calendar'
const MINIAPP_MENTOR_TARGET = '/miniapp/mentor'

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
      <Route path="/test" element={<AbTestPage />} />
      <Route path="/test/*" element={<AbTestPage />} />
      <Route path="/test/result" element={<AbTestPage />} />
      <Route path="/test/result/*" element={<AbTestPage />} />
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

function renderInfoRoutes() {
  return PUBLIC_INFO_ROUTES.map((path) => (
    <Route key={path} path={path} element={<InfoPage />} />
  ))
}

function PublicMiniAppRoute() {
  return <MiniAppPage />
}

function PublicAppRouter() {
  return (
    <Routes>
      {renderAbTestRoutes()}
      <Route element={<MainLayout />}>
        {/* <Route path={ROUTES.HOME} element={<HomePage />} /> */}
        {/* {renderHomeAliasRoutes()} */}
        {/* <Route path={ROUTES.PRICING} element={<HomePage />} /> */}
        <Route path="/welcome-test/:linkToken" element={<WelcomeTestPage />} />
        <Route path={FOCUS_ROUTE} element={<FocusRouteView />} />
        {FOCUS_ALIAS_ROUTE !== FOCUS_ROUTE ? (
          <Route path={FOCUS_ALIAS_ROUTE} element={<Navigate to={FOCUS_ROUTE} replace />} />
        ) : null}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        {/* <Route path="/auth" element={<Navigate to={ROUTES.HOME} replace />} /> */}
        <Route path={ROUTES.TELEGRAM_SUCCESS} element={<TelegramSuccessPage />} />
        <Route path={ROUTES.MAGIC_LOGIN} element={<TelegramSuccessPage />} />
        <Route path={ROUTES.ONBOARDING_START} element={<StartFlowPage />} />
        <Route path={ROUTES.ONBOARDING_CONTINUE} element={<ContinueFlowPage />} />
        <Route path={ROUTES.WHEEL_START} element={<WheelStartPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
        <Route path={ROUTES.DEV_ROUTES} element={<DevRoutesPage />} />
        <Route path="/products/:slug" element={<ProductInfoPage />} />
        {renderInfoRoutes()}
      </Route>
      <Route path="/miniapp" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
      <Route path="/miniapp/zoom-calendar" element={<CleanMiniAppZoomCalendar />} />
      <Route path="/miniapp/*" element={<PublicMiniAppRoute />} />
      {renderTaskRedirectRoutes()}
      <Route path="/content" element={<Navigate to="/miniapp/library" replace />} />
      <Route path="/zoom" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
      <Route path="/zoom-calendar" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
      {/* <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} /> */}
    </Routes>
  )
}

function GuestAppRouter() {
  return (
    <Routes>
      {renderAbTestRoutes()}
      <Route element={<MainLayout />}>
        {/* <Route path={ROUTES.HOME} element={<HomePage />} /> */}
        {/* {renderHomeAliasRoutes()} */}
        {/* <Route path={ROUTES.PRICING} element={<HomePage />} /> */}
        <Route path={FOCUS_ROUTE} element={<FocusRouteView />} />
        {FOCUS_ALIAS_ROUTE !== FOCUS_ROUTE ? (
          <Route path={FOCUS_ALIAS_ROUTE} element={<Navigate to={FOCUS_ROUTE} replace />} />
        ) : null}
        {renderTaskRedirectRoutes()}
        <Route path="/content" element={<Navigate to="/miniapp/library" replace />} />
        {/* <Route path={ROUTES.LOGIN} element={<Navigate to={`${ROUTES.HOME}?auth=login`} replace />} /> */}
        {/* <Route path="/register" element={<Navigate to={`${ROUTES.HOME}?auth=register`} replace />} /> */}
        {/* <Route path="/auth" element={<Navigate to={ROUTES.HOME} replace />} /> */}
        <Route path={ROUTES.MAGIC_LOGIN} element={<TelegramSuccessPage />} />
        <Route path="/products/:slug" element={<ProductInfoPage />} />
        {renderInfoRoutes()}
      </Route>
      <Route path="/miniapp" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
      <Route path="/zoom" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
      <Route path="/zoom-calendar" element={<Navigate to={MINIAPP_ZOOM_TARGET} replace />} />
      <Route path="/miniapp/zoom-calendar" element={<CleanMiniAppZoomCalendar />} />
      <Route path="/miniapp/*" element={<PublicMiniAppRoute />} />
      {/* <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} /> */}
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
  const isTelegramRuntime = isTelegramMiniApp(location.pathname)
  const isTelegramProductRoute =
    location.pathname.startsWith(ROUTES.MINIAPP) ||
    location.pathname === '/zoom' ||
    location.pathname === '/zoom-calendar' ||
    location.pathname === '/miniapp/zoom-calendar' ||
    location.pathname === '/task' ||
    location.pathname === '/tasks' ||
    location.pathname === '/planner' ||
    location.pathname === '/content'

  if (isTelegramRuntime && !isTelegramProductRoute) {
    return <Navigate to={resolveTelegramRuntimeTarget(location.pathname, location.search)} replace />
  }

  if (!user) {
    return <GuestAppRouter />
  }

  if (isProtectedPath(location.pathname)) {
    return <ProtectedAppRouter />
  }

  if (isPublicPath(location.pathname)) {
    return <PublicAppRouter />
  }

  return <PublicAppRouter />
}
