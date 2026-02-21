import React from 'react'
import { MicroTask } from '../types/types'

interface Props {
  task: MicroTask
  onComplete: () => void
}

export const MicroTaskCard: React.FC<Props> = ({ task, onComplete }) => {
  return (
    <div className="p-4 border rounded shadow mb-2 bg-white">
      <h4 className="font-bold">{task.title}</h4>
      {task.description && <p className="text-gray-600">{task.description}</p>}
      <p className="text-sm text-gray-400">Source: {task.source}</p>
      <button
        className="mt-2 px-4 py-1 bg-green-500 text-white rounded"
        onClick={onComplete}
        disabled={task.status === 'completed'}
      >
        {task.status === 'completed' ? 'Completed' : 'Complete'}
      </button>
    </div>
  )
}
