import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetTodayEntryQuery, useGetDailyHistoryQuery } from '@/features/daily-cycle/services/daily.api'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { useGetActiveMicroTasksQuery } from '@/features/microTask/api/api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { clampTrialDay, getTrialCompletionPercent, getTrialDaysLeft, TRIAL_TOTAL_DAYS } from '@/features/trial/utils/trialProgress'
import { useGetWheelHistoryQuery } from '@/features/wheel/services/wheel.api'
import { GlassCard } from '@/ui'
import { BarChart3, CheckCircle2, CircleDashed, Flame, ListTodo, Moon, Sparkles, SunMedium } from 'lucide-react'

interface MentorProgressContentProps {
  compact?: boolean
}

type DailyContent = {
  morning?: Record<string, string>
  evening?: Record<string, string>
}

export default function MentorProgressContent({
  compact = false,
}: MentorProgressContentProps) {
  const { user } = useAuth()
  const { accessControl } = useSystemState()
  const userId = user?.id ?? ''
  const { data: summary } = useGetSummaryQuery(undefined, { skip: !userId })
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const { data: todayEntry } = useGetTodayEntryQuery(undefined, { skip: !userId || accessControl?.hasRequiredContacts === false })
  const { data: dailyHistory = [] } = useGetDailyHistoryQuery(undefined, { skip: !userId || accessControl?.hasRequiredContacts === false })
  const { data: wheelHistory = [] } = useGetWheelHistoryQuery({ userId, limit: 12 }, { skip: !userId || accessControl?.hasRequiredContacts === false })
  const { data: microTasks = [] } = useGetActiveMicroTasksQuery(undefined, { skip: !userId || accessControl?.hasRequiredContacts === false })

  const currentDay = clampTrialDay(trial?.currentDay)
  const trialProgress = getTrialCompletionPercent(trial?.currentDay)
  const trialDaysLeft = trial?.isActive ? getTrialDaysLeft(trial?.currentDay) : 0
  const totalSessions = dailyHistory.length
  const totalWheels = wheelHistory.length
  const activeMicroTasks = microTasks.filter(task => (task.status ?? 'PENDING') !== 'COMPLETED')
  const completedMicroTasks = microTasks.filter(task => (task.status ?? 'PENDING') === 'COMPLETED')
  const todayContent = (todayEntry?.content ?? null) as DailyContent | null
  const hasMorningSession = Boolean(todayContent?.morning)
  const hasEveningSession = Boolean(todayContent?.evening)
  const reportsCount = Number(Boolean(trial?.hasDay4Mirror)) + Number(Boolean(trial?.hasDay7Mirror))
  const level = summary?.xp.level ?? 1
  const totalPoints = summary?.rewards.bitMind ?? 0
  const streak = summary?.streak.current ?? 0
  const nextLevelXp = summary?.xp.nextLevelXp ?? 0
  const currentLevelXp = summary?.xp.currentLevelXp ?? 0
  const levelProgress = nextLevelXp > 0
    ? Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100))
    : 100

  const statCards = [
    { label: 'Рівень', value: level, icon: Sparkles },
    { label: 'BITMIND', value: totalPoints, icon: BarChart3 },
    { label: 'Streak', value: streak, icon: Flame },
    { label: 'Сесії', value: totalSessions, icon: CheckCircle2 },
  ]

  const mentorBlocks = [
    { label: 'Ранкова сесія', value: hasMorningSession ? 'Готово' : 'Ще ні', sub: 'Щоденний check-in', icon: SunMedium, done: hasMorningSession },
    { label: 'Вечірня сесія', value: hasEveningSession ? 'Готово' : 'Ще ні', sub: 'Рефлексія дня', icon: Moon, done: hasEveningSession },
    { label: 'Колесо балансу', value: totalWheels, sub: 'Усього заповнень', icon: BarChart3, done: totalWheels > 0 },
    { label: 'Мікрозавдання', value: `${completedMicroTasks.length}/${microTasks.length}`, sub: `${activeMicroTasks.length} активних`, icon: ListTodo, done: activeMicroTasks.length === 0 && microTasks.length > 0 },
    { label: 'AI звіти', value: reportsCount, sub: 'Дзеркала 4/7 дня', icon: Sparkles, done: reportsCount > 0 },
  ]

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <GlassCard className={compact ? 'p-4' : 'p-6'}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
              AI Mentor Progress
            </p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              День {currentDay || '—'} з {TRIAL_TOTAL_DAYS}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {trial?.isActive ? `Залишилось ${trialDaysLeft} дн.` : accessControl?.hasSubscription ? 'Доступ активний' : 'Тріал не активний'}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Прогрес шляху</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{trialProgress}%</p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(var(--accent-soft-rgb),0.92),rgba(var(--accent-rgb),0.98))]"
            ref={element => {
              if (element) element.style.width = `${trialProgress}%`
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {Array.from({ length: TRIAL_TOTAL_DAYS }).map((_, index) => {
            const day = index + 1
            const isDone = currentDay > day
            const isCurrent = currentDay === day
            return (
              <div
                key={day}
                className={[
                  'rounded-2xl border px-2 py-2 text-center',
                  isDone
                    ? 'border-[rgba(114,194,129,0.25)] bg-[rgba(114,194,129,0.10)]'
                    : isCurrent
                      ? 'border-[rgba(var(--accent-rgb),0.35)] bg-[rgba(var(--accent-rgb),0.10)]'
                      : 'border-[var(--border)] bg-[var(--bg-secondary)]',
                ].join(' ')}
              >
                <div className="text-sm font-semibold text-[var(--text-primary)]">{day}</div>
                <div className="mt-1 text-[9px] text-[var(--text-muted)]">
                  {isDone ? 'готово' : isCurrent ? 'зараз' : '🔒'}
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'}`}>
        {statCards.map((card) => (
          <GlassCard key={card.label} className="p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <card.icon className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
              <span className="text-[11px] uppercase tracking-wide">{card.label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{card.value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className={compact ? 'p-4' : 'p-6'}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-[var(--text-primary)]">Структура прогресу</h4>
            <p className="text-sm text-[var(--text-muted)]">Усі ключові блоки AI Mentor на одній сторінці.</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-muted)]">
            До рівня: {Math.max(nextLevelXp - currentLevelXp, 0)} XP
          </div>
        </div>

        <div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(var(--accent-soft-rgb),0.92),rgba(var(--accent-rgb),0.98))]"
            ref={element => {
              if (element) element.style.width = `${levelProgress}%`
            }}
          />
        </div>

        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
          {mentorBlocks.map((block) => (
            <div
              key={block.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
            >
              <div className="flex items-center gap-3">
                <span className="btn-icon h-10 w-10 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
                  <block.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{block.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{block.sub}</p>
                </div>
                <span className={block.done ? 'text-[var(--color-success)]' : 'text-[var(--text-primary)]'}>
                  {typeof block.value === 'number' ? block.value : block.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {!accessControl?.hasSubscription && !trial?.isActive ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-muted)]">
            <CircleDashed className="h-4 w-4" />
            Підключи тріал або підписку, щоб прогрес оновлювався по всіх модулях.
          </div>
        ) : null}
      </GlassCard>
    </div>
  )
}
