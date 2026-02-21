import React from 'react'
import { MicroTask } from '../types/types'
import { MicroTaskCard } from './MicroTaskCard'

interface Props {
  tasks: MicroTask[]
  onComplete: (taskId: string) => void
}

export const MicroTaskList: React.FC<Props> = ({ tasks, onComplete }) => {
  if (!tasks.length) return <p>No active micro-tasks</p>
  return (
    <div>
      {tasks.map((task) => (
        <MicroTaskCard
          key={task.id}
          task={task}
          onComplete={() => onComplete(task.id)}
        />
      ))}
    </div>
  )
}
