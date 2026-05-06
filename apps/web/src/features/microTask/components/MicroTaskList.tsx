import { useEffect, useMemo, useState } from 'react'

import { InfoHint } from '@/ui'
import { getMicroTaskSphereMeta } from '../utils/sphereMeta'
import type { MicroTask } from '../types/types'
import { MicroTaskCard } from './MicroTaskCard'

interface Props {
  tasks: MicroTask[]
  onComplete: (taskId: string) => void
  onSkip?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onEdit?: (taskId: string) => void
  onSetProgress?: (taskId: string, progressPercent: number) => void
  onToggleStep?: (taskId: string, stepIndex: number, done: boolean) => void
  title?: string
  pageSize?: number
  isLoading?: boolean
  activeEmptyText?: string
  xpBadgeText?: string | null
}

type TaskStatusFilter = 'active' | 'done' | 'missed' | 'all'

const STATUS_FILTERS: Array<{ value: TaskStatusFilter; label: string }> = [
  { value: 'active', label: 'Активні' },
  { value: 'done', label: 'Виконані' },
  { value: 'missed', label: 'Пропущені' },
  { value: 'all', label: 'Усі' },
]

function matchesStatus(task: MicroTask, status: TaskStatusFilter) {
  const normalized = task.status ?? 'PENDING'
  if (status === 'all') return true
  if (status === 'active') return normalized === 'PENDING' || normalized === 'manual'
  if (status === 'done') return normalized === 'COMPLETED'
  return normalized === 'skipped' || normalized === 'expired'
}

function getTaskDayKey(task: MicroTask) {
  const source = task.createdAt ?? task.dueAt ?? task.completedAt ?? task.expiresAt ?? null
  return source ? source.slice(0, 10) : null
}

function compareTasks(left: MicroTask, right: MicroTask) {
  const today = new Date().toISOString().slice(0, 10)
  const leftIsToday = getTaskDayKey(left) === today
  const rightIsToday = getTaskDayKey(right) === today

  if (leftIsToday !== rightIsToday) {
    return leftIsToday ? -1 : 1
  }

  const leftTime = new Date(left.completedAt ?? left.createdAt ?? left.dueAt ?? 0).getTime()
  const rightTime = new Date(right.completedAt ?? right.createdAt ?? right.dueAt ?? 0).getTime()
  return rightTime - leftTime
}

export function MicroTaskList({
  tasks,
  onComplete,
  onSkip,
  onDelete,
  onEdit,
  onSetProgress,
  onToggleStep,
  title,
  pageSize = 6,
  isLoading = false,
  activeEmptyText = 'Задачі ще формуються AI після ранкової сесії',
  xpBadgeText,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('active')
  const [sphereFilter, setSphereFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const sphereOptions = useMemo(() => {
    const seen = new Set<string>()
    const options = [{ value: 'all', label: 'Усі категорії' }]

    for (const task of tasks) {
      const sphere = task.sphere ?? 'other'
      if (seen.has(sphere)) continue
      seen.add(sphere)
      options.push({
        value: sphere,
        label: getMicroTaskSphereMeta(task.sphere).label,
      })
    }

    return options
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!matchesStatus(task, statusFilter)) return false
      if (sphereFilter !== 'all' && (task.sphere ?? 'other') !== sphereFilter) return false
      return true
    }).sort(compareTasks)
  }, [tasks, statusFilter, sphereFilter])

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  const pagedTasks = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTasks.slice(start, start + pageSize)
  }, [filteredTasks, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, sphereFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  return (
    <div className="w-full space-y-4">
      {title ? (
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            {title}
          </p>
          <InfoHint
            label="Фільтри мікрозавдань"
            description="Фільтруй список за статусом або категорією, якщо задач стає більше."
            instruction="Активні задачі варто тримати в центрі уваги, а виконані й пропущені переглядати окремо без перевантаження списку."
            align="left"
          />
        </div>
      ) : null}

      <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map(filter => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.value)
                  if (filter.value === 'all') {
                    setSphereFilter('all')
                  }
                }}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  statusFilter === filter.value
                    ? 'border-[#378ADD] bg-[rgba(55,138,221,0.14)] text-[#73B6FF] shadow-[0_0_0_1px_rgba(55,138,221,0.14)]'
                    : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {sphereOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSphereFilter(option.value)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs transition-colors',
                  sphereFilter === option.value
                    ? 'border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)]'
                    : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {!isLoading ? (
        <div className="count-row">
          <span className="text-xs text-[var(--text-muted)]">
            Показано {filteredTasks.length} з {tasks.length}
          </span>
          <div className="flex items-center gap-3">
            {xpBadgeText ? (
              <span className="rounded-full border border-[rgba(239,159,39,0.24)] bg-[rgba(239,159,39,0.12)] px-3 py-1 text-xs font-semibold text-[#F2B24B]">
                {xpBadgeText}
              </span>
            ) : null}
            <span className="text-xs text-[var(--text-muted)]">
              Сторінка {page} з {totalPages}
            </span>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`microtask-skeleton-${index}`}
              className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
            >
              <div className="animate-pulse space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-[rgba(255,255,255,0.08)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded-full bg-[rgba(255,255,255,0.08)]" />
                    <div className="h-5 w-3/4 rounded-full bg-[rgba(255,255,255,0.08)]" />
                    <div className="h-3 w-2/3 rounded-full bg-[rgba(255,255,255,0.06)]" />
                    <div className="h-3 w-1/2 rounded-full bg-[rgba(255,255,255,0.06)]" />
                  </div>
                </div>
                <div className="border-t border-[rgba(255,255,255,0.06)] pt-3">
                  <div className="h-3 w-40 rounded-full bg-[rgba(255,255,255,0.06)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : pagedTasks.length > 0 ? (
        <div className="grid gap-3">
          {pagedTasks.map(task => (
            <MicroTaskCard
              key={task.id}
              task={task}
              onComplete={() => onComplete(task.id)}
              onSkip={onSkip ? () => onSkip(task.id) : undefined}
              onDelete={onDelete ? () => onDelete(task.id) : undefined}
              onEdit={onEdit ? () => onEdit(task.id) : undefined}
              onSetProgress={onSetProgress ? (progressPercent) => onSetProgress(task.id, progressPercent) : undefined}
              onToggleStep={onToggleStep ? (stepIndex, done) => onToggleStep(task.id, stepIndex, done) : undefined}
            />
          ))}
        </div>
      ) : statusFilter === 'active' ? (
        <p className="px-1 text-sm text-[var(--text-muted)]">
          {activeEmptyText}
        </p>
      ) : (
        <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-muted)]">
          Під цей фільтр зараз немає задач. Спробуй інший статус або іншу категорію.
        </div>
      )}

      {!isLoading && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <button
            type="button"
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40"
          >
            ← Попередня
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40"
          >
            Наступна →
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default MicroTaskList
