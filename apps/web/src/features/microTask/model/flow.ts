import { MicroTask } from '../types/types';

export const filterActiveTasks = (tasks: MicroTask[]) => tasks.filter(t => t.status === 'PENDING');
