import type { FC } from 'react'
import { useMemo } from 'react'
import type { GamificationProfile } from '../types'

interface LevelProgressProps {
  profile: GamificationProfile
}

const LevelProgress: FC<LevelProgressProps> = ({ profile }) => {
  const progress = useMemo(() => {
    if (profile.xpToNextLevel <= 0) return 100
    const total = profile.mindXP + profile.xpToNextLevel
    const gained = profile.mindXP
    return Math.min(100, Math.round((gained / total) * 100))
  }, [profile.mindXP, profile.xpToNextLevel])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>Level {profile.level} · {profile.levelTitle}</span>
        <span>{profile.xpToNextLevel > 0 ? `${profile.xpToNextLevel} XP до ➜` : 'Максимальний рівень'}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>{progress}% прогрес</span>
        <span className="px-2 py-0.5 rounded-full border border-white/20 text-[10px]">{profile.unlocks.join(' · ')}</span>
      </div>
    </div>
  )
}

export default LevelProgress
