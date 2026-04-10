import { useMemo } from 'react'

import { useGetDailyHistoryQuery } from '../services/daily.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'

type CyclePausedProps = {
  onRecover: (dateKey: string, session: 'morning' | 'evening') => void
  onOpenProgress: () => void
}

function toDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function formatDateLabel(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
  })
}

export default function CyclePaused({ onRecover, onOpenProgress }: CyclePausedProps) {
  const { data: trial } = useGetTrialStatusQuery()
  const { data: history = [] } = useGetDailyHistoryQuery()

  const days = useMemo(() => {
    const start = trial?.startedAt ? new Date(trial.startedAt) : new Date()
    const totalDays = 7

    return Array.from({ length: totalDays }, (_, index) => {
      const date = addDays(start, index)
      const key = toDateKey(date)
      const entry = history.find(item => toDateKey(item.date) === key)
      const content = entry?.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
        ? entry.content as Record<string, unknown>
        : null

      return {
        dateKey: key,
        label: formatDateLabel(key),
        morningDone: Boolean(content?.morning && typeof content.morning === 'object'),
        eveningDone: Boolean(content?.evening && typeof content.evening === 'object'),
      }
    })
  }, [history, trial?.startedAt])

  const missedDays = days.filter(day => !day.morningDone || !day.eveningDone)
  const completedDays = Math.max(0, days.length - missedDays.length)
  const firstMissed = missedDays[0] ?? days[0]
  const progress = days.length ? Math.round((completedDays / days.length) * 100) : 0
  const recoverySession: 'morning' | 'evening' = firstMissed?.morningDone ? 'evening' : 'morning'

  return (
    <div className="dashboard-liquid-card--soft overflow-hidden border border-[rgba(248,113,113,0.28)] bg-[rgba(248,113,113,0.06)]">
      <div className="border-b border-[rgba(248,113,113,0.18)] bg-[linear-gradient(180deg,rgba(248,113,113,0.18),rgba(255,255,255,0.02))] p-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[rgb(248,113,113)]">
          ПАУЗА ЦИКЛУ
        </p>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Продовж з місця де зупинився
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          День {completedDays} з {days.length} · {missedDays.length} пропущено
        </p>
        <div className="mt-4 h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
          <div
            className="h-full rounded-full bg-[rgb(248,113,113)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-liquid-dashboard btn-liquid-dashboard--primary"
            onClick={() => onRecover(firstMissed?.dateKey ?? toDateKey(new Date()), recoverySession)}
          >
            ⏩ Надолужити пропущені дні
          </button>
          <button
            type="button"
            className="btn-liquid-dashboard btn-liquid-dashboard--ice"
            onClick={onOpenProgress}
          >
            Переглянути мій прогрес
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Пропущені дні
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {missedDays.map(day => (
              <div
                key={day.dateKey}
                className="rounded-xl border border-[rgba(248,113,113,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[var(--text-secondary)]"
              >
                {day.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
