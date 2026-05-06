// apps/web/src/features/journal/components/DayDetails.tsx
import type { ReactNode } from 'react'
import { BellRing, Bot, CalendarCheck2, Flame, ListTodo, MoonStar, Sparkles, SunMedium, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { JournalEvent } from '../types'
import { getJournalBadgeMeta } from '../eventPresentation'

interface DayDetailsProps {
  day: string
  events: JournalEvent[]
}

function parseDateKey(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, date ?? 1)
}

function buildCycleUrl(session: 'morning' | 'evening', dayKey: string) {
  const todayKey = new Date().toISOString().slice(0, 10)
  const datePart = dayKey === todayKey ? '' : `&date=${dayKey}`
  return `/dashboard/cycle?session=${session}${datePart}`
}

function getMetaNumber(event: JournalEvent, key: string) {
  const value = event.meta?.[key]
  return typeof value === 'number' ? value : 0
}

function getMetaString(event: JournalEvent, key: string) {
  const value = event.meta?.[key]
  return typeof value === 'string' ? value : null
}

function getMetaBoolean(event: JournalEvent, key: string) {
  const value = event.meta?.[key]
  return typeof value === 'boolean' ? value : null
}

function EmptySection() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 text-sm text-[var(--text-muted)]">
      Ще не заповнено...
    </div>
  )
}

