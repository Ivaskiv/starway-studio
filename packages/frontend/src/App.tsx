// packages/frontend/src/App.tsx

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@frontend/store/hooks';
import { selectIsLoggedIn, selectUser, selectIsRefreshing } from '@frontend/store/auth/authSelectors';
import { refreshUser } from '@frontend/store/auth/authOperations';
import DashboardLayout from '@frontend/components/layout/DashboardLayout';
import Header from '@frontend/components/layout/Header';
import Footer from '@frontend/components/layout/Footer';
import { Toaster } from 'react-hot-toast';
import { AIGeneratorProvider } from './pages/dashboard/AIGeneratorProvider';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy loaded pages
const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/user/AuthPage'));
const DashboardAdmin = lazy(() => import('./pages/admin/DashboardAdmin'));
const FunnelsPage = lazy(() => import('./pages/funnels/FunnelsPage'));
const FunnelCreatePage = lazy(() => import('./pages/funnels/FunnelCreatePage'));
const FunnelEditPage = lazy(() => import('./pages/funnels/FunnelEditPage'));
const AIGeneratorPage = lazy(() => import('./pages/dashboard/AIGeneratorPage'));
const Analytics = lazy(() => import('./pages/dashboard/Analytics'));
const Products = lazy(() => import('./pages/dashboard/Products'));
const Users = lazy(() => import('./pages/dashboard/Users'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-slate-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
  </div>
);

function App() {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const user = useAppSelector(selectUser);
  const isRefreshing = useAppSelector(selectIsRefreshing);

  // Refresh user on mount
  useEffect(() => {
    const token = localStorage.getItem('starway_auth_token');
    if (token && !user) {
      console.log('🔄 [App] Refreshing user on mount...');
      dispatch(refreshUser());
    }
  }, [dispatch, user]);

  if (isRefreshing) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <AIGeneratorProvider> 
          <ThemeProvider>
        <Routes>
          {/* Public Routes З Header та Footer */}
          <Route path="/" element={
            <>
              <Header />
              <HomePage />
              <Footer />
            </>
          } />
          
          <Route path="/auth" element={
            <>
              <Header />
              <AuthPage />
            </>
          } />

          {/* Protected Dashboard Routes (Header вже всередині DashboardLayout) */}
          <Route
            path="/dashboard"
            element={isLoggedIn ? <DashboardLayout /> : <Navigate to="/auth" replace />}
          >
            <Route index element={<DashboardAdmin />} />
            <Route path="funnels" element={<FunnelsPage />} />
            <Route path="funnels/new" element={<FunnelCreatePage />} />
            <Route path="funnels/:id/edit" element={<FunnelEditPage />} />
            <Route path="ai-generator" element={<AIGeneratorPage />} />
            <Route path="products" element={<Products />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </ThemeProvider>
        </AIGeneratorProvider>
      </Suspense>

      {/* Toast Notifications - ПОВНА ВЕРСІЯ */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options
          className: '',
          duration: 4000,
          style: {
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(20px)',
            color: '#fff',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
          },

          // Success
          success: {
            duration: 3000,
            style: {
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            },
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },

          // Error
          error: {
            duration: 5000,
            style: {
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },

          // Loading
          loading: {
            style: {
              background: 'rgba(251, 146, 60, 0.1)',
              border: '1px solid rgba(251, 146, 60, 0.3)',
            },
            iconTheme: {
              primary: '#fb923c',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;