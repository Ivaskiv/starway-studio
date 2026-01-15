// packages/frontend/src/features/dashboard/blocks/admin/FunnelsOverview.tsx
import { useGetFunnelsQuery } from '@/features/funnels/services/funnels.api'
import { GlassCard } from '@/ui'
import { Workflow } from 'lucide-react'

export default function FunnelsOverview() {
  const { data = [] } = useGetFunnelsQuery()

  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-4 flex gap-2">
        <Workflow /> Воронки
      </h2>

      <ul className="space-y-2">
        {data.map(f => (
          <li key={f.id} className="text-white/70">
            {f.name} — {f.status}
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
