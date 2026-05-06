import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useGetMyWeeklyReportQuery } from '@/features/ai-mentor/services/mentor.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import type { JournalDayState } from '@/features/journal/types'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'

interface ProgressPanelProps {
  dayStatesByDate: Record<string, JournalDayState>
}

function getWeekBars(dayStatesByDate: Record<string, JournalDayState>) {
  const entries = Object.values(dayStatesByDate).sort((left, right) => left.dateKey.localeCompare(right.dateKey))
  const last7 = entries.slice(-7)
  const maxXp = Math.max(1, ...last7.map(day => day.summary.xp || 0))

  return last7.map((day) => {
    const date = new Date(`${day.dateKey}T12:00:00`)
    const label = date.toLocaleDateString('uk-UA', { weekday: 'short' }).slice(0, 2).toUpperCase()
    const isToday = day.dateKey === new Date().toISOString().slice(0, 10)
    return {
      key: day.dateKey,
      label,
      value: day.summary.xp || 0,
      height: Math.max(10, Math.round(((day.summary.xp || 0) / maxXp) * 56)),
      isToday,
    }
  })
}

function getBarHeightClass(height: number) {
  if (height >= 56) return 'h-14'
  if (height >= 48) return 'h-12'
  if (height >= 40) return 'h-10'
  if (height >= 32) return 'h-8'
  if (height >= 24) return 'h-6'
  if (height >= 16) return 'h-4'
  return 'h-3'
}

export default function ProgressPanel({ dayStatesByDate }: ProgressPanelProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: summary } = useGetSummaryQuery(undefined, { skip: !user?.id })
  const { data: weeklyReport } = useGetMyWeeklyReportQuery(undefined, { skip: !user?.id })
  const { journeyMilestones, dayNumber } = useUserProgress()

  const weekBars = useMemo(() => getWeekBars(dayStatesByDate), [dayStatesByDate])
  const xpTotal = summary?.xp.total ?? 0
  const streak = summary?.streak.current ?? 0
  const cyclesCompleted = Math.max(0, dayNumber - 1)
  const mentorInsight = weeklyReport?.summaryText?.trim() || 'Ти тримаєш рух навіть у нерівний тиждень. Ритм ще нестабільний, але одна дія щодня вже тримає систему.'

  const statCards = [
    { label: 'День', value: String(dayNumber || 0), meta: `з 30` },
    { label: 'XP загалом', value: String(xpTotal), meta: `рівень ${summary?.xp.level ?? 1}` },
    { label: 'Streak', value: String(streak), meta: 'поновити' },
    { label: 'Циклів', value: String(cyclesCompleted), meta: `з ${Math.max(1, dayNumber)} днів` },
  ]

  return (
    <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] w-[220px] flex-shrink-0 overflow-y-auto border-l border-[rgba(255,255,255,0.08)] p-[14px] lg:block">
      <div className="space-y-[14px]">
        <section className="grid grid-cols-2 gap-3">
          {statCards.map(card => (
            <div key={card.label} className="rounded-[22px] border border-[rgba(255,255,255,0.05)] bg-[rgba(19,29,53,0.96)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">{card.label}</p>
              <p className="mt-2 text-[2rem] font-semibold leading-none text-[var(--text-primary)]">{card.value}</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{card.meta}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[22px] border border-[rgba(255,255,255,0.05)] bg-[rgba(19,29,53,0.96)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Активність тижня</p>
          <div className="mt-5 flex items-end justify-between gap-2">
            {weekBars.map(bar => (
              <div key={bar.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-16 items-end">
                  <span
                    className={[
                      'block w-4 rounded-full',
                      getBarHeightClass(bar.height),
                      bar.isToday ? 'bg-[rgb(96,165,250)]' : 'bg-[rgba(255,255,255,0.12)]',
                    ].join(' ')}
                  />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{bar.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-[rgba(255,255,255,0.05)] bg-[rgba(19,29,53,0.96)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Мій шлях</p>
          <div className="mt-4 space-y-0.5">
            {journeyMilestones.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => navigate(step.path)}
                className="flex w-full items-center gap-3 py-2 text-left"
              >
                <span className="relative flex h-6 w-3 items-center justify-center">
                  {index < journeyMilestones.length - 1 ? (
                    <span className="absolute left-1/2 top-4 h-6 w-px -translate-x-1/2 bg-[rgba(255,255,255,0.08)]" />
                  ) : null}
                  <span
                    className={[
                      'relative z-10 h-3 w-3 rounded-full',
                      step.status === 'done'
                        ? 'bg-[var(--color-success)]'
                        : step.status === 'active'
                          ? 'bg-[rgb(96,165,250)]'
                          : 'bg-[rgba(255,255,255,0.18)]',
                    ].join(' ')}
                  />
                </span>
                <span className="text-sm text-[var(--text-secondary)]">{step.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-[rgba(118,88,255,0.24)] bg-[rgba(19,29,53,0.96)] p-4">
          <div className="border-l-2 border-[rgb(168,85,247)] pl-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(192,132,252)]">Погляд ментора</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-primary)]">{mentorInsight}</p>
          </div>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard/journal')}
              className="w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Подивись слабкі місця тижня
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/cycle')}
              className="w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Заплануй головну дію на завтра
            </button>
          </div>
        </section>
      </div>
    </aside>
  )
}
