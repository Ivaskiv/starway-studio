import { GlassCard } from '@/ui'
import { useGetProfileQuery } from '../services/gamification.api'
import LevelProgress from './LevelProgress'
import StreakBonus from './StreakBonus'

export default function GamificationWidget() {
  const { data: profile, isLoading } = useGetProfileQuery(undefined, { pollingInterval: 0 })

  if (isLoading || !profile) {
    return null
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">⚡ bitMind</p>
          <p className="text-3xl font-semibold text-white mt-1">{profile.bitMind}</p>
          <p className="text-xs text-white/50 mt-1">преміум-валюта</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">🧠 MindXP</p>
          <p className="text-3xl font-semibold text-white mt-1">{profile.mindXP}</p>
          <p className="text-xs text-white/50 mt-1">{profile.currentStreakDays ?? 0} днів streak</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">💎 NeuroGems</p>
          <p className="text-3xl font-semibold text-white mt-1">{profile.neuroGems}</p>
          <p className="text-xs text-white/50 mt-1">для AI бонусів</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">🔥 Статус</p>
          <p className="text-3xl font-semibold text-white mt-1">{profile.levelTitle}</p>
          <p className="text-xs text-white/50 mt-1">Рівень {profile.level}</p>
        </div>
      </GlassCard>
      <GlassCard className="p-5 space-y-4">
        <LevelProgress profile={profile} />
        <StreakBonus streakDays={profile.currentStreakDays} />
      </GlassCard>
    </div>
  )
}
