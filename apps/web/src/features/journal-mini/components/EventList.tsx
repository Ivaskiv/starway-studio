import { MoonStar, SunMedium } from 'lucide-react'
import type { JournalEvent } from '@/features/journal/types'
import { getJournalBadgeMeta } from '@/features/journal/eventPresentation'

interface EventListProps {
  dayLabel: string
  events: JournalEvent[]
}

function getEventTime(value: string) {
  const date = new Date(value)
  if (date.getHours() === 0 && date.getMinutes() === 0) return null

  return date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EventList({ dayLabel, events }: EventListProps) {
  const orderedEvents = [...events].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <div className="mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
            {dayLabel}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Що відбувається</h4>
        </div>
      </div>

      {orderedEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 text-sm text-[var(--text-muted)]">
          Сьогодні поки тихо
        </div>
      ) : (
        <div className="max-h-[38vh] space-y-2 overflow-y-auto">
          {orderedEvents.map((event) => {
            const typeBadge = getJournalBadgeMeta(event)
            const time = getEventTime(event.date)
            const isEveningReflection =
              event.type === 'REFLECTION' && typeof event.meta?.period === 'string' && event.meta.period === 'evening'

            return (
              <div
                key={event.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {event.type === 'REFLECTION' ? (
                        isEveningReflection ? (
                          <MoonStar className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                        ) : (
                          <SunMedium className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                        )
                      ) : null}
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
                    </div>
                    {time ? <p className="mt-1 text-xs text-[var(--text-muted)]">{time}</p> : null}
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${typeBadge.badgeClassName}`}
                  >
                    {typeBadge.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
