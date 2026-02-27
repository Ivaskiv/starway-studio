import { v4 as uuid } from 'uuid';
import { MicroTask } from '../types/types';

export const microTaskService = {
  create: (input: Partial<MicroTask> & { userId: string }): MicroTask => ({
    id: uuid(),
    userId: input.userId,
    title: input.title || 'New MicroTask',
    description: input.description,
    status: 'PENDING',
    source: input.source || 'manual',
    reason: input.reason,
    linkedQuestionId: input.linkedQuestionId,
    createdAt: new Date().toISOString(),
  }),
};
