interface RhythmCardProps {
  xpTotal: number
  streak: number
  level: number
}

export function RhythmCard({ xpTotal, streak, level }: RhythmCardProps) {
  return (
    <section className="space-y-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
        Ритм
      </p>
      <h2 className="mt-3 text-xl font-semibold text-white">Твій темп сьогодні</h2>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-[rgba(119,164,255,0.12)] bg-[rgba(68,103,183,0.12)] px-2 py-3">
          <p className="text-xl font-semibold text-white">{xpTotal}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/55">XP</p>
        </div>
        <div className="rounded-xl border border-[rgba(119,164,255,0.12)] bg-[rgba(68,103,183,0.12)] px-2 py-3">
          <p className="text-xl font-semibold text-white">{streak}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/55">Серія</p>
        </div>
        <div className="rounded-xl border border-[rgba(119,164,255,0.12)] bg-[rgba(68,103,183,0.12)] px-2 py-3">
          <p className="text-xl font-semibold text-white">{level}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/55">Рівень</p>
        </div>
      </div>
    </section>
  )
}

export default RhythmCard
