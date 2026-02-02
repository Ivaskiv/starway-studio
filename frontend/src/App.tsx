// frontend/src/App.tsx

import { Loader } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import RedirectAfterAuth from '@/features/auth/components/RedirectAfterAuth';
import { AbilityGuard } from '@/features/auth/components/AbilityGuard';
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout';
import MainLayout from '@/layout/MainLayout';
import { GlassCard } from '@/ui';
import AIMentorPage from '@/features/auth/pages/AuthPage';
import { ABILITIES } from '@/features/auth/permissions/abilities';

// === PUBLIC PAGES ===
const HomePage = lazy(() => import('@/features/home/HomePage'));
const OAuthCallbackPage = lazy(() => import('@/features/social/pages/OAuthCallbackPage'));

// === DASHBOARD PAGES ===
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
// const CoursesPage = lazy(() => import('@/features/courses/pages/CoursesPage'));
const UserProfilePage = lazy(() => import('@/features/auth/pages/UserProfilePage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const ProgressPage = lazy(() => import('@/features/progress/pages/ProgressPage'));
const WheelPage = lazy(() => import('@/features/wheel/pages/WheelPage'));
// const AIMentorPage = lazy(() => import('@/templatesfeatures/ai-mentor/pages/AIMentorPage'));
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage'));
// const FunnelsPage = lazy(() => import('@/features/funnels/pages/FunnelsPage'));
// const FunnelEditPage = lazy(() => import('@/features/funnels/pages/FunnelEditPage'));
const AIGeneratorPage = lazy(() => import('@/features/ai-generator/pages/AIGeneratorPage'));

// ===============================
// 🔄 LOADING FALLBACK
// ===============================
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <GlassCard className="p-10 flex flex-col items-center gap-4">
        <Loader className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-white/60">Завантаження…</p>
      </GlassCard>
    </div>
  );
}

// ===============================
// 🔀 ROUTES
// ===============================
function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="auth/callback/:provider" element={<OAuthCallbackPage />} />
          <Route path="redirect" element={<RedirectAfterAuth />} />
        </Route>

        {/* DASHBOARD */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />

          {/* <Route element={<AbilityGuard allow={ABILITIES.DASHBOARD_VIEW} />}>
            <Route path="courses" element={<CoursesPage />} />
          </Route> */}

          <Route element={<AbilityGuard allow={ABILITIES.PROFILE_VIEW} />}>
            <Route path="profile" element={<UserProfilePage />} />
          </Route>

          <Route element={<AbilityGuard allow={ABILITIES.PROGRESS_VIEW} />}>
            <Route path="progress" element={<ProgressPage />} />
          </Route>

          <Route element={<AbilityGuard allow={ABILITIES.WHEEL_VIEW} />}>
            <Route path="wheel" element={<WheelPage />} />
          </Route>

          <Route element={<AbilityGuard allow={ABILITIES.AI_USE} />}>
            <Route path="ai-mentor" element={<AIMentorPage />} />
            <Route path="ai-generator" element={<AIGeneratorPage />} />
          </Route>

          <Route element={<AbilityGuard allow={ABILITIES.PRODUCTS_MANAGE} />}>
            <Route path="products" element={<ProductsPage />} />
          </Route>

          {/* <Route element={<AbilityGuard allow={ABILITIES.FUNNELS_MANAGE} />}>
            <Route path="funnels" element={<FunnelsPage />} />
            <Route path="funnels/:id" element={<FunnelEditPage />} />
          </Route>
 */}
          <Route element={<AbilityGuard allow={ABILITIES.SETTINGS_MANAGE} />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// ===============================
// 🔝 MAIN APP
// ===============================
export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e1e2f',
            color: '#fff',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}
