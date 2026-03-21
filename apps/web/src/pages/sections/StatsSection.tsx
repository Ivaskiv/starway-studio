import { Star, TrendingUp, Users, Zap } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { useGetDashboardStatsQuery } from '@/features/analytics/services/analytics.api'
import type { DashboardStat } from '@/features/analytics/types/types'
import type { ReactNode } from 'react'

const FALLBACK_STATS: Array<{ icon: ReactNode; value: string; label: string }> = [
  { icon: <Users />, value: '2,400+', label: 'Активних користувачів' },
  { icon: <TrendingUp />, value: '89%', label: 'Досягають цілей' },
  { icon: <Zap />, value: '21 день', label: 'Середній результат' },
  { icon: <Star />, value: '4.9 / 5', label: 'Рейтинг платформи' },
]

function mapStats(stat: DashboardStat) {
  return {
    icon: stat.icon ?? <Star />,
    value: String(stat.value),
    label: stat.label,
  }
}

export default function StatsSection() {
  const isAuthenticated = useAppSelector(state => state.auth.status === 'authenticated')
  const { data } = useGetDashboardStatsQuery(
    { period: '30d' },
    { skip: !isAuthenticated },
  )
  const stats = data?.stats?.length ? data.stats.slice(0, 4).map(mapStats) : FALLBACK_STATS

  return (
    <section className="py-8 border-y border-[color:var(--border-primary)]">
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ icon, value, label }) => (
            <div
              key={label}
              className="
                text-center px-4 py-6 rounded-2xl cursor-default
                border border-[color:var(--border-primary)]
                bg-[color:var(--glass-bg)]
                hover:bg-[color:var(--glass-bg-hover)]
                hover:border-[color:var(--border-accent)]
                transition-all duration-200
              "
            >
              <div className="flex items-center justify-center mx-auto mb-3 w-8 h-8 text-[color:var(--accent-soft)] opacity-90">
                {icon}
              </div>
              <p className="text-2xl font-bold text-[color:var(--text-primary)] tracking-tight">{value}</p>
              <p className="text-xs text-[color:var(--text-muted)] mt-1 leading-snug">{label}</p>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  )
}
