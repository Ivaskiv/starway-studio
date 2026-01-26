// frontend/src/App.tsx

import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { Toaster } from 'react-hot-toast'

import { GlassCard } from '@/ui'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import PublicLayout from '@/layout/PublicLayout'
import { AbilityGuard } from '@/features/dashboard/layout/AbilityGuard'
import { ABILITIES } from '@/shared/types/permissions'

const HomePage = lazy(() => import('@/features/home/HomePage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const UserProfilePage = lazy(() => import('@/features/auth/pages/UserProfilePage'))
const OAuthCallbackPage = lazy(() => import('@/features/auth/pages/OAuthCallbackPage'))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'))
const ProgressPage = lazy(() => import('@/features/progress/pages/ProgressPage'))
const WheelPage = lazy(() => import('@/features/wheel/pages/WheelPage'))
const AIMentorPage = lazy(() => import('@/templates/ai-mentor/pages/AIMentorPage'))
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage'))
const FunnelsPage = lazy(() => import('@/features/funnels/pages/FunnelsPage'))
const FunnelEditPage = lazy(() => import('@/features/funnels/pages/FunnelEditPage'))
const AIGeneratorPage = lazy(() => import('@/features/ai-generator/pages/AIGeneratorPage'))

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <GlassCard className="p-10 flex flex-col items-center gap-4">
        <Loader className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-white/60">Завантаження…</p>
      </GlassCard>
    </div>
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="auth/callback/:provider" element={<OAuthCallbackPage />} />
        </Route>

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />

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
          </Route>

          <Route element={<AbilityGuard allow={ABILITIES.PRODUCTS_MANAGE} />}>
            <Route path="products" element={<ProductsPage />} />
          </Route>

          <Route element={<AbilityGuard allow={ABILITIES.FUNNELS_MANAGE} />}>
            <Route path="funnels" element={<FunnelsPage />} />
            <Route path="funnels/:id" element={<FunnelEditPage />} />
          </Route>

          <Route element={<AbilityGuard allow={ABILITIES.SETTINGS_MANAGE} />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route element={<AbilityGuard allow={ABILITIES.AI_USE} />}>
            <Route path="ai-generator" element={<AIGeneratorPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
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
  )
}