// features/analytics/components/UsersOverview.tsx

import { useAppSelector } from '@/app/hooks'
import { useGetAnalyticsOverviewQuery } from '@/features/analytics/services/analytics.api'
import { GlassCard } from '@/ui'

export default function UsersOverview() {
  const isAuthenticated = useAppSelector(state => state.auth.status === 'authenticated')
  const { data } = useGetAnalyticsOverviewQuery({ period: '30d' }, { skip: !isAuthenticated })

  if (!data) return null

  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-2">Користувачі</h2>
      <p className="text-white/60">Всього: {data.totalUsers}</p>
      <p className="text-white/60">Активні: {data.activeUsers}</p>
      <p className="text-white/60">Нові: {data.newUsers}</p>
    </GlassCard>
  )
}
