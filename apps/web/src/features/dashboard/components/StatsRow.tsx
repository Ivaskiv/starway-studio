interface StatItem {
  label: string
  value: string
}

interface StatsRowProps {
  stats: StatItem[]
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="glass-card border border-[rgba(92,136,255,0.14)] bg-[linear-gradient(180deg,rgba(25,49,105,0.34),rgba(10,18,36,0.9))] p-3 sm:p-4"
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">{stat.label}</p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">{stat.value}</p>
        </div>
      ))}
    </section>
  )
}

export default StatsRow
