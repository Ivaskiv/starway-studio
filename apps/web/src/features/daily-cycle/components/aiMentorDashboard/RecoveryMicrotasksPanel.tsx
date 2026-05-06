import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'

type Props = {
  dateLabel: string
  tasks: MicroTaskItem[]
  onAddTask: () => void
  onCompleteTask: (taskId: string) => void
  onSkipTask: (taskId: string) => void
  onContinueToEvening: () => void
}

function getManualUiStatus(task: MicroTaskItem) {
  const meta = task.meta
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const value = meta.uiStatus
  return typeof value === 'string' ? value : null
}

function getRecoveryTaskStatus(task: MicroTaskItem) {
  const manualUiStatus = getManualUiStatus(task)
  if (task.status === 'COMPLETED' || manualUiStatus === 'done') return 'done'
  if (task.status === 'skipped' || task.status === 'expired' || manualUiStatus === 'skipped') return 'skipped'
  return 'active'
}

function RecoveryTaskCard({
  task,
  onComplete,
  onSkip,
}: {
  task: MicroTaskItem
  onComplete: () => void
  onSkip: () => void
}) {
  const status = getRecoveryTaskStatus(task)
  const statusLabel = status === 'done' ? 'Виконано' : status === 'skipped' ? 'Пропущено' : 'Очікує фіксації'
  const statusClass = status === 'done'
    ? 'border-[rgba(29,158,117,0.24)] bg-[rgba(29,158,117,0.12)] text-[#7DE2BE]'
    : status === 'skipped'
      ? 'border-[rgba(242,178,75,0.24)] bg-[rgba(242,178,75,0.12)] text-[#F2B24B]'
      : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]'

  return (
    <div className="rounded-[22px] border border-[rgba(242,178,75,0.22)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{task.title}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Власна мікродія за вчорашній день
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {status === 'active' ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-liquid-dashboard btn-liquid-dashboard--primary flex-1"
            onClick={onComplete}
          >
            Виконано
          </button>
          <button
            type="button"
            className="btn-liquid-dashboard btn-liquid-dashboard--ice flex-1"
            onClick={onSkip}
          >
            Пропущено
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function RecoveryMicrotasksPanel({
  dateLabel,
  tasks,
  onAddTask,
  onCompleteTask,
  onSkipTask,
  onContinueToEvening,
}: Props) {
  const resolvedCount = tasks.filter(task => getRecoveryTaskStatus(task) !== 'active').length
  const unresolvedCount = tasks.length - resolvedCount

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[rgba(242,178,75,0.24)] bg-[rgba(242,178,75,0.08)] px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2B24B]">
          Дозавершення вчорашнього дня
        </p>
        <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
          Мікродії за {dateLabel}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Тут не генеруються AI-завдання. Зафіксуй лише свою реальну мікродію за вчора і познач, чи вона виконана, чи пропущена.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="btn-liquid-dashboard btn-liquid-dashboard--primary"
          onClick={onAddTask}
        >
          + Додати свою мікродію
        </button>
        <button
          type="button"
          className="btn-liquid-dashboard btn-liquid-dashboard--ice"
          onClick={onContinueToEvening}
        >
          Жодної — перейти до вечора
        </button>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map(task => (
            <RecoveryTaskCard
              key={task.id}
              task={task}
              onComplete={() => onCompleteTask(task.id)}
              onSkip={() => onSkipTask(task.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[rgba(242,178,75,0.24)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-[var(--text-secondary)]">
          Ще не додано жодної мікродії за вчора. Можеш додати одну свою дію або свідомо перейти до вечора.
        </div>
      )}

      <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        {unresolvedCount > 0
          ? `Залишилось зафіксувати ${unresolvedCount} мікродію(ї), після цього переходь до вечірньої сесії.`
          : 'Мікродії зафіксовано. Можна переходити до вечірньої сесії за вчорашній день.'}
      </div>
    </div>
  )
}
