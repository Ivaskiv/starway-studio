// /features/dashboard/blocks/admin/AdminStats.tsx
import { useGetDashboardStatsQuery } from '@/services/stats.api';
import { DollarSign, Users, Zap } from 'lucide-react';
import { GlassCard } from '../../ui';

export default function AdminStats() {
  const { data } = useGetDashboardStatsQuery({ period: '30d' });

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <GlassCard className="p-6">
        <Zap className="text-orange-400 mb-2" />
        <p className="text-white text-2xl">{data.total_funnels}</p>
        <p className="text-white/40">Воронок</p>
      </GlassCard>

      <GlassCard className="p-6">
        <Users className="text-blue-400 mb-2" />
        <p className="text-white text-2xl">{data.total_users}</p>
        <p className="text-white/40">Користувачів</p>
      </GlassCard>

      <GlassCard className="p-6">
        <DollarSign className="text-green-400 mb-2" />
        <p className="text-white text-2xl">₴{data.total_revenue}</p>
        <p className="text-white/40">Дохід</p>
      </GlassCard>
    </div>
  );
}
