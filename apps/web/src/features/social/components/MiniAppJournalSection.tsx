import EventList from '@/features/journal-mini/components/EventList'
import WeeklyStrip from '@/features/journal-mini/components/WeeklyStrip'
import { useWeeklyJournal } from '@/features/journal-mini/hooks/useWeeklyJournal'

interface MiniAppJournalSectionProps {
  showHeader?: boolean
}

export default function MiniAppJournalSection({
  showHeader = true,
}: MiniAppJournalSectionProps) {
  const { days, eventsByDate, selectedDay, setSelectedDay } = useWeeklyJournal()
  const selectedDate = new Date(`${selectedDay}T12:00:00`)
  const selectedDayLabel = selectedDate.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
  })
  const selectedEvents = eventsByDate[selectedDay] ?? []

  return (
    <div className="space-y-3">
      {showHeader ? (
        <div className="dashboard-liquid-card--soft px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
            Журнал тижня
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
            Події, рефлексії й AI-сесії в одному блоці
          </h3>
          <p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">
            У Telegram показуємо компактний weekly strip і записи вибраного дня. Без місячної сітки.
          </p>
        </div>
      ) : null}

      <WeeklyStrip
        days={days}
        eventsByDate={eventsByDate}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      <EventList dayLabel={selectedDayLabel} events={selectedEvents} />
    </div>
  )
}
