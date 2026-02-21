// backend/src/modules/microTask/engine.ts
import { MicroTask, MicroTaskResponse } from '@/modules/microTask/types.js'
import { v4 as uuid } from 'uuid'

export const microTaskEngine = {
  createFromAI(input: {
    userId: string
    title: string
    description?: string
    source: string
    linkedQuestionId?: string
    durationDays?: number
  }): MicroTask {
    const now = new Date()
    return {
      id: uuid(),
      userId: input.userId,
      title: input.title,
      description: input.description,
      source: input.source,
      linkedQuestionId: input.linkedQuestionId,
      status: 'active',
      createdAt: now,
      expiresAt: input.durationDays
        ? new Date(now.getTime() + input.durationDays * 86400000)
        : undefined,
    }
  },

  createResponse(microTaskId: string, userId: string, reflection?: string): MicroTaskResponse {
    return {
      id: uuid(),
      microTaskId,
      userId,
      completed: false,
      reflection,
      createdAt: new Date(),
    }
  },

  isExpired(task: MicroTask): boolean {
    return task.expiresAt ? new Date() > task.expiresAt : false
  },
}
