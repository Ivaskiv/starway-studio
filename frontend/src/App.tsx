// frontend/src/App.tsx

import LoadingFallback from '@/components/LoadingFallback';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import { restoreToken } from '@/features/auth/services/auth.slice';
import { getToken } from '@/features/auth/services/token';
import type { AccessKey } from '@/features/auth/types/auth.types';
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout';
import MainLayout from '@/layout/MainLayout';
import { applyAccentColor, loadAccentColor } from '@/shared/utils/accent.utils';
import { applyUiTheme, loadUiTheme } from '@/shared/utils/theme.utils';
import { Suspense, lazy, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

const HomePage = lazy(() => import('@/pages/HomePage'));
const Dashboard = lazy(() => import('@/pages/DashboardPage'));
const Settings = lazy(() => import('@/features/settings/pages/SettingsPage'));
const Wheel = lazy(() => import('@/features/wheel/pages/WheelPage'));
const Progress = lazy(() => import('@/features/progress/pages/ProgressPage'));
const DailyCycle = lazy(() => import('@/features/daily-cycle/pages/DailyCyclePage'));
const Vision = lazy(() => import('@/features/vision/pages/VisionPage'));
const Goals = lazy(() => import('@/features/goals/pages/GoalsPage'));
const TrialMirror = lazy(() => import('@/features/goals/pages/TrialMirrorPage'));
const WeeklyMirror = lazy(() => import('@/features/goals/pages/WeeklyMirrorPage'));
const Actions = lazy(() => import('@/features/actions/pages/ActionsPage'));
const Courses = lazy(() => import('@/features/mini-courses/pages/CoursesPage'));
const Subscription = lazy(() => import('@/features/subscription/pages/SubscriptionPage'));
const AIMentor = lazy(() => import('@/features/ai-mentor/pages/AIMentorPage'));
const AIGenerator = lazy(() => import('@/features/ai-generator/pages/AIGeneratorPage'));
const AIProducerConsole = lazy(() => import('@/features/ai-generator/pages/AIProducerConsolePage'));
const Products = lazy(() => import('@/features/products/pages/ProductsPage'));
const FunnelEditor = lazy(() => import('@/features/funnels/pages/FunnelEditorPage'));
const Profile = lazy(() => import('@/features/user/pages/UserProfilePage'));
const InfoPage = lazy(() => import('@/pages/InfoPage'));
const MentorLanding = lazy(() => import('@/features/ai-mentor/pages/MentorLanding'));
const MentorSetup = lazy(() => import('@/features/ai-mentor/pages/MentorSetup'));
const AIFunnelLanding = lazy(() => import('@/features/ai-funnel-landing/pages/AIFunnelLandingPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));

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
  { path: '/dashboard/courses', element: <Courses />, ability: 'products.manage', showDeniedScreen: true },
  { path: '/dashboard/ai-mentor', element: <AIMentor />, ability: 'mentor.core' },
  { path: '/dashboard/ai-generator', element: <AIGenerator />, ability: 'ai.basic' },
  // fix code_x: dedicated AI funnel entry opens same builder in funnel mode for clearer IA.
  { path: '/dashboard/ai-funnel', element: <AIGenerator />, ability: 'ai.basic' },
  { path: '/dashboard/ai-producer-console', element: <AIProducerConsole />, ability: 'ai.basic' },
  { path: '/dashboard/funnels/:id/edit', element: <FunnelEditor />, ability: 'dashboard.view' },
  // fix code_x: products page stays accessible for all authenticated users with locked premium cards and subscribe CTA.
  { path: '/dashboard/products', element: <Products />, ability: 'dashboard.view' },
  { path: '/dashboard/profile', element: <Profile />, ability: 'profile.view' },
  { path: '/dashboard/settings', element: <Settings />, ability: 'settings.manage' },
  { path: '/dashboard/subscription', element: <Subscription />, ability: 'dashboard.view' },
  // fix code_x: routes without dedicated pages are mapped to subscription info instead of dead links.
  { path: '/dashboard/zoom', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/consultation', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/mentorship', element: <Subscription />, ability: 'dashboard.view' },
  { path: '/dashboard/mentor/landing', element: <MentorLanding />, ability: 'mentor.core' },
  { path: '/dashboard/mentor/setup', element: <MentorSetup />, ability: 'mentor.core' },
  // fix code_x: remove duplicate lazy import target for the same page; keep single source AIMentor.
  { path: '/dashboard/mentor/workspace', element: <AIMentor />, ability: 'mentor.core' },
];

function AuthRestore({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    applyAccentColor(loadAccentColor());
    applyUiTheme(loadUiTheme());

    const token = getToken();
    if (token) dispatch(restoreToken(token));
    setReady(true);
  }, [dispatch]);

  if (!ready) return <LoadingFallback />;
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
      <AuthRestore>
        <Toaster position="top-right" />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/ai-funnel" element={<AIFunnelLanding />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              {PUBLIC_INFO_ROUTES.map((path) => (
                <Route key={path} path={path} element={<InfoPage />} />
              ))}
            </Route>

            <Route element={<DashboardLayout />}>
              {DASHBOARD_ROUTES.map((route) => (
                <Route key={route.path} path={route.path} element={withGuard(route)} />
              ))}
            </Route>

            <Route path="/subscription" element={<Navigate to="/dashboard/subscription" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthRestore>
    </BrowserRouter>
  );
}
