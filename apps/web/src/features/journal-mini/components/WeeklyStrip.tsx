import DayBubble from './DayBubble'
import type { JournalDayState } from '@/features/journal/types'

interface WeeklyStripProps {
  days: Date[]
  dayStatesByDate: Record<string, JournalDayState>
  selectedDay: string
  onSelectDay: (dateKey: string) => void
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function WeeklyStrip({ days, dayStatesByDate, selectedDay, onSelectDay }: WeeklyStripProps) {
  const todayKey = toDateKey(new Date())

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const dateKey = toDateKey(day)
          return (
            <DayBubble
              key={dateKey}
              date={day}
              dayState={dayStatesByDate[dateKey]}
              isSelected={selectedDay === dateKey}
              isToday={todayKey === dateKey}
              onSelect={onSelectDay}
            />
          )
        })}
      </div>
    </div>
  )
}
