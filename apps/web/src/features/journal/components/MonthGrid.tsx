// apps/web/src/features/journal/components/MonthGrid.tsx
import DayCell from './DayCell'
import type { JournalEvent } from '../types'

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildCalendarDays(month: number, year: number) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const totalDays = lastDay.getDate()
  const cells: Date[] = []

  for (let index = startWeekday; index > 0; index -= 1) {
    cells.push(new Date(year, month - 1, 1 - index))
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month - 1, day))
  }

  let trailingDay = 1
  while (cells.length % 7 !== 0) {
    cells.push(new Date(year, month, trailingDay))
    trailingDay += 1
  }

  return cells
}

interface MonthGridProps {
  compact?: boolean
  events: JournalEvent[]
  eventsByDate: Record<string, JournalEvent[]>
  month: number
  year: number
  selectedDay: string
  onSelectDay: (day: string) => void
}

export default function MonthGrid({
  compact = false,
  events,
  eventsByDate,
  month,
  year,
  selectedDay,
  onSelectDay,
}: MonthGridProps) {
  const cells = buildCalendarDays(month, year)
  const todayKey = toDateKey(new Date())

  return (
    <div className={compact ? 'space-y-3 transition-all duration-300 ease-out' : 'space-y-4 transition-all duration-300 ease-out'}>
      <div className={compact ? 'grid grid-cols-7 gap-1.5' : 'grid grid-cols-7 gap-2'}>
        {WEEK_DAYS.map((day) => (
          <div key={day} className="px-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
            {day}
          </div>
        ))}
      </div>

      <div className={compact ? 'grid grid-cols-7 gap-1.5' : 'grid grid-cols-7 gap-2'}>
        {cells.map((date) => {
          const dateKey = toDateKey(date)
          return (
            <DayCell
              key={dateKey}
              compact={compact}
              date={date}
              events={eventsByDate[dateKey] ?? []}
              isCurrentMonth={date.getMonth() === month - 1}
              isToday={dateKey === todayKey}
              isSelected={dateKey === selectedDay}
              onSelect={onSelectDay}
            />
          )
        })}
      </div>

      {!events.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-5 text-sm text-[var(--text-muted)]">
          За цей місяць ще немає подій для журналу.
        </div>
      ) : null}
    </div>
  )
}
