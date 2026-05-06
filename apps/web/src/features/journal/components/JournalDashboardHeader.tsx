import { BookOpen, Flame } from 'lucide-react'

type Props = {
  dayNumber: number
  totalDays: number
  streak: number
  xpTotal: number
  level: number
}

export default function JournalDashboardHeader({
  dayNumber,
  totalDays,
  streak,
  xpTotal,
  level,
}: Props) {
  return (
    <div className="rounded-[26px] border border-[rgba(92,136,255,0.14)] bg-[rgba(9,13,22,0.96)] px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[rgba(92,136,255,0.24)] bg-[rgba(34,56,112,0.28)] text-[rgb(125,172,255)]">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[1.9rem] font-black tracking-[-0.03em] text-[var(--text-primary)]">Шлях</h1>
              <span className="rounded-full border border-[rgba(92,136,255,0.2)] bg-[rgba(53,91,182,0.32)] px-4 py-1.5 text-sm font-semibold text-[rgb(157,195,255)]">
                день {dayNumber} з {totalDays}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(16,23,37,0.92)] px-4 py-2 text-[var(--text-primary)]">
            <Flame className="h-4 w-4 text-amber-400" />
            <span className="text-xl font-bold text-amber-400">{streak}</span>
          </div>
          <div className="rounded-full border border-emerald-400/16 bg-emerald-500/16 px-4 py-2 text-[var(--text-primary)]">
            <span className="text-[1.05rem] font-bold text-emerald-300">{xpTotal} XP</span>
            <span className="ml-2 text-sm font-semibold text-emerald-200/90">· рівень {level}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
