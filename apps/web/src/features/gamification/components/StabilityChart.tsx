// features/gamification/components/StabilityChart.tsx

import { GlassCard } from '@/ui'
import { useGetUserStreakQuery } from '@/features/gamification/services/gamification.api'

// ProgressBar використовує CSS custom property --progress-pct
// визначену через data-атрибут у _progress.scss (без жодного style={})
interface ProgressBarProps {
  pct:   number
  color: 'green' | 'orange'
}

export function ProgressBar({ pct, color }: ProgressBarProps) {
  const safe = Math.min(100, Math.max(0, pct))
  return (
    <div className="progress-track">
      <div
        className={`progress-fill progress-fill--${color}`}
        data-pct={safe}
      />
    </div>
  )
}

export function StabilityChart() {
  const { data: streak } = useGetUserStreakQuery()

  if (!streak || streak.totalDays === 0) return null

  const stabilityPct = Math.round((streak.stabilityDays / streak.totalDays) * 100)
  const drainPct     = Math.round((streak.drainDays      / streak.totalDays) * 100)

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-bold text-white mb-4">Баланс виборів</h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-white/70 mb-2">
            <span>✨ Обрала нове</span>
            <span>{streak.stabilityDays} днів ({stabilityPct}%)</span>
          </div>
          <ProgressBar pct={stabilityPct} color="green" />
        </div>

        <div>
          <div className="flex justify-between text-sm text-white/70 mb-2">
            <span>🔁 Підтверджувала старе</span>
            <span>{streak.drainDays} днів ({drainPct}%)</span>
          </div>
          <ProgressBar pct={drainPct} color="orange" />
        </div>
      </div>

      {stabilityPct >= 70 && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm text-center">💪 Сильний фокус на нових виборах!</p>
        </div>
      )}

      {drainPct >= 70 && (
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-orange-400 text-sm text-center">⚠️ Багато старих патернів. Спробуй усвідомлені вибори.</p>
        </div>
      )}
    </GlassCard>
  )
}