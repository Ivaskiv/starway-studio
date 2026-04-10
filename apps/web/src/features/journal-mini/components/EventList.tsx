import { ExternalLink, ListTodo, MoonStar, SunMedium, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getJournalBadgeMeta } from '@/features/journal/eventPresentation'
import type { JournalDayState, JournalEvent } from '@/features/journal/types'

interface EventListProps {
  dayLabel: string
  dayState: JournalDayState
}

function getEventTime(value: string) {
  const date = new Date(value)
  if (date.getHours() === 0 && date.getMinutes() === 0) return null

  return date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Item({
  event,
  onOpen,
}: {
  event: JournalEvent
  onOpen: () => void
}) {
  const typeBadge = getJournalBadgeMeta(event)
  const time = getEventTime(event.date)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
          {time ? <p className="mt-1 text-xs text-[var(--text-muted)]">{time}</p> : null}
        </div>

        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${typeBadge.badgeClassName}`}
        >
          {typeBadge.label}
        </span>
      </div>
    </button>
  )
}

function CTA({
  title,
  body,
  onOpen,
}: {
  title: string
  body: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 text-left"
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">{body}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]">
        Відкрити
        <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}

export default function EventList({ dayLabel, dayState }: EventListProps) {
  const navigate = useNavigate()
  const orderedEvents = [...dayState.events].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <div className="mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
            {dayLabel}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Стан дня</h4>
        </div>
      </div>

      <div className="space-y-2">
        {dayState.reflection.morning.event ? (
          <Item event={dayState.reflection.morning.event} onOpen={() => navigate('/dashboard/cycle?session=morning')} />
        ) : (
          <CTA
            title="Ранкова рефлексія очікує"
            body="Запусти ранкову сесію, щоб журнал оживився і з'явилися мікрозавдання."
            onOpen={() => navigate('/dashboard/cycle?session=morning')}
          />
        )}

        {dayState.microTasks.items.length > 0 ? (
          dayState.microTasks.items.map((event) => (
            <Item key={event.id} event={event} onOpen={() => navigate('/dashboard/microtasks')} />
          ))
        ) : (
          <CTA
            title={dayState.microTasks.status === 'awaiting' ? 'Мікрозавдання чекають на ранок' : 'На цей день мікрозавдань немає'}
            body={dayState.microTasks.status === 'awaiting'
              ? 'Після ранкової сесії ми проаналізуємо відповіді та сформуємо завдання на день.'
              : 'Коли для цього дня будуть активні чи завершені задачі, вони з’являться тут автоматично.'}
            onOpen={() => navigate('/dashboard/microtasks')}
          />
        )}

        {dayState.zoomSessions.items.length > 0 ? (
          dayState.zoomSessions.items.map((event) => (
            <Item key={event.id} event={event} onOpen={() => navigate('/dashboard/zoom')} />
          ))
        ) : (
          <CTA
            title="Zoom-сесій на цей день немає"
            body="Якщо сесія буде запланована або підтверджена, вона одразу з'явиться і тут."
            onOpen={() => navigate('/dashboard/zoom')}
          />
        )}

        {dayState.reflection.evening.event ? (
          <Item event={dayState.reflection.evening.event} onOpen={() => navigate('/dashboard/cycle?session=evening')} />
        ) : (
          <CTA
            title="Вечірня рефлексія очікує"
            body="Увечері заверши цикл, щоб закрити день і оновити підсумки."
            onOpen={() => navigate('/dashboard/cycle?session=evening')}
          />
        )}

        {orderedEvents.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <SunMedium className="h-3.5 w-3.5" />
              <ListTodo className="h-3.5 w-3.5" />
              <Video className="h-3.5 w-3.5" />
              <MoonStar className="h-3.5 w-3.5" />
              Усі події дня: {orderedEvents.length}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
