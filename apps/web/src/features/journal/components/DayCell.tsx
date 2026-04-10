// apps/web/src/features/journal/components/DayCell.tsx
import type { JournalEvent } from '../types'
import { getJournalBadgeMeta, getJournalDisplayType } from '../eventPresentation'

interface DayCellProps {
  date: Date
  events: JournalEvent[]
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  compact?: boolean
  onSelect: (dateKey: string) => void
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function DayCell({
  date,
  events,
  isCurrentMonth,
  isToday,
  isSelected,
  compact = false,
  onSelect,
}: DayCellProps) {
  const dateKey = toDateKey(date)
  const dotItems = [...new Set(events.map((event) => getJournalDisplayType(event)))]
    .slice(0, 3)
    .map((displayType) => {
      const sourceEvent = events.find((event) => getJournalDisplayType(event) === displayType)
      const badgeMeta = getJournalBadgeMeta(sourceEvent ?? { id: '', type: displayType, date: '', title: '' })

      return {
        key: `${dateKey}-${displayType}`,
        dotClassName: badgeMeta.dotClassName,
        tooltip: `У цей день є: ${badgeMeta.label}`,
      }
    })

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      className={[
        'group flex flex-col border text-left transition-all duration-200 ease-out will-change-transform',
        compact ? 'min-h-[78px] rounded-[18px] p-2.5' : 'min-h-[92px] rounded-2xl p-3',
        isSelected
          ? 'scale-[1.01] border-[rgba(var(--accent-rgb),0.42)] bg-[rgba(var(--accent-rgb),0.12)] shadow-[0_12px_32px_rgba(var(--accent-rgb),0.12)]'
          : 'border-[rgba(255,255,255,0.06)] bg-[var(--bg-secondary)] hover:-translate-y-0.5 hover:border-[rgba(var(--accent-rgb),0.24)] hover:bg-[var(--bg-tertiary)] hover:shadow-[0_10px_24px_rgba(8,12,24,0.18)]',
        !isCurrentMonth && 'opacity-45',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={[
            'text-sm font-semibold',
            isToday ? 'text-[rgb(var(--accent-soft-rgb))]' : 'text-[var(--text-primary)]',
          ].join(' ')}
        >
          {date.getDate()}
        </span>
        {isToday ? (
          <span className="rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.14)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--accent-soft-rgb))]">
            Сьогодні
          </span>
        ) : null}
      </div>

      <div className={['mt-auto flex items-center gap-1.5', compact ? 'pt-3' : 'pt-4'].join(' ')}>
        {dotItems.map((item) => (
          <span
            key={item.key}
            className={`h-2.5 w-2.5 rounded-full transition-transform duration-200 group-hover:scale-110 ${item.dotClassName}`}
            aria-label={item.tooltip}
            title={item.tooltip}
          />
        ))}
      </div>
    </button>
  )
}
