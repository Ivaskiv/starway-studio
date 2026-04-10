interface RhythmCardProps {
  xpTotal: number
  streak: number
  level: number
}

export function RhythmCard({ xpTotal, streak, level }: RhythmCardProps) {
  return (
    <section className="glass-card border border-[rgba(92,136,255,0.16)] bg-[linear-gradient(180deg,rgba(34,68,138,0.38),rgba(10,18,36,0.92))] p-5 shadow-[0_22px_60px_rgba(8,15,32,0.32)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
        Rhythm
      </p>
      <h2 className="mt-3 text-xl font-semibold text-white">Твій темп сьогодні</h2>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-[rgba(119,164,255,0.12)] bg-[rgba(68,103,183,0.12)] px-3 py-4">
          <p className="text-xl font-semibold text-white">{xpTotal}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/55">XP</p>
        </div>
        <div className="rounded-2xl border border-[rgba(119,164,255,0.12)] bg-[rgba(68,103,183,0.12)] px-3 py-4">
          <p className="text-xl font-semibold text-white">{streak}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/55">Streak</p>
        </div>
        <div className="rounded-2xl border border-[rgba(119,164,255,0.12)] bg-[rgba(68,103,183,0.12)] px-3 py-4">
          <p className="text-xl font-semibold text-white">{level}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/55">Level</p>
        </div>
      </div>
    </section>
  )
}

export default RhythmCard
