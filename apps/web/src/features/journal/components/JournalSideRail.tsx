import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type RailItem = {
  id: string
  icon: LucideIcon
  label: string
  active?: boolean
  tone?: 'done' | 'active' | 'locked'
  onClick: () => void
}

type Props = {
  items: RailItem[]
  dayNumber?: number
  side?: 'left' | 'right'
}

function getToneClass(tone: RailItem['tone'], active: boolean | undefined) {
  if (active) {
    return 'border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.2)] text-[rgb(96,165,250)] shadow-[0_16px_34px_rgba(15,34,70,0.28)]'
  }
  if (tone === 'done') {
    return 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.14)] text-[rgb(74,222,128)]'
  }
  if (tone === 'active') {
    return 'border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.12)] text-[rgb(96,165,250)]'
  }
  return 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
}

export default function JournalSideRail({ items, dayNumber, side = 'left' }: Props) {
  const cyclePercent = Math.max(0, Math.min(100, Math.round(((dayNumber ?? 0) / 30) * 100)))

  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[52px] flex-shrink-0 lg:flex lg:flex-col lg:items-center lg:justify-between">
      <div className="relative flex w-full flex-1 flex-col items-center gap-3 pt-2">
        <span className="absolute left-1/2 top-4 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))]" />
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.id} className="relative z-10 flex w-full justify-center">
              <button
                type="button"
                aria-label={item.label}
                title={item.label}
                onClick={item.onClick}
                className={cn(
                  'flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border transition-all duration-200',
                  getToneClass(item.tone, item.active),
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            </div>
          )
        })}
      </div>

      {side === 'left' ? (
        <div className="mb-2 flex flex-col items-center gap-2">
          <div className="flex h-[56px] w-[56px] flex-col items-center justify-center rounded-full border border-[rgba(81,138,255,0.28)] bg-[rgba(17,24,39,0.92)] text-[rgb(96,165,250)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className="text-sm font-bold leading-none">{cyclePercent}%</span>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">день</div>
            <div className="mt-1 text-lg font-semibold leading-none text-[rgb(148,191,255)]">{dayNumber ?? 0}</div>
          </div>
        </div>
      ) : (
        <div className="mb-2 h-[86px] w-full" aria-hidden="true" />
      )}
    </aside>
  )
}