function SectionCard({
  title,
  icon,
  events,
  onOpenEvent,
}: {
  title: string
  icon: ReactNode
  events: JournalEvent[]
  onOpenEvent: (event: JournalEvent) => void
}) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[var(--bg-secondary)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[rgb(var(--accent-soft-rgb))]">{icon}</span>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
      </div>

      {events.length === 0 ? (
        <EmptySection />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const badgeMeta = getJournalBadgeMeta(event)
            const chips: string[] = []
            const completed = getMetaBoolean(event, 'completed')
            const skipped = getMetaBoolean(event, 'skipped')
            const expired = getMetaBoolean(event, 'expired')
            const sphere = getMetaString(event, 'sphere')
            const xp = getMetaNumber(event, 'xp')

            if (event.type === 'TASK') {
              if (skipped) chips.push('Пропущено')
              else if (expired) chips.push('Прострочено')
              else if (completed) chips.push('Виконано')
              else chips.push('Активно')
            }

            if (sphere) chips.push(sphere)
            if (xp > 0) chips.push(`+${xp} XP`)

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onOpenEvent(event)}
                className="w-full rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(var(--accent-rgb),0.18)] hover:bg-[rgba(255,255,255,0.03)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeMeta.badgeClassName}`}>
                        {badgeMeta.label}
                      </span>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
                    </div>

                    {chips.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                        {chips.map((chip) => (
                          <span
                            key={`${event.id}-${chip}`}
                            className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(event.date).toLocaleTimeString('uk-UA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DayDetails({ day, events }: DayDetailsProps) {
  const navigate = useNavigate()
  const formattedDay = parseDateKey(day).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const xpToday = events.reduce((sum, event) => sum + getMetaNumber(event, 'xp'), 0)
  const practicesCount = events.filter((event) => event.type === 'TASK' || event.type === 'REFLECTION').length
  const streakEvent = [...events].reverse().find((event) => event.type === 'STREAK')
  const streakValue = streakEvent ? getMetaNumber(streakEvent, 'current') : 0

  const morningReflection = events.filter(
    (event) => event.type === 'REFLECTION' && getMetaString(event, 'period') === 'morning',
  )
  const mentorSession = events.filter((event) => event.type === 'AI')
  const zoomSession = events.filter((event) => event.type === 'ZOOM')
  const eveningReflection = events.filter(
    (event) => event.type === 'REFLECTION' && getMetaString(event, 'period') === 'evening',
  )
  const taskEvents = events.filter((event) => event.type === 'TASK')
  const subscriptionEvents = events.filter((event) => event.type === 'SUBSCRIPTION')
  const reminderEvents = events.filter((event) => event.type === 'TG_REMINDER')

  const openEvent = (event: JournalEvent) => {
    if (event.type === 'REFLECTION') {
      const period = getMetaString(event, 'period')
      navigate(period === 'evening' ? buildCycleUrl('evening', day) : buildCycleUrl('morning', day))
      return
    }

    switch (event.type) {
      case 'TASK':
        navigate('/dashboard/microtasks')
        return
      case 'AI':
        navigate('/dashboard/ai-mentor')
        return
      case 'ZOOM':
        navigate('/dashboard/zoom')
        return
      case 'SUBSCRIPTION':
        navigate('/dashboard/products')
        return
      case 'STREAK':
        navigate('/dashboard/journal')
        return
      case 'TG_REMINDER':
        navigate('/dashboard/ai-mentor')
        return
      default:
        return
    }
  }

  return (
    <div className="dashboard-liquid-card h-full p-5 transition-all duration-300 ease-out xl:max-h-[calc(100vh-9rem)] xl:overflow-hidden">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
          Щоденник дня
        </p>
        <h3 className="mt-2 text-2xl font-black text-[var(--text-primary)]">{formattedDay}</h3>
      </div>

      <div className="space-y-5 xl:max-h-[calc(100vh-13rem)] xl:overflow-y-auto xl:pr-1">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.14)] bg-[linear-gradient(180deg,rgb(22_58_102_/_0.24),rgba(255,255,255,0.02)_26%,rgba(255,255,255,0.012)_100%)] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-2 text-[rgb(var(--accent-soft-rgb))]">
              <Sparkles className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">XP</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{xpToday}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Нараховано за день</p>
          </div>

          <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.14)] bg-[linear-gradient(180deg,rgb(22_58_102_/_0.24),rgba(255,255,255,0.02)_26%,rgba(255,255,255,0.012)_100%)] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-2 text-[rgb(var(--accent-soft-rgb))]">
              <ListTodo className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Практики</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{practicesCount}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Подій типу Task</p>
          </div>

          <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.14)] bg-[linear-gradient(180deg,rgb(22_58_102_/_0.24),rgba(255,255,255,0.02)_26%,rgba(255,255,255,0.012)_100%)] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-2 text-[rgb(var(--accent-soft-rgb))]">
              <Flame className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Streak</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{streakValue}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Поточна серія</p>
          </div>
        </div>

        <div className="space-y-4">
          <SectionCard title="Ранкова рефлексія" icon={<SunMedium className="h-4 w-4" />} events={morningReflection} onOpenEvent={openEvent} />
          <SectionCard title="Мікрозавдання" icon={<ListTodo className="h-4 w-4" />} events={taskEvents} onOpenEvent={openEvent} />
          <SectionCard title="Сесія з ментором" icon={<Bot className="h-4 w-4" />} events={mentorSession} onOpenEvent={openEvent} />
          <SectionCard title="Zoom сесія" icon={<Video className="h-4 w-4" />} events={zoomSession} onOpenEvent={openEvent} />
          <SectionCard title="Вечірній підсумок" icon={<MoonStar className="h-4 w-4" />} events={eveningReflection} onOpenEvent={openEvent} />
        </div>

        {subscriptionEvents.length > 0 || reminderEvents.length > 0 ? (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[var(--bg-secondary)] p-4">
            <div className="mb-2 flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Системні події</h4>
            </div>
            <div className="space-y-2">
              {subscriptionEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEvent(event)}
                  className="w-full rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-left text-sm text-[var(--text-primary)] transition-all duration-200 hover:border-[rgba(var(--accent-rgb),0.18)] hover:bg-[rgba(255,255,255,0.03)]"
                >
                  {event.title}
                </button>
              ))}
              {reminderEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEvent(event)}
                  className="w-full rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-left transition-all duration-200 hover:border-[rgba(var(--accent-rgb),0.18)] hover:bg-[rgba(255,255,255,0.03)]"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <BellRing className="h-4 w-4 text-cyan-300" />
                    {event.title}
                  </div>
                  {typeof event.meta?.preview === 'string' ? (
                    <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">{event.meta.preview}</p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
