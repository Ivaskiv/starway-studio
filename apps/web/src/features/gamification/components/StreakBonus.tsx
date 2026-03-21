import type { FC } from 'react'

interface StreakBonusProps {
  streakDays?: number
}

const StreakBonus: FC<StreakBonusProps> = ({ streakDays }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-transparent p-4">
    <p className="text-xs uppercase tracking-[0.4em] text-white/50">Streak bonus</p>
    <p className="text-2xl font-semibold text-white mt-2">{streakDays ?? 0} днів</p>
    <p className="text-sm text-white/60">Ще 7 днів → +30 XP</p>
  </div>
)

export default StreakBonus
