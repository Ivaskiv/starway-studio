import { MicroTask } from '../types/types'

export const isOverdue = (task: MicroTask) =>
  task.status === 'pending' && new Date(task.completedAt || 0) < new Date()

export const markCompleted = (task: MicroTask) => ({
  ...task,
  status: 'completed' as const,
  completedAt: new Date().toISOString(),
})
