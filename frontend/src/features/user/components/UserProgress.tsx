// frontend/src/features/dashboard/blocks/user/UserProgress.tsx
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGetProgressQuery } from '@/features/progress/services/progress.api';
import { GlassCard } from '@/ui';
import { Award, TrendingUp } from 'lucide-react';

export default function UserProgress() {
  const { user } = useAuth();

  if (!user) return null;

  const { data } = useGetProgressQuery(user.id, { skip: !user.id });

  const level = data?.level ?? user.stats?.level ?? 1;
  const totalXp = data?.totalXp ?? user.stats?.totalPoints ?? 0;
  const nextLevelXp = data?.nextLevelXp ?? Math.max(100, level * 100);
  const progressPct = Math.min(100, Math.round((totalXp / nextLevelXp) * 100));

  // fix code_x: backend Progress has totalXp (not xp); keep UI resilient with fallbacks.
  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-white/85" />
        Прогрес {user.firstName || user.name || 'користувача'}
      </h2>

      <div className="space-y-2 text-sm">
        <p className="text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-white/85" />
          XP: {totalXp}
        </p>
        <p className="text-white/70">Рівень: {level}</p>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs text-white/50 mt-2">
          До наступного рівня: {Math.max(nextLevelXp - totalXp, 0)} XP
        </p>
      </div>
    </GlassCard>
  );
}
