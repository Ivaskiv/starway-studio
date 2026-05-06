// frontend/src/App.tsx

import { ROUTES } from '@/config/routes';
import GlobalAssistant from '@/features/assistant/components/GlobalAssistant';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import { AuthRestoreProvider, type AuthRestoreStatus } from '@/features/auth/context/AuthRestoreContext';
import { useAuthSessionSync } from '@/features/auth/hooks/useAuthSessionSync';
import type { AccessKey } from '@/features/auth/types/auth.types';
import { syncAuthSession } from '@/features/auth/utils/sessionSync';
import { FOCUS_ALIAS_ROUTE, FOCUS_ROUTE } from '@/features/landings/focus/utils/constants';
import LoadingFallback from '@/features/user/userMenu/LoadingFallback';
import MainLayout from '@/layout/MainLayout';
import { useThemeContext } from '@/theme/ThemeProvider';
import { Suspense, lazy, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

const HomePage = lazy(() => import('@/pages/HomePage'));
// const FocusLayout = lazy(() => import('@/app/(public)/focus/layout'));
// const FocusLandingPage = lazy(() => import('@/app/(public)/focus/page'));
const FocusLayout = lazy(() => import('@/features/landings/focus/pages/FocusLayout'))
const FocusLandingPage = lazy(() => import('@/features/landings/focus/pages/FocusLandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const TelegramSuccessPage = lazy(() => import('@/pages/auth/TelegramSuccessPage'));
const StartFlowPage = lazy(() => import('@/pages/onboarding/StartFlowPage'));
const ContinueFlowPage = lazy(() => import('@/pages/onboarding/ContinueFlowPage'));
const Dashboard = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const Settings = lazy(() => import('@/features/settings/pages/SettingsPage'));
const TelegramPage = lazy(() => import('@/features/telegram/pages/TelegramPage'));
const Wheel = lazy(() => import('@/features/wheel/pages/WheelPage'));
const WheelStart = lazy(() => import('@/features/wheel/pages/WheelStartPage'));
const DailyCycle = lazy(() => import('@/features/daily-cycle/pages/DailyCyclePage'));
const Journal = lazy(() => import('@/features/journal/JournalPage'));
const Vision = lazy(() => import('@/features/vision/pages/VisionPage'));
const Goals = lazy(() => import('@/features/goals/pages/GoalsPage'));
const TrialMirror = lazy(() => import('@/features/goals/pages/TrialMirrorPage'));
const WeeklyMirror = lazy(() => import('@/features/goals/pages/WeeklyMirrorPage'));
const Actions = lazy(() => import('@/features/actions/pages/ActionsPage'));
const Courses = lazy(() => import('@/features/mini-courses/pages/CoursesPage'));
const ProductInfo = lazy(() => import('@/features/mini-courses/pages/ProductInfoPage'));
const Subscription = lazy(() => import('@/features/subscription/pages/SubscriptionPage'));
const AiMentorDashboard = lazy(() => import('@/features/daily-cycle/pages/AiMentorDashboardPage'));
const Products = lazy(() => import('@/features/products/pages/ProductsPage'));
const ProductCreation = lazy(() => import('@/features/products/pages/ProductCreationPage'));
const Profile = lazy(() => import('@/features/user/pages/UserProfilePage'));
const InfoPage = lazy(() => import('@/pages/InfoPage'));
const MentorLanding = lazy(() => import('@/features/ai-mentor/pages/MentorLanding'));
const MentorSetup = lazy(() => import('@/features/ai-mentor/pages/MentorSetup'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const SessionsPage = lazy(() => import('@/features/zoom/pages/SessionsPage'));
const DevRoutes = lazy(() => import('@/pages/dev/DevRoutes'));
const TransferOwnership = lazy(() => import('@/features/admin/pages/TransferOwnershipPage'));
const MasterPanel = lazy(() => import('@/features/admin/pages/MasterPanelPage'));
const AdminAnalytics = lazy(() => import('@/features/analytics/pages/AdminAnalytics'));
const MiniAppPage = lazy(() => import('@/features/social/pages/MiniAppPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/Notifications'));

type RouteConfig = {
  path: string;
  element: ReactElement;
  ability?: AccessKey;
  showDeniedScreen?: boolean;
};

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
] as const;

const DASHBOARD_ROUTES: RouteConfig[] = [
  { path: '/dashboard', element: <Dashboard />, ability: 'dashboard.view' },
  { path: '/dashboard/ai-mentor', element: <AiMentorDashboard />, ability: 'dashboard.view' },
  { path: '/dashboard/cycle', element: <AiMentorDashboard />, ability: 'dashboard.view' },
  { path: '/dashboard/wheel', element: <Wheel />, ability: 'dashboard.view' },
  { path: '/dashboard/journal', element: <Journal />, ability: 'dashboard.view' },
  { path: '/dashboard/calendar', element: <AiMentorDashboard />, ability: 'dashboard.view' },
  { path: '/dashboard/microtasks', element: <AiMentorDashboard />, ability: 'dashboard.view' },
  { path: '/dashboard/tasks', element: <AiMentorDashboard />, ability: 'dashboard.view' },
  { path: '/dashboard/progress', element: <Navigate to="/dashboard/journal" replace />, ability: 'progress.view' },
  { path: '/dashboard/vision', element: <Vision />, ability: 'dashboard.view', showDeniedScreen: true },
  { path: '/dashboard/goals', element: <Goals />, ability: 'dashboard.view' },
  { path: '/dashboard/goals/trial-mirror', element: <TrialMirror />, ability: 'dashboard.view' },
  { path: '/dashboard/goals/weekly-mirror', element: <WeeklyMirror />, ability: 'dashboard.view' },
  { path: '/dashboard/actions', element: <Actions />, ability: 'mentor.actions', showDeniedScreen: true },
  { path: '/dashboard/courses', element: <Courses />, ability: 'dashboard.view' },
  { path: '/dashboard/ai-seo', element: <Navigate to="/dashboard?section=ai-seo" replace />, ability: 'products.manage' },
  { path: '/dashboard/ads', element: <Navigate to="/dashboard?section=content" replace />, ability: 'products.manage' },
  { path: '/dashboard/leadmagnet', element: <Navigate to="/dashboard?section=leadmagnet" replace />, ability: 'funnels.manage' },
  { path: '/dashboard/students', element: <Navigate to="/dashboard?section=students" replace />, ability: 'admin.clients.view' },
  { path: '/dashboard/admin/users', element: <Navigate to="/dashboard/students" replace />, ability: 'admin.clients.view' },
  { path: '/dashboard/admin/revenue', element: <AdminAnalytics />, ability: 'admin.revenue.view' },
  { path: '/dashboard/admin/studio', element: <MasterPanel />, ability: 'products.manage', showDeniedScreen: true },
  { path: '/dashboard/admin/roles', element: <Navigate to="/dashboard/admin/transfer-ownership" replace />, ability: 'admin.roles.manage' },
  { path: '/dashboard/admin/transfer-ownership', element: <TransferOwnership />, ability: 'admin.roles.manage' },
  { path: '/dashboard/sessions', element: <SessionsPage />, ability: 'dashboard.view' },
  { path: '/dashboard/products', element: <Products />, ability: 'dashboard.view' },
  { path: '/dashboard/product-create', element: <ProductCreation />, ability: 'dashboard.view' },
  { path: '/dashboard/profile', element: <Profile />, ability: 'profile.view' },
  { path: '/dashboard/settings', element: <Settings />, ability: 'settings.manage' },
  { path: '/dashboard/notifications', element: <NotificationsPage />, ability: 'dashboard.view' },
  { path: '/dashboard/telegram', element: <TelegramPage />, ability: 'dashboard.view' },
  { path: '/dashboard/subscription', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/zoom', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/consultation', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/mentorship', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/mentor/landing', element: <MentorLanding />, ability: 'mentor.core' },
  { path: '/dashboard/mentor/setup', element: <MentorSetup />, ability: 'mentor.core' },
  { path: '/dashboard/mentor/workspace', element: <AiMentorDashboard />, ability: 'mentor.core' },
];

interface AuthRestoreProps {
  children: ReactNode;
  onStatusChange?: (status: AuthRestoreStatus) => void;
}

function AuthRestore({ children, onStatusChange }: AuthRestoreProps) {
  const dispatch = useDispatch();
  const [status, setStatus] = useState<AuthRestoreStatus>('idle');
  const { setAccent, setMode, setBgColor } = useThemeContext()
  const theme = useMemo(
    () => ({
      setAccent,
      setMode,
      setBgColor,
    }),
    [setAccent, setMode, setBgColor],
  )

  useEffect(() => {
    let cancelled = false;

    const updateStatus = (next: AuthRestoreStatus) => {
      if (cancelled) return;
      if (import.meta.env.DEV) {
        console.info('[AuthRestore] status ->', next)
      }
      setStatus(next);
      onStatusChange?.(next);
    };

    const initAuth = async () => {
      updateStatus('restoring');

      try {
        if (cancelled) return;

        const restored = await syncAuthSession({
          allowRefreshWithoutHint: true,
          dispatch,
          theme,
        })

        if (cancelled) return
        if (import.meta.env.DEV) {
          console.info('[AuthRestore] restore finished', { restored })
        }
        updateStatus(restored ? 'ready' : 'failed')
      } catch (error) {
        console.error('[AuthRestore] Failed to restore auth:', error);
        updateStatus('failed')
      }
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, [dispatch, onStatusChange, theme]);

  if (status === 'idle' || status === 'restoring') {
    return <LoadingFallback />;
  }
  return <>{children}</>;
}

const devMode = import.meta.env.VITE_AUTH_BYPASS === 'true';

function withGuard(route: RouteConfig): ReactElement {
  if (devMode || !route.ability) return route.element;
  return (
    <ProtectedRoute ability={route.ability} showDeniedScreen={route.showDeniedScreen}>
      {route.element}
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <AppRouter />
      </Suspense>
    </BrowserRouter>
  );
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

  const isFocusRoute =
    location.pathname === FOCUS_ROUTE ||
    location.pathname === FOCUS_ALIAS_ROUTE

  // ================================
  // 🟢 PUBLIC MVP LANDING (FOCUS)
  // ================================
  if (isFocusRoute) {
    return (
      <Routes>
        {/* 🟢 основний лендінг */}
        <Route
          path={FOCUS_ROUTE}
          element={
            <FocusLayout>
              <FocusLandingPage />
            </FocusLayout>
          }
        />

        {/* 🔁 alias → /focus */}
        <Route
          path={FOCUS_ALIAS_ROUTE}
          element={<Navigate to={FOCUS_ROUTE} replace />}
        />

        {/* 🧠 fallback (щоб нічого не ламалось) */}
        <Route path="*" element={<Navigate to={FOCUS_ROUTE} replace />} />
      </Routes>
    )
  }

  // ================================
  // 🔒 MAIN APP (БЕЗ ЗМІН)
  // ================================
  return <ProtectedAppRouter />



  // ================================
  // ❌ СТАРИЙ ВАРІАНТ (НЕ ВИДАЛЯЄМО)
  // ================================
  /*
  if (isFocusRoute) {
    return (
      <Routes>
        <Route
          path={FOCUS_ROUTE}
          element={(
            <FocusLayout>
              <FocusLandingPage />
            </FocusLayout>
          )}
        />
        <Route path={FOCUS_ALIAS_ROUTE} element={<Navigate to={FOCUS_ROUTE} replace />} />
      </Routes>
    )
  }

  return <ProtectedAppRouter />
  */
}
function ProtectedAppRouter() {
  const [authRestoreStatus, setAuthRestoreStatus] = useState<AuthRestoreStatus>('idle');

  useAuthSessionSync(authRestoreStatus === 'ready')

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.info('[App] authRestoreStatus', authRestoreStatus)
  }, [authRestoreStatus])

  const dashboardRoutes = useMemo(
    () => DASHBOARD_ROUTES.map((route) => (
      <Route key={route.path} path={route.path} element={withGuard(route)} />
    )),
    [devMode],
  );

  return (
    <AuthRestoreProvider value={authRestoreStatus}>
      <AuthRestore onStatusChange={setAuthRestoreStatus}>
        <Routes>
          <Route element={<MainLayout />}>
            {/* <Route path="/" element={<HomePage />} /> */}
            <Route path="/" element={<Navigate to={FOCUS_ROUTE} replace />} />
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.TELEGRAM_SUCCESS} element={<TelegramSuccessPage />} />
            <Route path={ROUTES.ONBOARDING_START} element={<StartFlowPage />} />
            <Route path={ROUTES.ONBOARDING_CONTINUE} element={<ContinueFlowPage />} />
            <Route path={ROUTES.WHEEL_START} element={<WheelStart />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
            <Route path={ROUTES.DEV_ROUTES} element={<DevRoutes />} />
            <Route path="/products/:slug" element={<ProductInfo />} />
            <Route path="/miniapp" element={<Suspense fallback={null}><MiniAppPage /></Suspense>} />
            <Route path="/miniapp/*" element={<Suspense fallback={null}><MiniAppPage /></Suspense>} />
            {PUBLIC_INFO_ROUTES.map((path) => (
              <Route key={path} path={path} element={<InfoPage />} />
            ))}
          </Route>

          <Route element={<MainLayout dashboard />}>
            {dashboardRoutes}
          </Route>

          <Route path="/subscription" element={<Navigate to="/dashboard/subscription" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <GlobalAssistant />
      </AuthRestore>
    </AuthRestoreProvider>
  );
}
