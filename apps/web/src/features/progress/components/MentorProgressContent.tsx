import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetDailyHistoryQuery } from '@/features/daily-cycle/services/daily.api'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { useGetActiveMicroTasksQuery } from '@/features/microTask/api/api'
import { getMicroTaskSphereMeta } from '@/features/microTask/utils/sphereMeta'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { getTrialDaysLeft, TRIAL_TOTAL_DAYS } from '@/features/trial/utils/trialProgress'
import { useGetWheelHistoryQuery } from '@/features/wheel/services/wheel.api'
import { GlassCard } from '@/ui'
import { BarChart3, CheckCircle2, CircleDashed, Flame, ListTodo, Orbit, Sparkles, SunMedium, Target } from 'lucide-react'
import { useMemo } from 'react'

interface MentorProgressContentProps {
  compact?: boolean
}

export default function MentorProgressContent({
  compact = false,
}: MentorProgressContentProps) {
  const { user } = useAuth()
  const { accessControl, subscription } = useSystemState()
  const userId = user?.id ?? ''
  const { data: summary } = useGetSummaryQuery(undefined, { skip: !userId })
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const { data: dailyHistory = [] } = useGetDailyHistoryQuery(undefined, { skip: !userId })
  const { data: wheelHistory = [] } = useGetWheelHistoryQuery({ userId, limit: 12 }, { skip: !userId })
  const { data: microTasks = [] } = useGetActiveMicroTasksQuery(undefined, { skip: !userId })
  const { journeyMilestones, dayNumber } = useUserProgress()

  const hasPremiumAccess = Boolean(
    subscription?.isActive
    || accessControl?.hasSubscription
    || trial?.isPaid
    || trial?.isActive,
  )
  const isPaidCycle = Boolean(subscription?.isActive || accessControl?.hasSubscription || trial?.isPaid)
  const currentDay = dayNumber || Math.max(0, trial?.currentDay ?? 0)
  const journeyTotalDays = isPaidCycle ? 30 : TRIAL_TOTAL_DAYS
  const trialProgress = journeyTotalDays > 0
    ? Math.min(100, Math.round((currentDay / journeyTotalDays) * 100))
    : 0
  const trialDaysLeft = trial?.isActive ? getTrialDaysLeft(trial?.currentDay) : 0
  const totalSessions = dailyHistory.length
  const totalWheels = wheelHistory.length
  const activeMicroTasks = microTasks.filter(task => (task.status ?? 'PENDING') !== 'COMPLETED')
  const completedMicroTasks = microTasks.filter(task => (task.status ?? 'PENDING') === 'COMPLETED')
  const journeyStepMap = useMemo(() => new Map(journeyMilestones.map(step => [step.id, step])), [journeyMilestones])
  const tasksBySphere = activeMicroTasks.reduce<Record<string, number>>((acc, task) => {
    const key = task.sphere ?? 'general'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const focusSpheres = Object.entries(tasksBySphere)
    .sort((left, right) => right[1] - left[1])
    .slice(0, compact ? 3 : 5)
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
    { label: 'Точка запуску', value: journeyStepMap.get('entry')?.status === 'done' ? 'Готово' : 'Ще ні', sub: 'Фіксація старту', icon: SunMedium, done: journeyStepMap.get('entry')?.status === 'done' },
    { label: 'Колесо балансу', value: totalWheels, sub: 'Усього заповнень', icon: Orbit, done: journeyStepMap.get('wheel')?.status === 'done' },
    { label: 'WEB-Карта', value: journeyStepMap.get('web_map')?.status === 'done' ? 'Готово' : 'Ще ні', sub: 'Звʼязки та ресурси', icon: BarChart3, done: journeyStepMap.get('web_map')?.status === 'done' },
    { label: 'ABsystem', value: journeyStepMap.get('absystem')?.status === 'done' ? 'Готово' : 'Ще ні', sub: 'Ціль і вибір', icon: Target, done: journeyStepMap.get('absystem')?.status === 'done' },
    { label: 'Щоденний цикл', value: journeyStepMap.get('daily_cycle')?.status === 'done' ? 'Готово' : 'Ще ні', sub: `${activeMicroTasks.length} активних · ${completedMicroTasks.length}/${microTasks.length}`, icon: ListTodo, done: journeyStepMap.get('daily_cycle')?.status === 'done' || journeyStepMap.get('daily_cycle')?.status === 'active' },
  ]

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <GlassCard className={compact ? 'p-4' : 'p-6'}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
              ABsystem Progress
            </p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              День {currentDay || '—'} з {journeyTotalDays}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {trial?.isActive
                ? `Залишилось ${trialDaysLeft} дн.`
                : hasPremiumAccess
                  ? 'Доступ активний'
                  : 'Тріал не активний'}
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
            <p className="text-sm text-[var(--text-muted)]">Усі ключові блоки ABsystem на одній сторінці.</p>
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

        {focusSpheres.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Сфери у фокусі</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Активні мікрозавдання вже мапляться на відповідні грані трекера.
                </p>
              </div>
              <span className="rounded-full bg-[rgba(var(--accent-rgb),0.12)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
                {activeMicroTasks.length} активних
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {focusSpheres.map(([sphere, count]) => {
                const meta = getMicroTaskSphereMeta(sphere)
                return (
                  <span
                    key={sphere}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                    <span className="text-[var(--accent)]">{count}</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {!hasPremiumAccess ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-muted)]">
            <CircleDashed className="h-4 w-4" />
            Історія збережена. Нові дії потребують активного доступу, але пройдене лишається видимим.
          </div>
        ) : null}
      </GlassCard>
    </div>
  )
}
