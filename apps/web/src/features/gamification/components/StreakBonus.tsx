import type { FC } from 'react'

interface StreakBonusProps {
  streakDays?: number
}

const StreakBonus: FC<StreakBonusProps> = ({ streakDays }) => {
  const days = Math.max(0, streakDays ?? 0)
  const nextMilestone = days >= 14 ? 30 : days >= 7 ? 14 : 7
  const daysLeft = Math.max(0, nextMilestone - days)

  return (
    <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Бонус ритму</p>
        <p className="mt-2 text-[2rem] font-semibold leading-none text-white">{days} днів</p>
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-6 text-white/62">
          {days > 0
            ? `Безперервний ритм уже зібраний на ${days} ${days === 1 ? 'день' : days >= 2 && days <= 4 ? 'дні' : 'днів'}.`
            : 'Перший безперервний ритм починається з одного завершеного дня.'}
        </p>
      </div>
      <div className="rounded-full bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-right text-xs font-medium text-white/68">
        {daysLeft === 0 ? '+30 XP готово' : `Ще ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft >= 2 && daysLeft <= 4 ? 'дні' : 'днів'} → +30 XP`}
      </div>
    </div>
  )
}

export default StreakBonus
