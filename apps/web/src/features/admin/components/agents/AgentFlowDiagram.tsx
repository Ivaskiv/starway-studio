import { useEffect, useRef, useState } from 'react'

import { AGENT_CARDS, AGENT_EDGES, CATEGORY_META } from './agentControlCenter.config'
import { AgentCard } from './AgentCard'
import type { AgentCardDef, AgentCategory } from './agentControlCenter.types'

interface Props {
  onSelectAgent: (agent: AgentCardDef) => void
}

interface EdgeLine {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

const CATEGORIES: AgentCategory[] = ['marketing', 'sales', 'ops']

export function AgentFlowDiagram({ onSelectAgent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState<EdgeLine[]>([])

  useEffect(() => {
    const recalcEdges = () => {
      const containerRefCurrent = containerRef.current
      if (!containerRefCurrent) return

      const containerRect = containerRefCurrent.getBoundingClientRect()
      const nextEdges = AGENT_EDGES.flatMap((edge) => {
        const fromEl = containerRefCurrent.querySelector<HTMLElement>(`[data-agent-id="${edge.from}"]`)
        const toEl = containerRefCurrent.querySelector<HTMLElement>(`[data-agent-id="${edge.to}"]`)
        if (!fromEl || !toEl) return []

        const fromRect = fromEl.getBoundingClientRect()
        const toRect = toEl.getBoundingClientRect()
        const sourceAgent = AGENT_CARDS.find((agent) => agent.key === edge.from)

        return [{
          x1: fromRect.right - containerRect.left,
          y1: fromRect.top + fromRect.height / 2 - containerRect.top,
          x2: toRect.left - containerRect.left,
          y2: toRect.top + toRect.height / 2 - containerRect.top,
          color: sourceAgent ? CATEGORY_META[sourceAgent.category].color : 'rgba(160,180,255,0.5)',
        }]
      })

      setEdges(nextEdges)
    }

    const timeoutId = window.setTimeout(recalcEdges, 80)
    window.addEventListener('resize', recalcEdges)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', recalcEdges)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <marker id="agent-control-center-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(160,180,255,0.55)" />
          </marker>
        </defs>
        {edges.map((edge, index) => {
          const controlX = (edge.x1 + edge.x2) / 2
          return (
            <path
              key={`${edge.x1}-${edge.y1}-${index}`}
              d={`M${edge.x1},${edge.y1} C${controlX},${edge.y1} ${controlX},${edge.y2} ${edge.x2},${edge.y2}`}
              fill="none"
              markerEnd="url(#agent-control-center-arrow)"
              opacity={0.5}
              stroke={edge.color}
              strokeDasharray="5,4"
              strokeWidth={1.5}
            />
          )
        })}
      </svg>

      <div className="relative grid gap-5 lg:grid-cols-3">
        {CATEGORIES.map((category) => {
          const meta = CATEGORY_META[category]
          const agents = AGENT_CARDS.filter((agent) => agent.category === category)

          return (
            <div key={category} className="flex flex-col">
              <div
                className="flex items-center gap-2 rounded-t-xl px-3 py-2.5 text-[13px] font-extrabold text-[#06070f]"
                style={{ background: meta.color }}
              >
                <span className="text-base">{meta.icon}</span>
                {meta.label}
              </div>

              <div className="flex flex-1 flex-col gap-1.5 rounded-b-xl border border-t-0 border-white/10 bg-white/[0.015] p-2">
                {agents.map((agent) => (
                  <div key={agent.key} data-agent-id={agent.key}>
                    <AgentCard agent={agent} colColor={meta.color} onClick={() => onSelectAgent(agent)} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
