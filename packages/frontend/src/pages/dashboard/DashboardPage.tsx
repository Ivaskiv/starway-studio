// packages/frontend/src/pages/dashboard/DashboardPage.tsx
import DashboardAdmin from '@/pages/dashboard/DashboardAdmin';
import DashboardUser from '@/pages/dashboard/DashboardUser';
import { useGetMeQuery } from '@/services/auth.api';
import { GlassCard } from '@/ui';
import { Loader } from 'lucide-react';

export default function DashboardPage() {
  const { data: userData, isLoading } = useGetMeQuery();
  const user = userData?.user;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <GlassCard className="p-12 flex flex-col items-center gap-4" data-blur="xl">
          <Loader className="w-12 h-12 animate-spin text-orange-500" />
          <p className="text-white/60">Завантаження...</p>
        </GlassCard>
      </div>
    );
  }

  // Показуємо різний dashboard залежно від ролі
  if (user?.role === 'super_admin' || user?.role === 'funnel_admin') {
    return <DashboardAdmin />;
  }

  return <DashboardUser />;
}