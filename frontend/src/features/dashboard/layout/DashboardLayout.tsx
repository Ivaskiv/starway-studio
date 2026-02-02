// /features/dashboard/layout/DashboardLayout.tsx

import { useAbility } from '@/features/auth/hooks/useAbility';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Sidebar from '@/features/dashboard/layout/Sidebar';
import { ABILITIES } from '@/shared/types/permissions';
import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * DashboardLayout - обгортка для всього dashboard
 * - Показує sidebar
 * - Перевіряє авторизацію
 * - Рендерить child routes через <Outlet />
 */
export default function DashboardLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const can = useAbility();

  // Завантаження
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  // Не залогінений
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // Немає базового доступу до dashboard
  if (!can(ABILITIES.DASHBOARD_VIEW)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
