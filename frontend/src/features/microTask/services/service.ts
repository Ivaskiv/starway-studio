import { MicroTask } from '../types/types'
import { v4 as uuid } from 'uuid'

export const microTaskService = {
  create: (input: Partial<MicroTask> & { userId: string }): MicroTask => ({
    id: uuid(),
    userId: input.userId,
    title: input.title || 'New MicroTask',
    description: input.description,
    status: 'pending',
    source: input.source || 'manual',
    reason: input.reason,
    linkedQuestionId: input.linkedQuestionId,
    createdAt: new Date().toISOString(),
  }),
}
