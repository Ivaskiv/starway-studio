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
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>Level {summary.xp.level}</span>
        <span>{summary.xp.nextLevelXp > 0 ? `${Math.max(summary.xp.nextLevelXp - summary.xp.currentLevelXp, 0)} XP до ➜` : 'Максимальний рівень'}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>{progress}% прогрес</span>
        <span className="px-2 py-0.5 rounded-full border border-white/20 text-[10px]">XP {summary.xp.total}</span>
      </div>
    </div>
  )
}

export default LevelProgress
