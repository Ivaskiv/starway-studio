import { useAppSelector } from '@/app/hooks';
import { useGetProgressQuery } from '@/features/progress/services/progress.api';
import { GlassCard } from '@/ui';
import { Activity, BarChart3, Target, TrendingUp } from 'lucide-react';
import { useGetWheelHistoryQuery } from '@/features/wheel/api';

export default function ProgressPage() {
  const userId = useAppSelector((s) => s.auth.user?.id);
  const { data, isLoading, isError } = useGetProgressQuery(userId ?? '', { skip: !userId });
  const { data: wheelHistory } = useGetWheelHistoryQuery(
    { userId: userId ?? '', limit: 5 },
    { skip: !userId }
  );

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
  const latestWheel = wheelHistory?.[0];
  const wheelCount = wheelHistory?.length ?? 0;
  const wheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt).toLocaleDateString('uk')
    : null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
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
                Всього bitMind
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
            <div className="h-3 w-full rounded-full bg-[var(--glass-border)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(var(--accent-soft-rgb),0.92), rgba(var(--accent-rgb),0.98), rgba(var(--accent-strong-rgb),0.92))',
                }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              {totalPoints}/{goalPoints} bitMind ({progress}%)
            </p>
          </GlassCard>

          {latestWheel && (
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-white/80" />
                <h2 className="text-lg font-semibold text-white">Колесо балансу</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-white/50">Останнє оновлення</p>
                  <p className="text-lg font-semibold text-white">{wheelDate}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Середній бал</p>
                  <p className="text-lg font-semibold text-white">{Number(latestWheel.averageScore ?? 0).toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Генерацій заповнено</p>
                  <p className="text-lg font-semibold text-white">{Math.min(wheelCount, 3)}/3</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 px-4 py-3">
                  <p className="text-xs text-white/50">Сильна сфера</p>
                  <p className="text-lg font-semibold text-white">
                    {latestWheel.strengths?.[0] ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 px-4 py-3">
                  <p className="text-xs text-white/50">Сфера розвитку</p>
                  <p className="text-lg font-semibold text-white">
                    {latestWheel.gaps?.[0] ?? '—'}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
