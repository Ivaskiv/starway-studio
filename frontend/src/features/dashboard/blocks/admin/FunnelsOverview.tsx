// /features/dashboard/blocks/admin/FunnelsOverview.tsx
import { Workflow } from 'lucide-react'
import { GlassCard } from '../../../../ui'
import { useGetFunnelsQuery } from '../../../funnels/services/funnels.api'

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
