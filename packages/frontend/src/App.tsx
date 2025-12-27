// packages/frontend/src/App.tsx

import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@frontend/store/store';
import { Toaster } from 'react-hot-toast';

import { refreshUser } from '@frontend/store/auth/authOperations';
import { selectIsLoggedIn, selectIsRefreshing } from '@frontend/store/auth/authSelectors';

import HomePage from '@frontend/pages/HomePage';
import AuthPage from '@frontend/pages/AuthPage';

const DashboardAdmin = lazy(() => import('@frontend/pages/admin/DashboardAdmin'));

function App() {
  const theme = useAppSelector((state) => state.ui?.theme);
  const token = useAppSelector((state) => state.auth.token);
  const isRefreshing = useAppSelector(selectIsRefreshing);
  const dispatch = useAppDispatch();

  // Auto-refresh user при наявності токена
  useEffect(() => {
    if (token) {
      dispatch(refreshUser());
    }
  }, [token, dispatch]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <>
      <Toaster position="top-right" />
      
      {isRefreshing ? (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-xl">Завантаження...</p>
          </div>
        </div>
      ) : (
        <Suspense fallback={<div>Loading...</div>}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/admin" element={<ProtectedRoute><DashboardAdmin /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </Suspense>
      )}
    </>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default App;