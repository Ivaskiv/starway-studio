import { prisma } from '../../db/client.js'
import { applyReward } from '../gamification/service.js'
import { notificationService } from '../../services/notifications/NotificationService.js'
import {
  normalizeProgressPercent,
  toJson,
  withProgressPercent,
} from './helpers.js'

export async function completeMicroTask(taskId: string, userId?: string) {
  const task = await prisma.microTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      userId: true,
      title: true,
      xpReward: true,
      status: true,
      isCompleted: true,
      aiContext: true,
    },
  })

  if (!task || (userId && task.userId !== userId)) {
    return null
  }

  if (task.status !== 'done' && !task.isCompleted) {
    await prisma.microTask.update({
      where: { id: taskId },
      data: {
        status: 'done',
        isCompleted: true,
        completedAt: new Date(),
        aiContext: withProgressPercent(task.aiContext, 100),
      },
    })

    await applyReward(task.userId, { xp: task.xpReward ?? 20 })
    await notificationService.sendTaskCompleted(task.userId, task.title, task.xpReward ?? 20)
  }

  return prisma.microTask.findUnique({ where: { id: taskId } })
}

export async function skipMicroTask(taskId: string, userId?: string) {
  const task = await prisma.microTask.findUnique({
    where: { id: taskId },
    select: { id: true, userId: true },
  })
  if (!task || (userId && task.userId !== userId)) return null

  return prisma.microTask.update({
    where: { id: taskId },
    data: {
      status: 'skipped',
      isCompleted: false,
      completedAt: null,
    },
  })
}

export async function deleteMicroTask(taskId: string, userId?: string) {
  const task = await prisma.microTask.findUnique({
    where: { id: taskId },
    select: { id: true, userId: true, status: true },
  })
  if (!task || (userId && task.userId !== userId)) return null

  return prisma.microTask.delete({
    where: { id: taskId },
  })
}

export async function updateMicroTaskProgress(taskId: string, userId: string, progressPercent: number) {
  const normalized = normalizeProgressPercent(progressPercent)
  if (normalized === null) return null

  if (normalized >= 100) {
    return completeMicroTask(taskId, userId)
  }

  const task = await prisma.microTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      userId: true,
      status: true,
      isCompleted: true,
      aiContext: true,
    },
  })

  if (!task || task.userId !== userId) return null
  if (task.status === 'done' || task.isCompleted) return task

  return prisma.microTask.update({
    where: { id: taskId },
    data: {
      status: task.status === 'manual' ? 'manual' : 'active',
      isCompleted: false,
      completedAt: null,
      aiContext: withProgressPercent(task.aiContext, normalized),
    },
  })
}

export async function updateMicroTaskStep(taskId: string, userId: string, stepIndex: number, done: boolean) {
  const task = await prisma.microTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      userId: true,
      title: true,
      stepsCompleted: true,
      steps: true,
    },
  })

  if (!task || task.userId !== userId) return null
  if (!Array.isArray(task.steps) || !Array.isArray(task.stepsCompleted)) return null
  if (stepIndex < 0 || stepIndex >= task.steps.length) return null

  const nextStepsCompleted = task.stepsCompleted.map(Boolean)
  nextStepsCompleted[stepIndex] = done

  return prisma.microTask.update({
    where: { id: taskId },
    data: {
      stepsCompleted: toJson(nextStepsCompleted),
    },
  })
}

export async function getMicroTaskStats(userId: string) {
  const [total, completed] = await Promise.all([
    prisma.microTask.count({ where: { userId } }),
    prisma.microTask.count({ where: { userId, status: 'done' } }),
  ])
  return { total, completed, pending: total - completed }
}
