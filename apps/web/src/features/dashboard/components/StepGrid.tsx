import { ROUTES } from '@/config/routes'
import { DAY_STATUS_DOT } from '@/features/daily-cycle/hooks/useDayStatus'
import type { UserProgress } from '@/features/user/hooks/useUserProgress'
import { type LucideIcon, Clock3, ListTodo, Orbit, BookCheck } from 'lucide-react'

import DayCard from './DayCard'

const STEP_META: Record<
  string,
  { icon: LucideIcon; title: string; description: string; href: string }
> = {
  wheel: {
    icon: Orbit,
    href: ROUTES.WHEEL,
    title: 'Колесо',
    description: 'Діагностика',
  },
  morning: {
    icon: Clock3,
    href: `${ROUTES.CYCLE}?session=morning`,
    title: 'Ранок',
    description: 'Фокус дня',
  },
  tasks: {
    icon: ListTodo,
    href: ROUTES.TASKS,
    title: 'Дія',
    description: '1 крок',
  },
  evening: {
    icon: BookCheck,
    href: `${ROUTES.CYCLE}?session=evening`,
    title: 'Вечір',
    description: 'Фіксація',
  },
}

const STATUS_MAP = {
  done: DAY_STATUS_DOT.completed,
  active: DAY_STATUS_DOT.active,
  locked: DAY_STATUS_DOT.future,
} as const

interface StepGridProps {
  journeySteps: UserProgress['journeySteps']
}

type TrialOnboardingStep = {
  id: string
  title: string
  description: string
  href: string
  status: 'done' | 'active' | 'locked'
}

type TrialOnboardingState = {
  wheelDone: boolean
  goalsDone: boolean
  visionDone: boolean
  dailyCycleInitialized: boolean
  continueCycleHref: string
}

const TRIAL_PROGRESS_WIDTH: Record<number, string> = {
  1: 'w-[25%]',
  2: 'w-[50%]',
  3: 'w-[75%]',
  4: 'w-full',
}

export function StepGrid({ journeySteps }: StepGridProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {journeySteps
        .filter(step => step.id !== 'report')
        .map(step => {
          const meta = STEP_META[step.id]

          if (!meta) return null

          return (
            <DayCard
              key={step.id}
              elementId={`step-${step.id}`}
              title={meta.title}
              icon={meta.icon}
              href={meta.href}
              status={step.status}
              description={meta.description}
              dotClassName={STATUS_MAP[step.status]}
            />
          )
        })}
    </section>
  )
}

export function buildTrialOnboardingSteps(state: TrialOnboardingState): TrialOnboardingStep[] {
  return [
    {
      id: 'wheel',
      title: 'Колесо балансу',
      description: 'Діагностика · розклад по сферах',
      href: ROUTES.WHEEL,
      status: state.wheelDone ? 'done' : 'active',
    },
    {
      id: 'goals',
      title: 'Цілі',
      description: 'Фокус · пріоритет · напрям',
      href: ROUTES.GOALS,
      status: !state.wheelDone ? 'locked' : state.goalsDone ? 'done' : 'active',
    },
    {
      id: 'vision',
      title: 'WEB-Карта',
      description: 'Звʼязки · ресурси · обмеження',
      href: ROUTES.VISION,
      status: !state.goalsDone ? 'locked' : state.visionDone ? 'done' : 'active',
    },
    {
      id: 'cycle',
      title: 'Щоденний цикл',
      description: 'СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ',
      href: state.continueCycleHref,
      status: !state.visionDone ? 'locked' : state.dailyCycleInitialized ? 'done' : 'active',
    },
  ]
}

export function TrialOnboardingPanel({
  currentTrialDay,
  expandedStepId,
  steps,
}: {
  currentTrialDay: number
  expandedStepId: string
  steps: TrialOnboardingStep[]
}) {
  return (
    <section className="space-y-4">
      <div className="glass-card flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-white">Trial 4 дні</p>
          <p className="text-xs text-white/60">День {currentTrialDay} з 4</p>
        </div>
        <div className="h-2 w-full max-w-xs rounded-full bg-white/10">
          <div className={['h-full rounded-full bg-[rgb(var(--accent-rgb))]', TRIAL_PROGRESS_WIDTH[currentTrialDay] ?? 'w-full'].join(' ')} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map(step => (
          <DayCard
            key={step.id}
            elementId={step.id === expandedStepId ? `step-${step.id}` : undefined}
            title={step.title}
            icon={step.id === 'wheel' ? Orbit : step.id === 'cycle' ? BookCheck : step.id === 'goals' ? Clock3 : ListTodo}
            href={step.href}
            status={step.status}
            description={step.description}
            dotClassName={STATUS_MAP[step.status]}
          />
        ))}
      </div>
    </section>
  )
}

export default StepGrid
