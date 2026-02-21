import { useAppSelector } from '@/app/hooks';
import { useGetProgressQuery } from '@/features/progress/services/progress.api';
import { GlassCard } from '@/ui';
import { Activity, BarChart3, Target, TrendingUp } from 'lucide-react';

export default function ProgressPage() {
  const userId = useAppSelector((s) => s.auth.user?.id);
  const { data, isLoading, isError } = useGetProgressQuery(userId ?? '', { skip: !userId });

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Будь ласка, увійдіть</p>
      </div>
    );
  }

  const level = data?.level ?? 1;
  const totalPoints = data?.totalPoints ?? 0;
  const completedBlocks = data?.completedBlocks ?? 0;
  const goalPoints = Math.max(100, level * 100);
  const progress = Math.min(100, Math.round((totalPoints / goalPoints) * 100));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-[color:rgba(var(--accent-rgb),0.35)] bg-[color:rgba(var(--accent-rgb),0.22)]">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Прогрес</h1>
          <p className="text-white/60 text-sm">Ваші очки, рівень і динаміка</p>
        </div>
      </div>

      {isLoading ? (
        <GlassCard className="p-6">
          <p className="text-white/60">Завантаження прогресу...</p>
        </GlassCard>
      ) : isError ? (
        <GlassCard className="p-6 border-red-500/25">
          {/* fix code_x: explicit error state instead of silent blank page */}
          <p className="text-red-300">Не вдалося завантажити прогрес. Спробуйте оновити сторінку.</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="p-5">
              <p className="text-white/55 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-white/85" />
                Рівень
              </p>
              <p className="text-3xl font-bold text-white mt-2">{level}</p>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-white/55 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-white/85" />
                Всього очок
              </p>
              <p className="text-3xl font-bold text-white mt-2">{totalPoints}</p>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-white/55 text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-white/85" />
                Завершено блоків
              </p>
              <p className="text-3xl font-bold text-white mt-2">{completedBlocks}</p>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Прогрес до наступного рівня</h2>
            <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background:
                    'linear-gradient(90deg, rgba(var(--accent-soft-rgb),0.92), rgba(var(--accent-rgb),0.98), rgba(var(--accent-strong-rgb),0.92))',
                }}
              />
            </div>
            <p className="text-xs text-white/55 mt-3">
              {totalPoints}/{goalPoints} очок ({progress}%)
            </p>
          </GlassCard>
        </>
      )}
    </div>
  );
}
