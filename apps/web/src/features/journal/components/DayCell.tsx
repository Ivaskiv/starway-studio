import type { JournalEvent } from '../types'
import { getJournalBadgeMeta, getJournalDisplayType } from '../eventPresentation'

interface DayCellProps {
  date: Date
  events: JournalEvent[]
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
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
  onSelect,
}: DayCellProps) {
  const dateKey = toDateKey(date)
  const uniqueTypes = [...new Set(events.map((event) => getJournalDisplayType(event)))].slice(0, 3)

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      className={[
        'group flex min-h-[92px] flex-col rounded-2xl border p-3 text-left transition-all duration-200 ease-out will-change-transform',
        isSelected
          ? 'scale-[1.01] border-[rgba(var(--accent-rgb),0.42)] bg-[rgba(var(--accent-rgb),0.12)] shadow-[0_12px_32px_rgba(var(--accent-rgb),0.12)]'
          : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:-translate-y-0.5 hover:border-[rgba(var(--accent-rgb),0.24)] hover:bg-[var(--bg-tertiary)] hover:shadow-[0_10px_24px_rgba(8,12,24,0.18)]',
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
          <span className="rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[rgba(var(--accent-rgb),0.14)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--accent-soft-rgb))]">
            Сьогодні
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center gap-1.5 pt-4">
        {uniqueTypes.map((type) => (
          <span
            key={`${dateKey}-${type}`}
            className={`h-2.5 w-2.5 rounded-full transition-transform duration-200 group-hover:scale-110 ${getJournalBadgeMeta({ id: '', type, date: '', title: '' }).dotClassName}`}
            aria-label={type}
          />
        ))}
      </div>
    </button>
  )
}
