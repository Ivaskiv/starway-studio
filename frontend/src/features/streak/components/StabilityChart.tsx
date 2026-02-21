// frontend/src/features/streak/components/StabilityChart.tsx
/**
 * StabilityChart - Visual stability vs drain
 */

import { useGetStreakQuery } from '../services/streak.api';
import { GlassCard } from '@/ui';

export function StabilityChart() {
  const { data: streak } = useGetStreakQuery();

  if (!streak || streak.totalDays === 0) return null;

  const stabilityPercent = Math.round((streak.stabilityDays / streak.totalDays) * 100);
  const drainPercent = Math.round((streak.drainDays / streak.totalDays) * 100);

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-bold text-white mb-4">Баланс виборів</h3>

      <div className="space-y-4">
        {/* Stability */}
        <div>
          <div className="flex justify-between text-sm text-white/70 mb-2">
            <span>✨ Обрала нове</span>
            <span>{streak.stabilityDays} днів ({stabilityPercent}%)</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              style={{ width: `${stabilityPercent}%` }}
            />
          </div>
        </div>

        {/* Drain */}
        <div>
          <div className="flex justify-between text-sm text-white/70 mb-2">
            <span>🔁 Підтверджувала старе</span>
            <span>{streak.drainDays} днів ({drainPercent}%)</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
              style={{ width: `${drainPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Insight */}
      {stabilityPercent >= 70 && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm text-center">
            💪 Сильний фокус на нових виборах!
          </p>
        </div>
      )}

      {drainPercent >= 70 && (
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-orange-400 text-sm text-center">
            ⚠️ Багато старих патернів. Спробуй усвідомлені вибори.
          </p>
        </div>
      )}
    </GlassCard>
  );
}