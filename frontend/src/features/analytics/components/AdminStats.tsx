// features/admin/AdminStats.tsx  або  features/analytics/components/AdminStats.tsx

import { useGetAdminStatsQuery } from '@/features/analytics/services/analytics.api'
import { DollarSign, Users, Zap } from 'lucide-react'

export default function AdminStats() {
  const { data } = useGetAdminStatsQuery({ period: '30d' })

  if (!data) return null

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatItem icon={<Users      className="w-5 h-5" />} label="Юзерів"   value={data.total_users}    />
      <StatItem icon={<DollarSign className="w-5 h-5" />} label="Revenue"  value={`$${data.total_revenue}`} />
      <StatItem icon={<Zap        className="w-5 h-5" />} label="Активних" value={data.active_funnels} />
    </div>
  )
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-[var(--glass-bg)] border border-[var(--border-glass)] rounded-xl">
      <div className="text-[var(--accent)]">{icon}</div>
      <div>
        <div className="text-xs text-[var(--text-muted)]">{label}</div>
        <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
      </div>
    </div>
  )
}