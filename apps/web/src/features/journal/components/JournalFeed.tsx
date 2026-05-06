import { Bot, CalendarCheck2, ListTodo, MoonStar, Sparkles, SunMedium, Video } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import type { JournalDayState, JournalEvent } from '@/features/journal/types'
import WeekStrip from '@/features/journal/components/WeekStrip'
import {
  getFeedSections,
  getJournalEventChips,
  getJournalEventSubtitle,
  getJournalEventTitle,
  getJournalEventXp,
} from '@/features/journal/components/journalFeed.utils'

type Props = {
  dayStatesByDate: Record<string, JournalDayState>
  selectedDay: string
  onSelectDay: (day: string) => void
}

function getEventIcon(event: JournalEvent) {
  if (event.type === 'REFLECTION') {
    return typeof event.meta?.period === 'string' && event.meta.period === 'evening'
      ? <MoonStar className="h-5 w-5" />
      : <SunMedium className="h-5 w-5" />
  }
  if (event.type === 'TASK') return <ListTodo className="h-5 w-5" />
  if (event.type === 'ZOOM') return <Video className="h-5 w-5" />
  if (event.type === 'AI') return <Bot className="h-5 w-5" />
  if (event.type === 'SUBSCRIPTION') return <Sparkles className="h-5 w-5" />
  return <CalendarCheck2 className="h-5 w-5" />
}

function buildCycleUrl(session: 'morning' | 'evening', dayKey: string) {
  const todayKey = new Date().toISOString().slice(0, 10)
  const datePart = dayKey === todayKey ? '' : `&date=${dayKey}`
  return `/dashboard/cycle?session=${session}${datePart}`
}

export default function JournalFeed({ dayStatesByDate, selectedDay, onSelectDay }: Props) {
  const navigate = useNavigate()
  const sections = useMemo(() => getFeedSections(dayStatesByDate, selectedDay), [dayStatesByDate, selectedDay])

  const openEvent = (event: JournalEvent, dayKey: string) => {
    if (event.type === 'REFLECTION') {
      const period = typeof event.meta?.period === 'string' && event.meta.period === 'evening' ? 'evening' : 'morning'
      navigate(buildCycleUrl(period, dayKey))
      return
    }

    switch (event.type) {
      case 'TASK':
        navigate(`/dashboard/microtasks?date=${dayKey}`)
        return
      case 'AI':
      case 'TG_REMINDER':
        navigate('/dashboard/ai-mentor')
        return
      case 'ZOOM':
        navigate('/dashboard/sessions')
        return
      case 'SUBSCRIPTION':
        navigate('/dashboard/subscription')
        return
      default:
        navigate('/dashboard/journal')
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <WeekStrip selectedDay={selectedDay} daysByDate={dayStatesByDate} onSelectDay={onSelectDay} />

      <div className="mt-7 space-y-6">
        {sections.map((section) => (
          <div key={section.id} className="space-y-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/42">
              {section.label}
            </p>

            <div className="space-y-4">
              {section.events.map((event) => {
                const chips = getJournalEventChips(event)
                const xp = getJournalEventXp(event)
                const timeLabel = new Date(event.date).toLocaleTimeString('uk-UA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openEvent(event, section.dateKey)}
                    className="w-full rounded-[24px] border border-[rgba(255,255,255,0.05)] bg-[rgba(19,29,53,0.96)] px-5 py-5 text-left transition-all duration-200 hover:border-[rgba(var(--accent-rgb),0.18)] hover:bg-[rgba(24,35,62,0.98)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.04)] text-[rgb(var(--accent-soft-rgb))]">
                          {getEventIcon(event)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {chips.map((chip) => (
                              <span
                                key={`${event.id}-${chip}`}
                                className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.05)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>

                          <h3 className="mt-2 text-[1.05rem] font-semibold leading-6 text-[var(--text-primary)]">
                            {getJournalEventTitle(event)}
                          </h3>
                          <p className="mt-1 max-w-2xl text-[0.95rem] leading-6 text-[var(--text-secondary)]">
                            {getJournalEventSubtitle(event)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 flex-col items-end gap-3">
                        <span className="text-sm text-[var(--text-muted)]">{timeLabel}</span>
                        {xp > 0 ? (
                          <span className="rounded-full border border-emerald-400/22 bg-emerald-500/18 px-3 py-1.5 text-sm font-semibold text-emerald-300">
                            +{xp} XP
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
