// frontend/src/App.tsx

import { ROUTES, toAppRoutePath } from '@/config/routes'
import GlobalAssistant from '@/features/assistant/components/GlobalAssistant'
import DeepLinkAuthBridge from '@/features/auth/components/DeepLinkAuthBridge'
import ProtectedRoute from '@/features/auth/components/ProtectedRoute'
import { SessionOrchestratorProvider } from '@/features/auth/context/SessionOrchestratorContext'
import { useAppSelector } from '@/app/hooks'
import { selectCurrentUser, selectUserRole } from '@/features/auth/services/auth.slice'
import {
  useTelegramMiniAppAuthMutation,
  useUpdateUserSettingsMutation,
} from '@/features/auth/services/auth.api'
import type { AccessKey } from '@/features/auth/types/auth.types'
import {
  FOCUS_ALIAS_ROUTE,
  FOCUS_ROUTE,
} from '@/features/landings/focus/content/constants'
import { CoachZoomPanel, UserZoomPanel } from '@/features/zoom'
import ZoomCalendar from '@/features/zoom/ZoomCalendar'
import LoadingFallback from '@/features/user/userMenu/LoadingFallback'
import MainLayout from '@/layout/MainLayout'
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

const HomePage = lazy(() => import('@/pages/HomePage'))
const AbTestPage = lazy(
  () => import('@/features/ab-test/pages/AbTestPage')
)
const WelcomeTestPage = lazy(
  () => import('@/features/welcome-test/pages/WelcomeTestPage')
)
const FocusRouteView = lazy(
  () => import('@/features/landings/focus/pages/FocusRouteView')
)
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const TelegramSuccessPage = lazy(
  () => import('@/pages/auth/TelegramSuccessPage')
)
const StartFlowPage = lazy(() => import('@/pages/onboarding/StartFlowPage'))
const ContinueFlowPage = lazy(
  () => import('@/pages/onboarding/ContinueFlowPage')
)
const Dashboard = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const Settings = lazy(() => import('@/features/settings/pages/SettingsPage'))
const TelegramPage = lazy(
  () => import('@/features/telegram/pages/TelegramPage')
)
const Wheel = lazy(() => import('@/features/wheel/pages/WheelPage'))
const WheelStart = lazy(() => import('@/features/wheel/pages/WheelStartPage'))
const DailyCycle = lazy(
  () => import('@/features/daily-cycle/pages/DailyCyclePage')
)
const Journal = lazy(() => import('@/features/journal/JournalPage'))
const Vision = lazy(() => import('@/features/vision/pages/VisionPage'))
const Goals = lazy(() => import('@/features/goals/pages/GoalsPage'))
const TrialMirror = lazy(() => import('@/features/goals/pages/TrialMirrorPage'))
const WeeklyMirror = lazy(
  () => import('@/features/goals/pages/WeeklyMirrorPage')
)
const Actions = lazy(() => import('@/features/actions/pages/ActionsPage'))
const Courses = lazy(() => import('@/features/mini-courses/pages/CoursesPage'))
const ProductInfo = lazy(
  () => import('@/features/mini-courses/pages/ProductInfoPage')
)
const Subscription = lazy(
  () => import('@/features/subscription/pages/SubscriptionPage')
)
const AiMentorDashboard = lazy(
  () => import('@/features/daily-cycle/pages/AiMentorDashboardPage')
)
const Products = lazy(() => import('@/features/products/pages/ProductsPage'))
const ProductCreation = lazy(
  () => import('@/features/products/pages/ProductCreationPage')
)
const Profile = lazy(() => import('@/features/user/pages/UserProfilePage'))
const InfoPage = lazy(() => import('@/pages/InfoPage'))
const MentorLanding = lazy(
  () => import('@/features/ai-mentor/pages/MentorLanding')
)
const MentorSetup = lazy(() => import('@/features/ai-mentor/pages/MentorSetup'))
const ResetPasswordPage = lazy(
  () => import('@/features/auth/pages/ResetPasswordPage')
)
const DevRoutes = lazy(() => import('@/pages/dev/DevRoutes'))
const TransferOwnership = lazy(
  () => import('@/features/admin/pages/TransferOwnershipPage')
)
const MasterPanel = lazy(() => import('@/features/admin/pages/MasterPanelPage'))
const AdminAnalytics = lazy(
  () => import('@/features/analytics/pages/AdminAnalytics')
)
const MiniAppPage = lazy(() => import('@/features/social/pages/MiniAppPage'))
const NotificationsPage = lazy(
  () => import('@/features/notifications/pages/Notifications')
)
const SalesAssistantPage = lazy(
  () => import('@/features/sales-assistant/pages/SalesAssistantPage')
)
const PlatformPage = lazy(() => import('@/features/platform/pages/PlatformPage'))

