import type { MicroTask } from '../types/types'
import { MicroTaskCard } from './MicroTaskCard'

interface Props {
  tasks: MicroTask[]
  onComplete: (taskId: string) => void
  onSkip?: (taskId: string) => void
  title?: string
}

export function MicroTaskList({ tasks, onComplete, onSkip, title }: Props) {
  const active = tasks.filter(t => (t.status ?? 'PENDING') === 'PENDING')
  const completed = tasks.filter(t => t.status === 'COMPLETED')
  const skipped = tasks.filter(t => t.status === 'skipped')

  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Мікрозавдання з&apos;являться після ранкової сесії
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted-light)]">
          AI Асистент сформує їх на основі твоїх відповідей
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {title && (
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          {title}
        </p>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map(task => (
            <MicroTaskCard
              key={task.id}
              task={task}
              onComplete={() => onComplete(task.id)}
              onSkip={onSkip ? () => onSkip(task.id) : undefined}
            />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Виконано · {completed.length}
          </p>
          {completed.map(task => (
            <MicroTaskCard
              key={task.id}
              task={task}
              onComplete={() => {}}
            />
          ))}
        </div>
      )}

      {skipped.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            Пропущено · {skipped.length}
          </summary>
          <div className="mt-2 space-y-2">
            {skipped.map(task => (
              <MicroTaskCard
                key={task.id}
                task={task}
                onComplete={() => onComplete(task.id)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export default MicroTaskList
