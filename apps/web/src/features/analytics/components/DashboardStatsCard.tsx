// frontend/src/features/analytics/components/DashboardStatsCard.tsx
import { GlassCard } from '@/ui'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { DashboardStat } from '../types/types'

interface Props {
  stat: DashboardStat
}

export function DashboardStatsCard({ stat }: Props) {
  const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus
  const trendColor = stat.trend === 'up' ? 'text-green-400' : stat.trend === 'down' ? 'text-red-400' : 'text-gray-400'

  return (
    <GlassCard className="p-6 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${stat.color}`}>{stat.icon}</div>
        <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          {stat.change}
        </div>
      </div>
      <p className="text-sm text-white/60 mb-1">{stat.label}</p>
      <p className="text-3xl font-bold text-white">{stat.value}</p>
    </GlassCard>
  )
}