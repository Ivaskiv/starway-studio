import { useState } from 'react'

import type { WebMapGoal } from '@/features/web-map/services/web-map.api'

import { GoalCard } from '../GoalCard'

export function GoalsTab({ goals }: { goals: WebMapGoal[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {goals.map(goal => (
        <GoalCard
          key={goal.id}
          goal={goal}
          expanded={expanded === goal.id}
          onToggle={() => setExpanded(prev => prev === goal.id ? null : goal.id)}
        />
      ))}
    </div>
  )
}
