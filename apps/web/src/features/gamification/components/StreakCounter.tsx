// features/gamification/components/StreakCounter.tsx

import { ProgressBar } from '@/features/gamification/components/StabilityChart'
import { useGetUserStreakQuery } from '@/features/gamification/services/gamification.api'
import { GlassCard } from '@/ui'
import { Calendar, Flame, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon:  ReactNode
  label: string
  value: number
  color: string
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="text-center">
      <div className={`${color} mb-1 flex justify-center`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  )
}

// ─── StreakCounter ────────────────────────────────────────────────────────────

export function StreakCounter() {
  const { data: streak, isLoading } = useGetUserStreakQuery()

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-white/10 rounded" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
        </div>
      </GlassCard>
    )
  }

  if (!streak) return null

  const stabilityPct = streak.totalDays > 0
    ? Math.round((streak.stabilityDays / streak.totalDays) * 100)
    : 0

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Твій Streak</h3>
        <Flame className="w-6 h-6 text-orange-500" />
      </div>

      <div className="text-center mb-6">
        <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-2">
          {streak.currentStreak}
        </div>
        <div className="text-white/70">
          {streak.currentStreak === 1 ? 'день підряд' : 'днів підряд'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Найдовший"   value={streak.longestStreak}  color="text-purple-400" />
        <StatCard icon={<Calendar   className="w-5 h-5" />} label="Всього днів" value={streak.totalDays}       color="text-blue-400"   />
        <StatCard icon={<Flame      className="w-5 h-5" />} label="Стабільність" value={streak.stabilityDays}  color="text-green-400"  />
      </div>

      {streak.totalDays > 0 && (
        <div className="mt-6">
          <div className="flex justify-between text-xs text-white/60 mb-2">
            <span>Стабільність</span>
            <span>{stabilityPct}%</span>
          </div>
          <ProgressBar pct={stabilityPct} color="green" />
        </div>
      )}

      {streak.currentStreak >= 7 && (
        <div className="mt-4 p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
          <p className="text-white text-sm text-center">
            🔥 Вау! Ти тримаєш streak вже тиждень! Продовжуй!
          </p>
        </div>
      )}
    </GlassCard>
  )
}