// frontend/src/features/dashboard/blocks/user/UsersOverview.tsx
import { useGetDashboardStatsQuery } from '../../../../services/stats.api';
import { GlassCard } from '../../ui';

export default function UsersOverview() {
  const { data } = useGetDashboardStatsQuery({ period: '30d' });

  if (!data) return null;

  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-2">Користувачі</h2>
      <p className="text-white/60">Активні: {data.total_users}</p>
    </GlassCard>
  );
}
