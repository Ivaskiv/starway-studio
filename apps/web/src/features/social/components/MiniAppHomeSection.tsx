import { BookOpen, Bot, Gem } from 'lucide-react'
import { useMemo, useState } from 'react'

import GameBadge from '@/components/miniapp/GameBadge'
import { GAMIFICATION_GLOSSARY } from '@/features/gamification/content/gamificationGlossary'
import MiniAppJournalSection from '@/features/social/components/MiniAppJournalSection'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { getMicroTaskSphereMeta } from '@/features/microTask/utils/sphereMeta'

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
  const { tasks, completeTask } = useMicroTasks()
  const [taskPage, setTaskPage] = useState(1)
  const [taskSphereFilter, setTaskSphereFilter] = useState('all')
  const activeTasks = tasks.filter(task => task.status === 'PENDING')
  const taskSphereOptions = useMemo(() => {
    const seen = new Set<string>()
    const options = [{ value: 'all', label: 'Усі' }]
    for (const task of activeTasks) {
      const sphere = task.sphere ?? 'other'
      if (seen.has(sphere)) continue
      seen.add(sphere)
      options.push({
        value: sphere,
        label: getMicroTaskSphereMeta(task.sphere).label,
      })
    }
    return options
  }, [activeTasks])
  const filteredActiveTasks = useMemo(() => {
    return activeTasks.filter(task => taskSphereFilter === 'all' || (task.sphere ?? 'other') === taskSphereFilter)
  }, [activeTasks, taskSphereFilter])
  const taskPageSize = 3
  const totalTaskPages = Math.max(1, Math.ceil(filteredActiveTasks.length / taskPageSize))
  const visibleActiveTasks = filteredActiveTasks.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize)

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
          <GameBadge
            label="BITMIND"
            value={profileBitMind}
            variant="xp"
            description={GAMIFICATION_GLOSSARY.bitmind.description}
            instruction={GAMIFICATION_GLOSSARY.bitmind.instruction}
          />
          <GameBadge
            label="Ритм"
            value={profileStreak}
            variant="streak"
            description={GAMIFICATION_GLOSSARY.streak.description}
            instruction={GAMIFICATION_GLOSSARY.streak.instruction}
          />
          <GameBadge
            label="Рівень"
            value={profileLevel}
            variant="level"
            description={GAMIFICATION_GLOSSARY.level.description}
            instruction={GAMIFICATION_GLOSSARY.level.instruction}
          />
        </div>

        <MiniAppJournalSection showHeader={false} />

        {activeTasks.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Активні завдання</p>
                <p className="text-xs text-[var(--text-muted)]">Система оновлює їх автоматично після ранкової сесії</p>
              </div>
              <span className="rounded-full bg-[rgba(var(--accent-rgb),0.16)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
                {activeTasks.length}
              </span>
            </div>

            {taskSphereOptions.length > 1 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {taskSphereOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setTaskSphereFilter(option.value)
                      setTaskPage(1)
                    }}
                    className={[
                      'rounded-full border px-2.5 py-1 text-[10px] transition-colors',
                      taskSphereFilter === option.value
                        ? 'border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.12)] text-[var(--text-primary)]'
                        : 'border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="space-y-2">
              {visibleActiveTasks.map(task => (
                <div key={task.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{task.title}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                        {getMicroTaskSphereMeta(task.sphere).emoji} {getMicroTaskSphereMeta(task.sphere).label}
                      </p>
                      {task.schedule?.isMultiDay && task.schedule.label ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                          {task.schedule.label}
                        </p>
                      ) : null}
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
                          <div
                            key={`${task.id}-${index}`}
                            className="flex w-full items-start gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2 text-left text-xs text-[var(--text-secondary)]"
                          >
                            <span className="mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded border border-[var(--border)] text-[10px]">
                              {done ? '✓' : index + 1}
                            </span>
                            <span className={done ? 'line-through opacity-70' : ''}>{step}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { void completeTask(task.id) }}
                    className="mt-3 w-full rounded-xl bg-[rgb(255,173,74)] py-2.5 text-xs font-semibold text-[#231a08] transition-all hover:brightness-105"
                  >
                    Виконати
                  </button>
                </div>
              ))}
            </div>

            {totalTaskPages > 1 ? (
              <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <button
                  type="button"
                  onClick={() => setTaskPage(current => Math.max(1, current - 1))}
                  disabled={taskPage === 1}
                  className="rounded-full border border-[var(--border)] px-2.5 py-1 disabled:opacity-40"
                >
                  ← Назад
                </button>
                <span>{taskPage}/{totalTaskPages}</span>
                <button
                  type="button"
                  onClick={() => setTaskPage(current => Math.min(totalTaskPages, current + 1))}
                  disabled={taskPage === totalTaskPages}
                  className="rounded-full border border-[var(--border)] px-2.5 py-1 disabled:opacity-40"
                >
                  Далі →
                </button>
              </div>
            ) : null}
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
            Асистент уже бачить твій рівень, streak і прогрес ABsystem.
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
              <p className="text-xs text-[var(--text-muted)]">{trialDay}/7 · ABsystem progress</p>
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
