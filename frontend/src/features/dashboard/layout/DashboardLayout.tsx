// /features/dashboard/layout/DashboardLayout.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAbility } from '@/features/auth/hooks/useAbility';
import { ABILITIES } from '@/features/auth/permissions/abilities';

export default function DashboardLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const can = useAbility();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (!can(ABILITIES.DASHBOARD_VIEW)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
