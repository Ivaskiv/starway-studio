import { ROUTES } from '@/config/routes'
import { DAY_STATUS_DOT } from '@/features/daily-cycle/hooks/useDayStatus'
import type { UserProgress } from '@/features/user/hooks/useUserProgress'

import DayCard from './DayCard'

const STEP_META = {
  wheel: { emoji: '⚖️', href: ROUTES.WHEEL, title: 'Колесо балансу', description: 'Онови фокус і подивись, що просідає.' },
  morning: { emoji: '🌅', href: `${ROUTES.CYCLE}?session=morning`, title: 'Ранкова сесія', description: 'Зафіксуй стан і напрямок на день.' },
  tasks: { emoji: '📋', href: ROUTES.TASKS, title: 'Мікрозавдання', description: 'Забери одну маленьку дію в рух.' },
  evening: { emoji: '🌙', href: `${ROUTES.CYCLE}?session=evening`, title: 'Вечірня сесія', description: 'Закрий цикл і підсумуй день.' },
} as const

const STATUS_MAP = {
  done: DAY_STATUS_DOT.completed,
  active: DAY_STATUS_DOT.active,
  locked: DAY_STATUS_DOT.future,
} as const

interface StepGridProps {
  journeySteps: UserProgress['journeySteps']
}

export function StepGrid({ journeySteps }: StepGridProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {journeySteps
        .filter(step => step.id !== 'report')
        .map(step => {
          const meta = STEP_META[step.id as keyof typeof STEP_META]
          return (
            <DayCard
              key={step.id}
              title={meta.title}
              emoji={meta.emoji}
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

export default StepGrid
