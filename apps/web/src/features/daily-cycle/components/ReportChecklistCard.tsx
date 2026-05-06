import { GlassCard } from '@/ui'

import { SECTION_EYEBROW_CLASS } from '@/features/daily-cycle/types/reportsTab.constants'

type Props = {
  latestDayEntry: { date: string } | null
  latestDayDateKey: string | null
  morningCount: number
  eveningCount: number
  completedTasks: number
  missedTasks: number
}

export function ReportChecklistCard({
  latestDayEntry,
  latestDayDateKey,
  morningCount,
  eveningCount,
  completedTasks,
  missedTasks,
}: Props) {
  const checklist = [
    { label: 'Ранок зафіксовано', done: morningCount > 0 },
    { label: 'Вечір завершено', done: eveningCount > 0 },
    { label: 'Є виконані мікрозавдання', done: completedTasks > 0 },
    { label: 'Є день для розбору', done: Boolean(latestDayEntry) },
  ]

  return (
    <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={SECTION_EYEBROW_CLASS}>Контрольна картка</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Швидка перевірка, чи є достатньо даних для чесного тижневого і місячного зрізу.
          </p>
        </div>
        <div className="text-right text-xs text-[var(--text-muted)]">
          <p>Останній день у фокусі</p>
          <p className="mt-1 font-semibold text-[var(--text-primary)]">{latestDayDateKey ?? '—'}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {checklist.map(item => (
          <div
            key={item.label}
            className={[
              'rounded-[18px] border px-4 py-3 text-sm',
              item.done
                ? 'border-[rgba(29,158,117,0.18)] bg-[rgba(29,158,117,0.08)] text-[var(--text-primary)]'
                : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[var(--text-secondary)]',
            ].join(' ')}
          >
            <p className="font-medium">{item.label}</p>
            <p className="mt-2 text-xs">{item.done ? 'Є в історії' : 'Ще бракує даних'}</p>
          </div>
        ))}
      </div>

      {missedTasks > 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          У цьому вікні є {missedTasks} незавершених або пропущених задач. Це нормально, але варто врахувати при читанні звітів.
        </p>
      ) : null}
    </GlassCard>
  )
}
