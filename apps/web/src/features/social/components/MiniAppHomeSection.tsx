import { BookOpen, Bot, Gem } from 'lucide-react'

import GameBadge from '@/components/miniapp/GameBadge'
import MiniAppJournalSection from '@/features/social/components/MiniAppJournalSection'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'

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
  const { tasks, completeTask, updateStep } = useMicroTasks()
  const activeTasks = tasks.filter(task => task.status === 'PENDING').slice(0, 3)

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

        <MiniAppJournalSection showHeader={false} />

        {activeTasks.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Активні завдання</p>
                <p className="text-xs text-[var(--text-muted)]">AI оновлює їх автоматично після ранкової сесії</p>
              </div>
              <span className="rounded-full bg-[rgba(var(--accent-rgb),0.16)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
                {activeTasks.length}
              </span>
            </div>

            <div className="space-y-2">
              {activeTasks.map(task => (
                <div key={task.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{task.title}</p>
                      {task.why && (
                        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{task.why}</p>
                      )}
                    </div>
                    {task.xpReward ? (
                      <span className="text-[10px] font-semibold text-[var(--accent)]">+{task.xpReward} XP</span>
                    ) : null}
                  </div>
                  {task.steps?.length ? (
                    <div className="space-y-1.5">
                      {task.steps.slice(0, 2).map((step, index) => {
                        const done = Boolean(task.stepsCompleted?.[index])
                        return (
                          <button
                            key={`${task.id}-${index}`}
                            type="button"
                            onClick={() => { void updateStep(task.id, index, !done) }}
                            className="flex w-full items-start gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2 text-left text-xs text-[var(--text-secondary)]"
                          >
                            <span className="mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded border border-[var(--border)] text-[10px]">
                              {done ? '✓' : index + 1}
                            </span>
                            <span className={done ? 'line-through opacity-70' : ''}>{step}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { void completeTask(task.id) }}
                    className="hero-cta-secondary mt-3 w-full py-2.5 text-xs"
                  >
                    Виконано ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
