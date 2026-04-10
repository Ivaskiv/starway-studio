interface StatItem {
  label: string
  value: string
}

interface StatsRowProps {
  stats: StatItem[]
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="glass-card border border-[rgba(92,136,255,0.14)] bg-[linear-gradient(180deg,rgba(25,49,105,0.34),rgba(10,18,36,0.9))] p-4 shadow-[0_18px_44px_rgba(8,15,32,0.22)]"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">{stat.label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
        </div>
      ))}
    </section>
  )
}

export default StatsRow
