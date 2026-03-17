import { prisma } from '../../db/client.js'
import { rewardEngine } from '../gamification/reward.engine.js'
import type { MicroTaskResponse } from './types.js'

const responses: MicroTaskResponse[] = []

export interface CreateMicroTaskInput {
  userId: string
  title: string
  description?: string
  source?: 'wheel' | 'daily' | 'mentor' | string
  linkedQuestionId?: string
  dueDate?: Date
}

export async function createMicroTask(input: CreateMicroTaskInput) {
  return prisma.microTask.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description,
      sphere: input.source ?? null,
      dueAt: input.dueDate,
    },
  })
}

export async function getUserMicroTasks(userId: string) {
  return prisma.microTask.findMany({
    where: { userId, isCompleted: false },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
}

export async function completeMicroTask(taskId: string, userId?: string) {
  const task = await prisma.microTask.findUnique({ where: { id: taskId }, select: { userId: true } })
  if (!task || (userId && task.userId !== userId)) {
    return null
  }
  const updated = await prisma.microTask.update({
    where: { id: taskId },
    data: { isCompleted: true, completedAt: new Date() },
    select: { userId: true },
  })
  await rewardEngine.onMicroTaskCompleted(task.userId)
  return updated
}

export async function getMicroTaskStats(userId: string) {
  const [total, completed] = await Promise.all([
    prisma.microTask.count({ where: { userId } }),
    prisma.microTask.count({ where: { userId, isCompleted: true } }),
  ])
  return { total, completed, pending: total - completed }
}

export async function createResponse(response: MicroTaskResponse) {
  responses.push(response)
  return response
}

export async function getResponsesByUser(userId: string) {
  return responses.filter(r => r.userId === userId)
}

export async function completeResponse(responseId: string, reflection?: string) {
  const existing = responses.find(r => r.id === responseId)
  if (existing) {
    existing.completed = true
    if (reflection) existing.reflection = reflection
  }
  return existing
}
