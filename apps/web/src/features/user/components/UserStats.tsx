//features/dashboard/blocks/user/UserStats.tsx

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api';
import { GlassCard } from '@/ui';
import { Activity, Flame, Target } from 'lucide-react';

interface UserStatsProps {
  userId?: string;
}

export default function UserStats({ userId }: UserStatsProps) {
  const { user } = useAuth();
  const id = userId || user?.id;
  const { data } = useGetSummaryQuery(undefined, { skip: !id });

  const streak = data?.streak.current ?? 0;
  const goals = user?.stats?.completedBlocks ?? 0;
  const sessions = user?.stats?.sessions ?? 0;

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-white">Статистика користувача</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/50 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-white/85" />
            Streak
          </p>
          <p className="text-lg font-semibold text-white mt-1">{streak}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/50 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-white/85" />
            Цілей
          </p>
          <p className="text-lg font-semibold text-white mt-1">{goals}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/50 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-white/85" />
            Сесій
          </p>
          <p className="text-lg font-semibold text-white mt-1">{sessions}</p>
        </div>
      </div>
    </GlassCard>
  );
}
