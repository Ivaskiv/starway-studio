import EventList from '@/features/journal-mini/components/EventList'
import WeeklyStrip from '@/features/journal-mini/components/WeeklyStrip'
import { useWeeklyJournal } from '@/features/journal-mini/hooks/useWeeklyJournal'

interface MiniAppJournalSectionProps {
  showHeader?: boolean
}

export default function MiniAppJournalSection({
  showHeader = true,
}: MiniAppJournalSectionProps) {
  const { days, dayStatesByDate, selectedDay, selectedDayState, setSelectedDay, isError } = useWeeklyJournal()
  const selectedDate = new Date(`${selectedDay}T12:00:00`)
  const selectedDayLabel = selectedDate.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-3">
      {showHeader ? (
        <div className="dashboard-liquid-card--soft px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
            Журнал тижня
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
            Все важливе за тиждень в одному місці
          </h3>
          <p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">
            Тут видно події, відповіді й короткі сигнали дня без зайвої великої сітки.
          </p>
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-xs leading-6 text-amber-100">
          Не вдалося завантажити журнал. Перевір авторизацію або підключення і онови сторінку.
        </div>
      ) : null}

      <WeeklyStrip
        days={days}
        dayStatesByDate={dayStatesByDate}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      <EventList dayLabel={selectedDayLabel} dayState={selectedDayState} />
    </div>
  )
}
