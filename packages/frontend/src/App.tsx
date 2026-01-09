// packages/frontend/src/App.tsx

import { useAuth } from '@/features/auth/hooks/useAuth'
import { GlassCard } from '@/ui'
import { Loader } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

// Layouts
import PublicLayout from '@/layout/PublicLayout'
import DashboardLayout from '@/layout/DashboardLayout'

// Components
import TelegramMenu from '@/layout/TelegramMenu'

// Route guards
import ProtectedRoute from '@/app/routes/ProtectedRoute'

// Lazy loaded pages
import {
  AIGeneratorPage,
  AIMentorPage,
  AnalyticsPage,
  AuthPage,
  CoursesPage,
  DashboardPage,
  FunnelEditPage,
  FunnelsPage,
  HomePage,
  ProductsPage,
  ProgressPage,
  SettingsPage,
  SubscriptionPage,
  UsersPage,
  WheelPage,
} from './pages/pages.lazy'

const LoadingFallback = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <GlassCard className="p-12 flex flex-col items-center gap-4">
      <Loader className="w-12 h-12 animate-spin text-orange-500" />
      <p className="text-white/60">Завантаження...</p>
    </GlassCard>
  </div>
)

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()
  const [telegramMenuOpen, setTelegramMenuOpen] = useState(false)

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/auth"
            element={
              isLoading ? (
                <LoadingFallback />
              ) : isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <AuthPage />
              )
            }
          />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Common routes */}
          <Route index element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
          
          {/* Admin routes */}
          <Route path="funnels" element={<FunnelsPage />} />
          <Route path="funnels/:id/edit" element={<FunnelEditPage />} />
          <Route path="ai-generator" element={<AIGeneratorPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="users" element={<UsersPage />} />
          
          {/* User routes */}
          <Route path="courses" element={<CoursesPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          
          {/* AI Mentor (для всіх) */}
          <Route path="ai-mentor" element={<AIMentorPage />} />
          <Route path="wheel" element={<WheelPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <TelegramMenu isOpen={telegramMenuOpen} onClose={() => setTelegramMenuOpen(false)} />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '1rem',
          },
        }}
      />
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}