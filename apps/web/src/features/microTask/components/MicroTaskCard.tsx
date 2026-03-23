import type { MicroTask, MicroTaskStatus } from '../types/types'

const STATUS_CONFIG: Record<
  MicroTaskStatus,
  {
    label: string
    className: string
    dotClass: string
  }
> = {
  PENDING: {
    label: 'Виконати',
    className: 'bg-[var(--bg-tertiary)] text-[var(--accent)]',
    dotClass: 'bg-[var(--accent)]',
  },
  COMPLETED: {
    label: '✓ Виконано',
    className: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    dotClass: 'bg-[var(--color-success)]',
  },
  skipped: {
    label: 'Пропущено',
    className: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
    dotClass: 'bg-[var(--text-muted)]',
  },
}

const REASON_ICON: Record<string, string> = {
  low_score: '📉',
  instability: '⚡',
  growth: '🌱',
  wheel_gap: '⚖️',
  stagnation: '🔄',
  aiMentor: '🤖',
  questionsScheduler: '📋',
  manual: '✍️',
}

interface Props {
  task: MicroTask
  onComplete: () => void
  onSkip?: () => void
}

export function MicroTaskCard({ task, onComplete, onSkip }: Props) {
  const status = task.status ?? 'PENDING'
  const cfg = STATUS_CONFIG[status]
  const icon = REASON_ICON[task.reason ?? task.source ?? ''] ?? '🎯'
  const isActive = status === 'PENDING'

  const expiresAt = task.expiresAt ? new Date(task.expiresAt) : null
  const now = new Date()
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null

  const isUrgent = daysLeft !== null && daysLeft <= 1 && isActive

  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border transition-all',
        isActive
          ? 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[rgba(var(--accent-rgb),0.3)]'
          : 'border-[var(--border)] bg-[var(--bg-tertiary)] opacity-70',
      ].join(' ')}
    >
      {isUrgent && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--accent)]" />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--bg-tertiary)] text-base">
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p
                className={[
                  'text-sm font-medium leading-snug',
                  isActive
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] line-through',
                ].join(' ')}
              >
                {task.title}
              </p>
              <span
                className={[
                  'flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  cfg.className,
                ].join(' ')}
              >
                {cfg.label}
              </span>
            </div>

            {task.description && isActive && (
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {task.description}
              </p>
            )}

            <div className="mt-2 flex items-center gap-3">
              {task.wheelImpact && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  ⚖️ {task.wheelImpact.area}
                </span>
              )}
              {daysLeft !== null && isActive && (
                <span
                  className={[
                    'text-[10px]',
                    isUrgent
                      ? 'font-medium text-[var(--accent)]'
                      : 'text-[var(--text-muted)]',
                  ].join(' ')}
                >
                  {daysLeft === 0
                    ? 'Сьогодні останній день'
                    : `${daysLeft} дн. залишилось`}
                </span>
              )}
              {task.completedAt && !isActive && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {new Date(task.completedAt).toLocaleDateString('uk')}
                </span>
              )}
            </div>
          </div>
        </div>

        {isActive && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onComplete}
              className="flex-1 rounded-xl bg-[var(--accent)] py-2 text-xs font-medium text-white transition-all hover:brightness-110"
            >
              ✓ Виконано
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                Пропустити
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MicroTaskCard
