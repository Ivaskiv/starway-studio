import type { ReactNode } from 'react'

import { BrainCircuit, Flame, Gem, Sparkles } from 'lucide-react'

export interface GameBadgeProps {
  bitmind: number
  mindxp: number
  neurogems: number
  level: string
  xpPercent: number
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

export default function GameBadge({
  bitmind,
  mindxp,
  neurogems,
  level,
  xpPercent,
}: GameBadgeProps) {
  return (
    <div className="ios-glass px-4 py-4">
      <div className="miniapp-gamebadge">
        <MiniBadge icon={<Sparkles className="h-4 w-4" />} label="BITMIND" value={bitmind} tone="blue" />
        <MiniBadge icon={<Flame className="h-4 w-4" />} label="MINDXP" value={mindxp} tone="teal" />
        <MiniBadge icon={<Gem className="h-4 w-4" />} label="NEUROGEMS" value={neurogems} tone="gold" />
        <MiniBadge icon={<BrainCircuit className="h-4 w-4" />} label="Рівень" value={level} tone="accent" />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            XP Progress
          </span>
          <span className="text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]">
            {clampPercent(xpPercent)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          <div className="miniapp-gamebadge__progress" style={{ width: `${clampPercent(xpPercent)}%` }} />
        </div>
      </div>
    </div>
  )
}

function MiniBadge({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string | number
  tone: 'blue' | 'teal' | 'gold' | 'accent'
}) {
  return (
    <div className={`miniapp-gamebadge__pill miniapp-gamebadge__pill--${tone}`}>
      <span className="miniapp-gamebadge__pill-icon" aria-hidden="true">{icon}</span>
      <span className="min-w-0">
        <span className="miniapp-gamebadge__pill-label">{label}</span>
        <span className="miniapp-gamebadge__pill-value">{value}</span>
      </span>
    </div>
  )
}
