import { BookOpen, Bot, Gem } from 'lucide-react'

import GameBadge from '@/components/miniapp/GameBadge'
import EventList from '@/features/journal-mini/components/EventList'
import WeeklyStrip from '@/features/journal-mini/components/WeeklyStrip'
import { useWeeklyJournal } from '@/features/journal-mini/hooks/useWeeklyJournal'

interface MiniAppHomeSectionProps {
  hasAccess: boolean
  profileBitMind: number
  profileLevel: number
  profileStreak: number
  trialDay: number
  trackerProgress: number
  onOpenMentor: () => void
  onOpenTracker: () => void
  onOpenLibrary: () => void
}

export default function MiniAppHomeSection({
  hasAccess,
  profileBitMind,
  profileLevel,
  profileStreak,
  trialDay,
  trackerProgress,
  onOpenMentor,
  onOpenTracker,
  onOpenLibrary,
}: MiniAppHomeSectionProps) {
  const { days, eventsByDate, selectedDay, setSelectedDay } = useWeeklyJournal()
  const selectedDate = new Date(`${selectedDay}T12:00:00`)
  const selectedDayLabel = selectedDate.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
  })
  const selectedEvents = eventsByDate[selectedDay] ?? []

  return (
    <div className="space-y-3 px-4 pt-5">
      {!hasAccess && (
        <button
          type="button"
          onClick={onOpenMentor}
          className="hero-cta-primary w-full rounded-2xl py-3.5 text-sm font-semibold"
        >
          Почати безкоштовно
        </button>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <GameBadge label="BITMIND" value={profileBitMind} variant="xp" />
          <GameBadge label="Streak" value={profileStreak} variant="streak" />
          <GameBadge label="Рівень" value={profileLevel} variant="level" />
        </div>

        <WeeklyStrip
          days={days}
          eventsByDate={eventsByDate}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        <EventList dayLabel={selectedDayLabel} events={selectedEvents} />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="btn-icon h-11 w-11 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Асистент</p>
              <p className="text-xs text-[var(--text-muted)]">Персональний асистент</p>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-xs text-[var(--text-muted)]">
            Асистент уже бачить твій рівень, streak і прогрес AI Mentor.
          </div>
        </div>

        <button
          type="button"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-left"
          onClick={onOpenTracker}
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="btn-icon h-11 w-11 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
              <Gem className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Трекер Ювеліра</p>
              <p className="text-xs text-[var(--text-muted)]">{trialDay}/7 · AI Mentor progress</p>
            </div>
          </div>
          <progress
            className="miniapp-progressbar"
            value={trackerProgress}
            max={100}
            aria-label="Прогрес трекера"
          />
        </button>

        <button
          type="button"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-left"
          onClick={onOpenLibrary}
        >
          <div className="flex items-center gap-3">
            <span className="btn-icon h-11 w-11 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Лабораторія</p>
              <p className="text-xs text-[var(--text-muted)]">Матеріали та курси</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
