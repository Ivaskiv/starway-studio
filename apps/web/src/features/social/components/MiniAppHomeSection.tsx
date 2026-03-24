import { BookOpen, Bot, Gem } from 'lucide-react'

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
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'BITMIND', value: profileBitMind },
              { label: 'Streak', value: profileStreak },
              { label: 'Рівень', value: profileLevel },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-2 text-center"
              >
                <p className="text-base font-bold text-[var(--accent)]">{item.value}</p>
                <p className="mt-0.5 text-[9px] text-[var(--text-muted)]">{item.label}</p>
              </div>
            ))}
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
              <p className="text-xs text-[var(--text-muted)]">{trialDay}/100 · 5 граней розвитку</p>
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
