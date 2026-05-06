// components/GoalCard.tsx
import { useUpdateGoalProgressMutation } from "@/features/web-map/services/web-map.api"
import type { WebMapGoal } from "@/features/web-map/services/web-map.api"
import { Button, Slider } from "@/ui"
import { useState } from "react"

type GoalCardProps = {
  goal: WebMapGoal
  expanded: boolean
  onToggle: () => void
}

const clampProgress = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const getNextGoalStatus = (
  progress: number,
  currentStatus: WebMapGoal['status'],
): WebMapGoal['status'] => {
  if (progress >= 100) return 'completed'
  if (progress >= 70) return 'on_track'
  if (progress > 0 && currentStatus === 'behind') return 'behind'
  return 'active'
}

export function GoalCard({ goal, expanded, onToggle }: GoalCardProps) {
  const [progress, setProgress] = useState(goal.progress)
  const [update] = useUpdateGoalProgressMutation()

  return (
    <div className="card">
      <div onClick={onToggle}>
        {goal.title} — {progress}%
      </div>

      {expanded && (
        <>
          <p>{goal.description}</p>

          <Slider value={progress} onValueChange={setProgress} />

          <Button
            onClick={() =>
              update({
                id: goal.id,
                progress: clampProgress(progress),
                status: getNextGoalStatus(progress, goal.status),
              })
            }
          >
            Save
          </Button>
        </>
      )}
    </div>
  )
}
