import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CheckCircle2, CircleDot, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface DayCardProps {
  elementId?: string
  title: string
  icon: LucideIcon
  href: string
  status: 'done' | 'active' | 'locked'
  description: string
  dotClassName: string
}

export function DayCard({
  elementId,
  title,
  icon: Icon,
  href,
  status,
  description,
  dotClassName,
}: DayCardProps) {
  const statusMeta = {
    done: { icon: CheckCircle2 },
    active: { icon: CircleDot },
    locked: { icon: LockKeyhole },
  }[status]

  const StatusIcon = statusMeta.icon

  return (
    <Link
      id={elementId}
      to={href}
      tabIndex={-1}
      className="glass-card p-4 shadow-[0_18px_48px_rgba(8,15,32,0.26)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[rgba(119,164,255,0.28)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center bg-white/5 text-white/80">
            <Icon className="h-4.5 w-4.5" />
          </span>

          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/60">{description}</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
          <StatusIcon className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`} />
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  )
}

export default DayCard