type RouteConfig = {
  path: string
  element: ReactElement
  ability?: AccessKey
  showDeniedScreen?: boolean
}

const PUBLIC_INFO_ROUTES = [
  '/help',
  '/about',
  '/blog',
  '/careers',
  '/contact',
  '/faq',
  '/privacy',
  '/terms',
  '/cookies',
] as const

const PROTECTED_PATH_PREFIXES = [
  ROUTES.APP,
  '/admin',
  '/dashboard',
  '/settings',
  '/subscriptions',
  '/subscription',
  '/platform',
  '/wheel/private',
  '/goals/private',
  '/progress/private',
] as const

const PUBLIC_PATH_PREFIXES = [
  ROUTES.MINIAPP,
  ROUTES.AB_TEST,
  '/test', // [FIX] alias for AbTestPage — matches /test and /test/*
  '/focus',
  '/products',
  '/help',
  '/about',
  '/blog',
  '/careers',
  '/contact',
  '/faq',
  '/privacy',
  '/terms',
  '/cookies',
] as const

const PUBLIC_EXACT_PATHS = new Set<string>([
  ROUTES.HOME,
  ROUTES.PRICING,
  ROUTES.LOGIN,
  '/register',
  ROUTES.TELEGRAM_SUCCESS,
  ROUTES.ONBOARDING_START,
  ROUTES.ONBOARDING_CONTINUE,
  ROUTES.AB_TEST,
  ROUTES.WHEEL_START,
  ROUTES.RESET_PASSWORD,
  ROUTES.DEV_ROUTES,
])

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix))
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix))
}

function ZoomPageWrapper() {
  const user = useAppSelector(selectCurrentUser)
  const role = useAppSelector(selectUserRole)
  if (!user) return null
  const isCoach = role === 'EXPERT' || role === 'SUPERADMIN'
  return isCoach
    ? <CoachZoomPanel expertId={user.id} />
    : <UserZoomPanel userId={user.id} />
}

function MiniAppZoomRoute() {
  const user = useAppSelector(selectCurrentUser)
  const [telegramMiniAppAuth, { isLoading: isAuthLoading }] = useTelegramMiniAppAuthMutation()
  const [updateUserSettings, { isLoading: isSaving }] = useUpdateUserSettingsMutation()
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const authAttemptedRef = useRef(false)

  useEffect(() => {
    const tgUser = (window as {
      Telegram?: { WebApp?: { initDataUnsafe?: { user?: { first_name?: string } } } }
    }).Telegram?.WebApp?.initDataUnsafe?.user
    if (tgUser?.first_name?.trim()) {
      setFirstName(tgUser.first_name.trim())
    }
  }, [])

  useEffect(() => {
    if (user) {
      setNeedsOnboarding(!user.email || !user.firstName)
      if (user.firstName) setFirstName(user.firstName)
      if (user.email) setEmail(user.email)
      return
    }

    if (authAttemptedRef.current) return
    authAttemptedRef.current = true

    const initData = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData?.trim() ?? ''
    if (!initData) {
      setError('Telegram initData відсутній. Відкрий цю сторінку з Telegram Mini App.')
      setNeedsOnboarding(true)
      return
    }

    void telegramMiniAppAuth({ initData })
      .unwrap()
      .then((result) => {
        setNeedsOnboarding(Boolean(result.needsOnboarding))
      })
      .catch((authError) => {
        console.error('[MiniAppZoomRoute] telegram auth failed', authError)
        setError('Не вдалося авторизуватись через Telegram. Спробуй ще раз.')
      })
  }, [telegramMiniAppAuth, user])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !firstName.trim()) {
      setError("Заповни ім'я та email.")
      return
    }

    try {
      await updateUserSettings({ firstName: firstName.trim(), email: email.trim() }).unwrap()
      setNeedsOnboarding(false)
    } catch (saveError) {
      console.error('[MiniAppZoomRoute] onboarding save failed', saveError)
      setError('Не вдалося зберегти дані. Спробуй ще раз.')
    }
  }

  if (isAuthLoading || needsOnboarding === null) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-10">
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-primary)]">
          Синхронізуємо вхід у Zoom-календар...
        </div>
      </div>
    )
  }

  if (needsOnboarding) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-10">
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <p className="text-sm text-[var(--text-primary)]">
            Щоб бачити розклад Zoom-практик і отримувати нагадування - залиш email. Це займе 10 секунд.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--text-muted)]">Ім&apos;я</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-white/30"
                placeholder="Твоє ім'я"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--text-muted)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-white/30"
                placeholder="you@example.com"
              />
            </label>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] disabled:opacity-60"
            >
              Зберегти і відкрити Zoom-календар
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-10">
        <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-100">
          {error ?? 'Користувача не знайдено. Спробуй відкрити з Telegram ще раз.'}
        </div>
      </div>
    )
  }

  return <ZoomCalendar mode="user" userId={user.id} />
}

