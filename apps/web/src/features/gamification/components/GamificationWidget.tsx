import { GlassCard } from '@/ui'
import { useGetSummaryQuery } from '../services/gamification.api'
import LevelProgress from './LevelProgress'
import StreakBonus from './StreakBonus'

export default function GamificationWidget() {
  const { data: summary, isLoading } = useGetSummaryQuery(undefined, { pollingInterval: 0 })

  if (isLoading || !summary) {
    return null
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">⚡ bitMind</p>
          <p className="text-3xl font-semibold text-white mt-1">{summary.rewards.bitMind}</p>
          <p className="text-xs text-white/50 mt-1">преміум-валюта</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">🧠 MindXP</p>
          <p className="text-3xl font-semibold text-white mt-1">{summary.xp.total}</p>
          <p className="text-xs text-white/50 mt-1">{summary.streak.current} днів streak</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">💎 NeuroGems</p>
          <p className="text-3xl font-semibold text-white mt-1">{summary.rewards.neuroGems}</p>
          <p className="text-xs text-white/50 mt-1">для AI бонусів</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">🔥 Статус</p>
          <p className="text-3xl font-semibold text-white mt-1">Level</p>
          <p className="text-xs text-white/50 mt-1">Рівень {summary.xp.level}</p>
        </div>
      </GlassCard>
      <GlassCard className="p-5 space-y-4">
        <LevelProgress summary={summary} />
        <StreakBonus streakDays={summary.streak.current} />
      </GlassCard>
    </div>
  )
}
