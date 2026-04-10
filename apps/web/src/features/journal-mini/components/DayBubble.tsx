import type { JournalDayState } from '@/features/journal/types'

interface DayBubbleProps {
  date: Date
  dayState?: JournalDayState
  isSelected: boolean
  isToday: boolean
  onSelect: (dateKey: string) => void
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function DayBubble({ date, dayState, isSelected, isToday, onSelect }: DayBubbleProps) {
  const dateKey = toDateKey(date)
  const summary = dayState?.summary ?? { completed: 0, pending: 0, missed: 0 }

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      className={[
        'flex min-h-11 min-w-11 flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center transition-colors duration-150 ease-out active:scale-[0.98]',
        isSelected
          ? 'border-[rgba(var(--accent-rgb),0.42)] bg-[rgba(var(--accent-rgb),0.16)] shadow-[0_10px_24px_rgba(var(--accent-rgb),0.12)]'
          : isToday
            ? 'border-[rgba(var(--accent-rgb),0.3)] bg-[var(--bg-secondary)]'
            : 'border-[var(--border)] bg-[var(--bg-secondary)]',
      ].join(' ')}
    >
      <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {date.toLocaleDateString('uk-UA', { weekday: 'short' })}
      </span>
      <span
        className={[
          'mt-1 text-base font-semibold',
          isToday || isSelected ? 'text-[rgb(var(--accent-soft-rgb))]' : 'text-[var(--text-primary)]',
        ].join(' ')}
      >
        {date.getDate()}
      </span>
      <div className="mt-1.5 flex min-h-1.5 items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${summary.completed > 0 ? 'bg-emerald-400' : 'bg-white/10'}`} />
        <span className={`h-1.5 w-1.5 rounded-full ${summary.pending > 0 ? 'bg-amber-300' : 'bg-white/10'}`} />
        <span className={`h-1.5 w-1.5 rounded-full ${summary.missed > 0 ? 'bg-rose-400' : 'bg-white/10'}`} />
      </div>
    </button>
  )
}