const DASHBOARD_ROUTES: RouteConfig[] = [
  { path: '/dashboard', element: <Dashboard />, ability: 'dashboard.view' },
  {
    path: '/dashboard/ai-mentor',
    element: <AiMentorDashboard />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/cycle',
    element: <AiMentorDashboard />,
    ability: 'dashboard.view',
  },
  { path: '/dashboard/wheel', element: <Wheel />, ability: 'dashboard.view' },
  {
    path: '/dashboard/journal',
    element: <Journal />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/calendar',
    element: <AiMentorDashboard />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/microtasks',
    element: <AiMentorDashboard />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/tasks',
    element: <AiMentorDashboard />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/progress',
    element: <Navigate to={toAppRoutePath('/dashboard/journal')} replace />,
    ability: 'progress.view',
  },
  {
    path: '/dashboard/vision',
    element: <Vision />,
    ability: 'dashboard.view',
    showDeniedScreen: true,
  },
  { path: '/dashboard/goals', element: <Goals />, ability: 'dashboard.view' },
  {
    path: '/dashboard/goals/trial-mirror',
    element: <TrialMirror />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/goals/weekly-mirror',
    element: <WeeklyMirror />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/actions',
    element: <Actions />,
    ability: 'mentor.actions',
    showDeniedScreen: true,
  },
  {
    path: '/dashboard/courses',
    element: <Courses />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/ai-seo',
    element: (
      <Navigate to={`${toAppRoutePath('/dashboard')}?section=ai-seo`} replace />
    ),
    ability: 'products.manage',
  },
  {
    path: '/dashboard/ads',
    element: (
      <Navigate
        to={`${toAppRoutePath('/dashboard')}?section=content`}
        replace
      />
    ),
    ability: 'products.manage',
  },
  {
    path: '/dashboard/leadmagnet',
    element: (
      <Navigate
        to={`${toAppRoutePath('/dashboard')}?section=leadmagnet`}
        replace
      />
    ),
    ability: 'funnels.manage',
  },
  {
    path: '/dashboard/students',
    element: (
      <Navigate
        to={`${toAppRoutePath('/dashboard')}?section=students`}
        replace
      />
    ),
    ability: 'admin.clients.view',
  },
  {
    path: '/dashboard/admin/users',
    element: <Navigate to={toAppRoutePath('/dashboard/students')} replace />,
    ability: 'admin.clients.view',
  },
  {
    path: '/dashboard/admin/revenue',
    element: <AdminAnalytics />,
    ability: 'admin.revenue.view',
  },
  {
    path: '/dashboard/admin/studio',
    element: <MasterPanel />,
    ability: 'products.manage',
    showDeniedScreen: true,
  },
  {
    path: '/dashboard/admin/roles',
    element: (
      <Navigate
        to={toAppRoutePath('/dashboard/admin/transfer-ownership')}
        replace
      />
    ),
    ability: 'admin.roles.manage',
  },
  {
    path: '/dashboard/admin/transfer-ownership',
    element: <TransferOwnership />,
    ability: 'admin.roles.manage',
  },
  {
    path: '/dashboard/sessions',
    element: <Navigate to={toAppRoutePath('/dashboard/zoom')} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/products',
    element: <Products />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/product-create',
    element: <ProductCreation />,
    ability: 'dashboard.view',
  },
  { path: '/dashboard/profile', element: <Profile />, ability: 'profile.view' },
  {
    path: '/dashboard/settings',
    element: <Settings />,
    ability: 'settings.manage',
  },
  {
    path: '/dashboard/notifications',
    element: <NotificationsPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/telegram',
    element: <TelegramPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/subscription',
    element: <Subscription />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/zoom',
    element: <ZoomPageWrapper />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/consultation',
    element: <Subscription />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/mentorship',
    element: <Subscription />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/mentor/landing',
    element: <MentorLanding />,
    ability: 'mentor.core',
  },
  {
    path: '/dashboard/mentor/setup',
    element: <MentorSetup />,
    ability: 'mentor.core',
  },
  {
    path: '/dashboard/mentor/workspace',
    element: <AiMentorDashboard />,
    ability: 'mentor.core',
  },
  {
    path: '/platform',
    element: <PlatformPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/platform/*',
    element: <PlatformPage />,
    ability: 'dashboard.view',
  },
]

const ADMIN_ROUTES: RouteConfig[] = [
  {
    path: '/admin/ai-assistant',
    element: <SalesAssistantPage />,
    ability: 'products.manage',
    showDeniedScreen: true,
  },
]

const PROTECTED_ALIASES: RouteConfig[] = [
  {
    path: ROUTES.APP,
    element: <Navigate to={toAppRoutePath('/dashboard')} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/settings',
    element: <Navigate to={ROUTES.SETTINGS} replace />,
    ability: 'settings.manage',
  },
  {
    path: '/settings/*',
    element: <Navigate to={ROUTES.SETTINGS} replace />,
    ability: 'settings.manage',
  },
  {
    path: '/subscription',
    element: <Navigate to={ROUTES.SUBSCRIPTION} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/subscriptions',
    element: <Navigate to={ROUTES.SUBSCRIPTION} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/subscriptions/*',
    element: <Navigate to={ROUTES.SUBSCRIPTION} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/wheel/private',
    element: <Navigate to={ROUTES.WHEEL} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/wheel/private/*',
    element: <Navigate to={ROUTES.WHEEL} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/goals/private',
    element: <Navigate to={ROUTES.GOALS} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/goals/private/*',
    element: <Navigate to={ROUTES.GOALS} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/progress/private',
    element: <Navigate to={ROUTES.PROGRESS} replace />,
    ability: 'progress.view',
  },
  {
    path: '/progress/private/*',
    element: <Navigate to={ROUTES.PROGRESS} replace />,
    ability: 'progress.view',
  },
]

const devMode =
  import.meta.env.DEV || import.meta.env.VITE_AUTH_BYPASS === 'true'

function withGuard(route: RouteConfig): ReactElement {
  if (devMode || !route.ability) return route.element
  return (
    <ProtectedRoute
      ability={route.ability}
      showDeniedScreen={route.showDeniedScreen}
    >
      {route.element}
    </ProtectedRoute>
  )
}

function toLegacyRouteRedirect(path: string): ReactElement {
  return <Navigate to={toAppRoutePath(path)} replace />
}

function PublicMiniAppRoute() {
  return (
    <MiniAppPage />
  )
}

function PublicAppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.PRICING} element={<HomePage />} />
        <Route path={ROUTES.AB_TEST} element={<AbTestPage />} />
        <Route path={`${ROUTES.AB_TEST}/*`} element={<AbTestPage />} />
        {/* [FIX] /test alias for ROUTES.AB_TEST — exact path */}
        <Route path="/test" element={<AbTestPage />} />
        <Route path="/test/*" element={<AbTestPage />} />
        <Route path="/welcome-test/:linkToken" element={<WelcomeTestPage />} />
        <Route path={FOCUS_ROUTE} element={<FocusRouteView />} />
        {FOCUS_ALIAS_ROUTE !== FOCUS_ROUTE ? (
          <Route path={FOCUS_ALIAS_ROUTE} element={<Navigate to={FOCUS_ROUTE} replace />} />
        ) : null}
        <Route
          path={ROUTES.LOGIN}
          element={<LoginPage />}
        />
        <Route
          path="/register"
          element={<LoginPage />}
        />
        <Route
          path={ROUTES.TELEGRAM_SUCCESS}
          element={<TelegramSuccessPage />}
        />
        <Route
          path={ROUTES.ONBOARDING_START}
          element={<StartFlowPage />}
        />
        <Route
          path={ROUTES.ONBOARDING_CONTINUE}
          element={<ContinueFlowPage />}
        />
        <Route
          path={ROUTES.WHEEL_START}
          element={<WheelStart />}
        />
        <Route
          path={ROUTES.RESET_PASSWORD}
          element={<ResetPasswordPage />}
        />
        <Route
          path={ROUTES.DEV_ROUTES}
          element={<DevRoutes />}
        />
        <Route path="/products/:slug" element={<ProductInfo />} />
        {PUBLIC_INFO_ROUTES.map((path) => (
          <Route
            key={path}
            path={path}
            element={<InfoPage />}
          />
        ))}
      </Route>
      <Route path="/miniapp" element={<PublicMiniAppRoute />} />
      <Route path="/miniapp/*" element={<PublicMiniAppRoute />} />
      <Route path="/zoom" element={<MiniAppZoomRoute />} />
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  )
}

function GuestAppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.PRICING} element={<HomePage />} />
        <Route path={ROUTES.AB_TEST} element={<AbTestPage />} />
        <Route path={`${ROUTES.AB_TEST}/*`} element={<AbTestPage />} />
        <Route path="/test" element={<AbTestPage />} />
        <Route path="/test/*" element={<AbTestPage />} />
        <Route path={FOCUS_ROUTE} element={<FocusRouteView />} />
        {FOCUS_ALIAS_ROUTE !== FOCUS_ROUTE ? (
          <Route path={FOCUS_ALIAS_ROUTE} element={<Navigate to={FOCUS_ROUTE} replace />} />
        ) : null}
        <Route
          path={ROUTES.LOGIN}
          element={<Navigate to={`${ROUTES.HOME}?auth=login`} replace />}
        />
        <Route
          path="/register"
          element={<Navigate to={`${ROUTES.HOME}?auth=register`} replace />}
        />
        <Route path="/products/:slug" element={<ProductInfo />} />
        {PUBLIC_INFO_ROUTES.map((path) => (
          <Route
            key={path}
            path={path}
            element={<InfoPage />}
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  )
}

function ProtectedAppRouter() {
  const dashboardRoutes = useMemo(
    () =>
      [...DASHBOARD_ROUTES, ...PROTECTED_ALIASES].map((route) => (
        <Route
          key={route.path}
          path={route.path.startsWith('/dashboard') ? toAppRoutePath(route.path) : route.path}
          element={withGuard(route)}
        />
      )),
    [devMode]
  )

  const legacyDashboardRedirects = useMemo(
    () =>
      DASHBOARD_ROUTES.map((route) => (
        <Route
          key={`legacy:${route.path}`}
          path={route.path}
          element={withGuard({
            path: route.path,
            element: toLegacyRouteRedirect(route.path),
            ability: route.ability ?? 'dashboard.view',
          })}
        />
      )),
    []
  )

  return (
    <Routes>
      <Route element={<MainLayout dashboard />}>
        <Route path="/zoom" element={<MiniAppZoomRoute />} />
        {dashboardRoutes}
        {ADMIN_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={withGuard(route)} />
        ))}
        {legacyDashboardRedirects}
      </Route>
      <Route path="*" element={<Navigate to={devMode ? toAppRoutePath('/dashboard') : ROUTES.HOME} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionOrchestratorProvider>
        <Suspense fallback={<LoadingFallback />}>
          <DeepLinkAuthBridge />
          <AppRouter />
          <GlobalAssistant />
        </Suspense>
      </SessionOrchestratorProvider>
    </BrowserRouter>
  )
}

// function AppRouter() {
//   const location = useLocation()
//   const isFocusRoute = location.pathname === FOCUS_ROUTE || location.pathname === FOCUS_ALIAS_ROUTE

//   if (isFocusRoute) {
//     return (
//       <Routes>
//         <Route
//           path={FOCUS_ROUTE}
//           element={(
//             <FocusLayout>
//               <FocusLandingPage />
//             </FocusLayout>
//           )}
//         />
//         <Route path={FOCUS_ALIAS_ROUTE} element={<Navigate to={FOCUS_ROUTE} replace />} />
//       </Routes>
//     )
//   }

//   return <ProtectedAppRouter />
// }
function AppRouter() {
  const location = useLocation()
  const user = useAppSelector(selectCurrentUser)

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
