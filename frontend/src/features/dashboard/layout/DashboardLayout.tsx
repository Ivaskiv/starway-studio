// frontend/src/features/dashboard/layout/DashboardLayout.tsx
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { getToken } from '@/features/auth/services/token';
import Breadcrumbs from '@/layout/Breadcrumbs';
import Footer from '@/layout/Footer';
import Header from '@/layout/Header';
import Sidebar from '@/layout/Sidebar';

export default function DashboardLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasToken = !!getToken();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('starway_sidebar_collapsed');
    setIsSidebarCollapsed(stored === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem('starway_sidebar_collapsed', isSidebarCollapsed ? '1' : '0');
  }, [isSidebarCollapsed]);

  // ✅ LOADING - показуємо loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  // ✅ КРИТИЧНО: якщо є токен але немає user - дати час на restore
  if (hasToken && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  // ❌ НЕМАЄ ТОКЕНА - redirect
  if (!hasToken || (!isAuthenticated && !user)) {
    return <Navigate to="/" replace />;
  }

  // ✅ ВСЕ ОК - показуємо dashboard
  return (
    // fix code_x: keep header/footer full-width across the whole app; sidebar only inside middle content area.
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Header />
      <div className="flex-1 flex pt-16 min-h-0">
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
