import { useState } from 'react'

import { GlassCard } from '@/ui'

import { AgentFlowDiagram } from './AgentFlowDiagram'
import { AgentModal } from './AgentModal'
import type { AgentCardDef } from './agentControlCenter.types'

interface Props {
  canEdit: boolean
}

export function AgentControlCenterTab({ canEdit }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<AgentCardDef | null>(null)

  return (
    <>
      <GlassCard variant="bordered" className="overflow-hidden">
        <div className="dashboard-liquid-edge--top p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
            Agent Control Center
          </p>
          <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight text-[var(--text-primary)]">
            Карта агентів
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
            Реальна карта агентів платформи. Стрілки показують dataflow, клік по картці відкриває prompt editor.
          </p>
        </div>

        <div className="p-5">
          <AgentFlowDiagram onSelectAgent={setSelectedAgent} />
        </div>
      </GlassCard>

      {selectedAgent ? (
        <AgentModal agent={selectedAgent} canEdit={canEdit} onClose={() => setSelectedAgent(null)} />
      ) : null}
    </>
  )
}
