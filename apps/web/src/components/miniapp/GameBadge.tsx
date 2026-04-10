import { Flame, Gem, Sparkles } from 'lucide-react'
import { InfoHint } from '@/ui'

type GameBadgeVariant = 'streak' | 'xp' | 'level'

interface GameBadgeProps {
  label: string
  value: string | number
  variant?: GameBadgeVariant
  description?: string
  instruction?: string
}

const ICONS = {
  streak: Flame,
  xp: Gem,
  level: Sparkles,
} satisfies Record<GameBadgeVariant, typeof Flame>

export default function GameBadge({
  label,
  value,
  variant = 'xp',
  description,
  instruction,
}: GameBadgeProps) {
  const Icon = ICONS[variant]

  return (
    <div className="miniapp-gamebadge flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
      <span className="btn-icon h-9 w-9 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
          {description ? (
            <InfoHint
              label={label}
              description={description}
              instruction={instruction}
              align="left"
            />
          ) : null}
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  )
}
