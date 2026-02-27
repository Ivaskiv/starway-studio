// /features/dashboard/blocks/admin/FunnelsOverview.tsx
import { Workflow } from 'lucide-react';
import { useGetFunnelsQuery } from '../../../funnels/services/funnels.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { GlassCard } from '../../ui';

export default function FunnelsOverview() {
  const { user } = useAuth();
  const { data = [] } = useGetFunnelsQuery({
    includeAll: Boolean(user?.isSuperAdmin),
  });

  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-4 flex gap-2">
        <Workflow /> Воронки
      </h2>

      <ul className="space-y-2">
        {data.map(f => (
          <li key={f.id} className="text-white/70">
            {f.name} — {f.status}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
