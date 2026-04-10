import type { FC } from 'react'
import { useMemo } from 'react'
import type { GamificationSummary } from '../types'

interface LevelProgressProps {
  summary: GamificationSummary
}

const LevelProgress: FC<LevelProgressProps> = ({ summary }) => {
  const progress = useMemo(() => {
    if (summary.xp.nextLevelXp <= 0) return 100
    return Math.min(100, Math.round((summary.xp.currentLevelXp / summary.xp.nextLevelXp) * 100))
  }, [summary.xp.currentLevelXp, summary.xp.nextLevelXp])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>Рівень {summary.xp.level}</span>
        <span>{summary.xp.nextLevelXp > 0 ? `${Math.max(summary.xp.nextLevelXp - summary.xp.currentLevelXp, 0)} XP до ➜` : 'Максимальний рівень'}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(97,167,255,0.95)_0%,rgba(255,181,92,0.95)_100%)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>{progress}% прогрес</span>
        <span className="rounded-full border border-white/14 bg-white/4 px-2 py-0.5 text-[10px]">XP {summary.xp.total}</span>
      </div>
    </div>
  )
}

export default LevelProgress
