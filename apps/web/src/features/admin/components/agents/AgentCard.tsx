import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'

import type { AgentCardDef } from './agentControlCenter.types'

interface Props {
  agent: AgentCardDef
  colColor: string
  onClick: () => void
}

const RUNTIME_STATUS_DOT = {
  active: 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]',
  running: 'bg-sky-400 shadow-[0_0_6px_theme(colors.sky.400)] animate-pulse',
  pending: 'bg-slate-500',
}

function resolveStatusDot(agent: AgentCardDef): string {
  if (!agent.runtimeRegistered || agent.runtimeStatus === null) {
    return 'bg-slate-500'
  }

  return RUNTIME_STATUS_DOT[agent.runtimeStatus]
}

function resolveStatusBadge(agent: AgentCardDef): string {
  if (agent.runtimeRegistered && agent.runtimeStatus === 'active') {
    return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
  }

  if (agent.runtimeRegistered && agent.runtimeStatus === 'running') {
    return 'border-sky-400/25 bg-sky-400/10 text-sky-200'
  }

  if (agent.capabilityType === 'KNOWLEDGE_TOOL') {
    return 'border-white/10 bg-white/5 text-slate-300'
  }

  return 'border-white/10 bg-white/[0.04] text-slate-400'
}

export function AgentCard({ agent, colColor, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full cursor-pointer rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left transition-all duration-150',
        'hover:translate-x-0.5 hover:border-white/20 hover:bg-white/[0.05]',
      )}
      style={{ '--col-color': colColor } as CSSProperties}
    >
      <div
        className="absolute inset-y-3 left-0 w-px rounded-full opacity-70"
        style={{ backgroundColor: colColor }}
      />
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-base">
          {agent.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <p className="truncate text-[12.5px] font-bold leading-tight text-white">{agent.name}</p>
            <span
              className={cn(
                'shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                resolveStatusBadge(agent),
              )}
            >
              {agent.statusLabel}
            </span>
          </div>
          <p className="line-clamp-2 text-[11px] leading-snug text-slate-400">{agent.desc}</p>
          <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
            {agent.isSystem ? 'Система' : 'Коуч'}
          </p>
        </div>
        <div className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', resolveStatusDot(agent))} />
      </div>
    </button>
  )
}
