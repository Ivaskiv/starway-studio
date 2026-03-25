import { Button } from '@/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { JournalEvent, JournalFilter } from '../types'
import DayDetails from './DayDetails'
import Filters from './Filters'
import MonthGrid from './MonthGrid'

interface JournalLayoutProps {
  month: number
  year: number
  events: JournalEvent[]
  eventsByDate: Record<string, JournalEvent[]>
  filter: JournalFilter
  isLoading: boolean
  selectedDay: string
  selectedEvents: JournalEvent[]
  onFilterChange: (next: JournalFilter) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDay: (day: string) => void
}

export default function JournalLayout({
  month,
  year,
  events,
  eventsByDate,
  filter,
  isLoading,
  selectedDay,
  selectedEvents,
  onFilterChange,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
}: JournalLayoutProps) {
  const title = new Date(year, month - 1, 1).toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="dashboard-liquid-card--soft overflow-hidden">
        <div className="dashboard-liquid-edge--top p-5">
        <div >
          <div>
          
            <h1 className="mt-2 text-3xl  text-[var(--text-primary)]">Журнал подій</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Календар AI, рефлексій, Zoom, практик, streak та підписки в одному місці.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="glass" color="muted" size="sm" leftIcon={ChevronLeft} onClick={onPrevMonth}>
              Назад
            </Button>
            <div className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </div>
            <Button variant="glass" color="muted" size="sm" rightIcon={ChevronRight} onClick={onNextMonth}>
              Далі
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <Filters filter={filter} onChange={onFilterChange} />
        </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="dashboard-liquid-card--soft p-5 transition-all duration-300 ease-out">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-5 text-sm text-[var(--text-muted)]">
              Завантажуємо журнал...
            </div>
          ) : (
            <MonthGrid
              events={events}
              eventsByDate={eventsByDate}
              month={month}
              year={year}
              selectedDay={selectedDay}
              onSelectDay={onSelectDay}
            />
          )}
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <DayDetails day={selectedDay} events={selectedEvents} />
        </div>
      </div>
    </div>
  )
}
