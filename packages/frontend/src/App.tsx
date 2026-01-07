// packages/frontend/src/App.tsx

import { Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/ui';
import { Loader } from 'lucide-react';

// Layouts
import PublicLayout from '@/components/layout/PublicLayout';
import DashboardLayout from '@/pages/dashboard/DashboardLayout';

// Components
import TelegramMenu from '@/components/layout/TelegramMenu';

// Lazy loaded pages
import {
  HomePage,
  AuthPage,
  DashboardPage,
  FunnelsPage,
  FunnelEditPage,
  AIGeneratorPage,
  ProductsPage,
  AnalyticsPage,
  UsersPage,
  SettingsPage,
} from './pages/pages.lazy';
import ProtectedRoute from '@/app/routes/ProtectedRoute';

const LoadingFallback = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <GlassCard className="p-12 flex flex-col items-center gap-4" data-blur="xl">
      <Loader className="w-12 h-12 animate-spin text-orange-500" />
      <p className="text-white/60">Завантаження...</p>
    </GlassCard>
  </div>
);

function AppRoutes() {
  const { authStatus } = useAuth();
  const [telegramMenuOpen, setTelegramMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/auth"
              element={
                authStatus === 'authenticated' ? (
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
            <Route index element={<DashboardPage />} />
            <Route path="funnels" element={<FunnelsPage />} />
            <Route path="funnels/:id/edit" element={<FunnelEditPage />} />
            <Route path="ai-generator" element={<AIGeneratorPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
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
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;