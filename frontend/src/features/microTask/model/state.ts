import { MicroTask } from '../types/types';

export const isOverdue = (task: MicroTask) =>
  task.status === 'PENDING' && new Date(task.completedAt || 0) < new Date();

export const markCompleted = (task: MicroTask) => ({
  ...task,
  status: 'COMPLETED' as const,
  completedAt: new Date().toISOString(),
});
