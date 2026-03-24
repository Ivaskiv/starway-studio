// frontend/src/App.tsx

import { ROUTES } from '@/config/routes';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import { AuthRestoreProvider, type AuthRestoreStatus } from '@/features/auth/context/AuthRestoreContext';
import { clearAuth, selectIsAuthenticated, setCredentials } from '@/features/auth/services/auth.slice';
import { hasSessionHint } from '@/features/auth/services/token';
import type { AccessKey } from '@/features/auth/types/auth.types';
import { settingsApi } from '@/features/settings/services/settings.api';
import type { User } from '@/features/user/types/user.types';
import LoadingFallback from '@/features/user/userMenu/LoadingFallback';
import MainLayout from '@/layout/MainLayout';
import { useThemeContext } from '@/theme/ThemeProvider';
import { DEFAULT_ACCENT, normalizeUiMode } from '@/theme/accent.utils';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

const HomePage = lazy(() => import('@/pages/HomePage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const TelegramSuccessPage = lazy(() => import('@/pages/auth/TelegramSuccessPage'));
const StartFlowPage = lazy(() => import('@/pages/onboarding/StartFlowPage'));
const ContinueFlowPage = lazy(() => import('@/pages/onboarding/ContinueFlowPage'));
const Dashboard = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const Settings = lazy(() => import('@/features/settings/pages/SettingsPage'));
const Wheel = lazy(() => import('@/features/wheel/pages/WheelPage'));
const WheelStart = lazy(() => import('@/features/wheel/pages/WheelStartPage'));
const Progress = lazy(() => import('@/features/progress/pages/ProgressPage'));
const DailyCycle = lazy(() => import('@/features/daily-cycle/pages/DailyCyclePage'));
const Vision = lazy(() => import('@/features/vision/pages/VisionPage'));
const Goals = lazy(() => import('@/features/goals/pages/GoalsPage'));
const TrialMirror = lazy(() => import('@/features/goals/pages/TrialMirrorPage'));
const WeeklyMirror = lazy(() => import('@/features/goals/pages/WeeklyMirrorPage'));
const Actions = lazy(() => import('@/features/actions/pages/ActionsPage'));
const Courses = lazy(() => import('@/features/mini-courses/pages/CoursesPage'));
const ProductInfo = lazy(() => import('@/features/mini-courses/pages/ProductInfoPage'));
const Subscription = lazy(() => import('@/features/subscription/pages/SubscriptionPage'));
const AIMentor = lazy(() => import('@/features/ai-mentor/pages/AIMentorPage'));
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
const MiniAppPage = lazy(() => import('@/features/social/pages/MiniAppPage'));

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
  { path: '/dashboard/wheel', element: <Wheel />, ability: 'wheel.view' },
  { path: '/dashboard/cycle', element: <DailyCycle />, ability: 'dashboard.view' },
  { path: '/dashboard/progress', element: <Progress />, ability: 'progress.view' },
  { path: '/dashboard/vision', element: <Vision />, ability: 'mentor.vision', showDeniedScreen: true },
  { path: '/dashboard/goals', element: <Goals />, ability: 'mentor.goals', showDeniedScreen: true },
  { path: '/dashboard/goals/trial-mirror', element: <TrialMirror />, ability: 'mentor.goals', showDeniedScreen: true },
  { path: '/dashboard/goals/weekly-mirror', element: <WeeklyMirror />, ability: 'mentor.goals', showDeniedScreen: true },
  { path: '/dashboard/actions', element: <Actions />, ability: 'mentor.actions', showDeniedScreen: true },
  { path: '/dashboard/courses', element: <Courses />, ability: 'dashboard.view' },
  { path: '/dashboard/ai-mentor', element: <AIMentor />, ability: 'mentor.core' },
  { path: '/dashboard/admin/transfer-ownership', element: <TransferOwnership />, ability: 'dashboard.view' },
  { path: '/dashboard/sessions', element: <SessionsPage />, ability: 'dashboard.view' },
  { path: '/dashboard/products', element: <Products />, ability: 'dashboard.view' },
  { path: '/dashboard/product-create', element: <ProductCreation />, ability: 'dashboard.view' },
  { path: '/dashboard/profile', element: <Profile />, ability: 'profile.view' },
  { path: '/dashboard/settings', element: <Settings />, ability: 'settings.manage' },
  { path: '/dashboard/subscription', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/zoom', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/consultation', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/mentorship', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/mentor/landing', element: <MentorLanding />, ability: 'mentor.core' },
  { path: '/dashboard/mentor/setup', element: <MentorSetup />, ability: 'mentor.core' },
  { path: '/dashboard/mentor/workspace', element: <AIMentor />, ability: 'mentor.core' },
];

interface AuthRestoreProps {
  children: ReactNode;
  onStatusChange?: (status: AuthRestoreStatus) => void;
}

const BAD_COLORS = new Set([
  '#ff6b00', '#FF6B00',
  '#ea580c', '#f97316', '#d97706',
  '#0a2446', '#0d1b3e',
])

function safeAccent(color?: string): string {
  return (!color || BAD_COLORS.has(color)) ? DEFAULT_ACCENT : color
}

function deriveThemeSettings(user: User) {
  const settings = user.settings
  return {
    accentColor: safeAccent(settings?.accentColor ?? undefined),
    bgColor:     settings?.bgColor || undefined,
    theme:       normalizeUiMode(settings?.theme),
  }
}

function AuthRestore({ children, onStatusChange }: AuthRestoreProps) {
  const dispatch = useDispatch();
  const [status, setStatus] = useState<AuthRestoreStatus>('idle');
  const theme = useThemeContext()

  const applyUserTheme = useCallback((user: User) => {
    const { accentColor, theme: mode, bgColor } = deriveThemeSettings(user)
    theme.setAccent(accentColor)
    if (mode) theme.setMode(mode)
    theme.setBgColor(bgColor)
  }, [theme])

  useEffect(() => {
    let cancelled = false;

    const updateStatus = (next: AuthRestoreStatus) => {
      if (cancelled) return;
      setStatus(next);
      onStatusChange?.(next);
    };

    const markFailed = () => {
      dispatch(clearAuth());
      updateStatus('failed');
    };

    const markReady = () => {
      updateStatus('ready');
    };

    const initAuth = async () => {
      updateStatus('restoring');
      const hasRestoreHint = hasSessionHint()

      const restoreWithAccessToken = async () => {
        const existingToken = localStorage.getItem('starway_access_token')
        if (!existingToken) {
          markFailed()
          return
        }

        try {
          const meRes = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              Authorization: `Bearer ${existingToken}`,
            },
          })

          if (cancelled) return

          if (!meRes.ok) {
            markFailed()
            return
          }

          const meData = await meRes.json()
          const restoredUser = (meData.user ?? null) as User | null

          if (!restoredUser) {
            markFailed()
            return
          }

          dispatch(setCredentials({ user: restoredUser, accessToken: existingToken }))
          applyUserTheme(restoredUser)
          markReady()
        } catch (error) {
          console.error('[AuthRestore] Failed to restore auth from access token:', error)
          markFailed()
        }
      }

      const existingToken = localStorage.getItem('starway_access_token')
      if (!existingToken && !hasRestoreHint) {
        markFailed()
        return
      }

      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
        });

        if (cancelled) return;

        if (!refreshRes.ok) {
          await restoreWithAccessToken();
          return;
        }

        const refreshData = await refreshRes.json();
        const newToken = refreshData.accessToken;
        const newUser  = (refreshData.user ?? null) as User | null;

        if (!newToken || !newUser) {
          await restoreWithAccessToken();
          return;
        }

        dispatch(setCredentials({ user: newUser, accessToken: newToken }));
        applyUserTheme(newUser);
        localStorage.setItem('starway_access_token', newToken);
        markReady();
      } catch (error) {
        console.error('[AuthRestore] Failed to restore auth:', error);
        await restoreWithAccessToken();
      }
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, [dispatch, onStatusChange, applyUserTheme]);

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
  const [authRestoreStatus, setAuthRestoreStatus] = useState<AuthRestoreStatus>('idle');
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const dashboardRoutes = useMemo(
    () => DASHBOARD_ROUTES.map((route) => (
      <Route key={route.path} path={route.path} element={withGuard(route)} />
    )),
    [devMode],
  );

  useEffect(() => {
    if (isAuthenticated && authRestoreStatus !== 'ready') {
      setAuthRestoreStatus('ready');
    }
  }, [authRestoreStatus, isAuthenticated]);

  return (
    <BrowserRouter>
      <AuthRestoreProvider value={authRestoreStatus}>
        <AuthRestore onStatusChange={setAuthRestoreStatus}>
          <Toaster position="top-right" />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
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

            {/* GlobalAssistant рендериться через createPortal в document.body — тимчасово вимкнено */}
            {/* <GlobalAssistant /> */}
          </Suspense>
        </AuthRestore>
      </AuthRestoreProvider>
    </BrowserRouter>
  );
}
