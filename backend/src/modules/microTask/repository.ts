import { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { cacheDel } from '../../lib/cache/index.js'
import { notificationService } from '../../services/notifications/NotificationService.js'
import {
  buildFallbackTasks,
  generateTasksWithAi,
} from './ai.js'
import {
  STATIC_MORNING_QUESTION_KEYS,
  buildDueDate,
  extractProgressPercent,
  getMicroTaskSchedule,
  isManualMicroTaskStatus,
  normalizeTaskStatus,
  startOfLocalDay,
  toJson,
  type CreateMicroTaskInput,
  type GenerateMicroTaskOptions,
  type TaskPriority,
} from './helpers.js'

export function mapMicroTask(task: {
  id: string
  userId: string
  title: string
  description: string | null
  why: string | null
  steps: Prisma.JsonValue | null
  stepsCompleted: Prisma.JsonValue | null
  sphere: string | null
  priority: string
  xpReward: number
  daysToComplete: number
  status: string
  isCompleted: boolean
  createdAt: Date
  updatedAt: Date
  dueAt: Date | null
  completedAt: Date | null
  generatedFromEntryId?: string | null
  aiContext?: string | null
}) {
  const schedule = getMicroTaskSchedule(task)
  const progressPercent = extractProgressPercent(task.aiContext)

  return {
    id: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description ?? undefined,
    why: task.why ?? undefined,
    steps: Array.isArray(task.steps) ? task.steps.filter((step): step is string => typeof step === 'string') : [],
    stepsCompleted: Array.isArray(task.stepsCompleted) ? task.stepsCompleted.map(Boolean) : [],
    sphere: task.sphere ?? undefined,
    priority: (task.priority || 'medium') as TaskPriority,
    xpReward: task.xpReward,
    daysToComplete: task.daysToComplete,
    status: normalizeTaskStatus(task),
    taskKind: task.status === 'manual' ? 'manual' as const : 'auto' as const,
    source: 'aiMentor' as const,
    reason: task.sphere ?? 'growth',
    dueAt: task.dueAt?.toISOString() ?? undefined,
    expiresAt: task.dueAt?.toISOString() ?? undefined,
    createdAt: task.createdAt.toISOString(),
    generatedFromEntryId: task.generatedFromEntryId ?? undefined,
    completedAt: task.completedAt?.toISOString() ?? undefined,
    schedule,
    progressPercent,
    aiContext: task.aiContext ?? undefined,
  }
}

export async function createMicroTask(input: CreateMicroTaskInput) {
  return prisma.microTask.create({
    data: {
      userId: input.userId,
      expertId: input.expertId ?? null,
      title: input.title,
      description: input.description,
      why: input.why ?? null,
      steps: input.steps ? toJson(input.steps) : Prisma.JsonNull,
      stepsCompleted: input.steps ? toJson(input.steps.map(() => false)) : Prisma.JsonNull,
      sphere: input.sphere ?? input.source ?? null,
      priority: input.priority ?? 'medium',
      status: input.status ?? 'active',
      xpReward: input.xpReward ?? 20,
      daysToComplete: input.daysToComplete ?? 1,
      isCompleted: input.status === 'done',
      completedAt: input.status === 'done' ? new Date() : null,
      dueAt: input.dueDate,
      generatedFromEntryId: input.generatedFromEntryId ?? null,
      aiContext: input.aiContext ?? null,
    },
  })
}

export async function listMicroTasksForUser(userId: string, status: 'active' | 'done' | 'expired' | 'skipped' | 'all' = 'all') {
  const now = new Date()
  const where: Prisma.MicroTaskWhereInput = { userId }

  if (status === 'active') {
    where.status = { in: ['active', 'manual'] }
  } else if (status !== 'all') {
    where.status = status
  }

  const tasks = await prisma.microTask.findMany({
    where,
    orderBy: [
      { priority: 'asc' },
      { dueAt: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  const expiredIds = tasks
    .filter(task => (task.status === 'active' || task.status === 'manual') && task.dueAt && task.dueAt.getTime() < now.getTime())
    .map(task => task.id)

  if (expiredIds.length > 0) {
    await prisma.microTask.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: 'expired' },
    })
  }

  const freshTasks = expiredIds.length > 0
    ? await prisma.microTask.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { dueAt: 'asc' },
        { createdAt: 'desc' },
      ],
    })
    : tasks

  const mappedTasks = freshTasks.map(mapMicroTask)
  return mappedTasks.sort((left, right) => {
    const leftManual = left.taskKind === 'manual' ? 0 : 1
    const rightManual = right.taskKind === 'manual' ? 0 : 1
    if (leftManual !== rightManual) return leftManual - rightManual

    const leftPriority = left.priority === 'high' ? 0 : left.priority === 'medium' ? 1 : 2
    const rightPriority = right.priority === 'high' ? 0 : right.priority === 'medium' ? 1 : 2
    if (leftPriority !== rightPriority) return leftPriority - rightPriority

    const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER
    const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER
    if (leftDue !== rightDue) return leftDue - rightDue

    return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
  })
}

export async function getUserMicroTasks(userId: string) {
  return listMicroTasksForUser(userId, 'active')
}

export async function generateMicroTasksFromEntry(
  userId: string,
  entryId: string,
  options: GenerateMicroTaskOptions = {},
) {
  console.log('[microTask] generate:start', { userId, entryId })
  const [entry, user, activeTasks, profile, latestWheel, streak] = await Promise.all([
    prisma.dailyEntry.findUnique({
      where: { id: entryId },
      select: { id: true, userId: true, date: true, content: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, expertId: true },
    }),
    prisma.microTask.findMany({
      where: { userId, status: { in: ['active', 'manual'] } },
      orderBy: { dueAt: 'asc' },
      take: 10,
      select: { title: true, dueAt: true, status: true, daysToComplete: true, createdAt: true, completedAt: true, aiContext: true },
    }),
    prisma.gamificationProfile.findUnique({
      where: { userId },
      select: { level: true, mindXP: true },
    }),
    prisma.userBalanceEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { scores: true },
    }),
    prisma.streak.findUnique({
      where: { userId_ruleKey: { userId, ruleKey: 'daily_checkin' } },
      select: { current: true },
    }),
  ])

  if (!entry || !user) {
    console.log('[microTask] generate:missing-context', {
      userId,
      entryId,
      hasEntry: Boolean(entry),
      hasUser: Boolean(user),
    })
    return []
  }

  const content = entry.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
    ? entry.content as Record<string, unknown>
    : {}
  const morning = content.morning && typeof content.morning === 'object' && !Array.isArray(content.morning)
    ? content.morning as Record<string, string>
    : null

  if (!morning) {
    console.log('[microTask] generate:no-morning-content', { userId, entryId })
    return []
  }

  const replaceExisting = Boolean(options.replaceExisting)
  const entryStartOfDay = startOfLocalDay(entry.date)
  const staticMorningAnswers = STATIC_MORNING_QUESTION_KEYS.reduce<Record<string, string>>((acc, key) => {
    const value = morning[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      acc[key] = value.trim()
    }
    return acc
  }, {})
  const existingTasksForEntry = replaceExisting
    ? await prisma.microTask.findMany({
        where: {
          userId,
          status: { not: 'manual' },
          OR: [
            { generatedFromEntryId: entryId },
            {
              createdAt: { gte: entryStartOfDay },
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          status: true,
          generatedFromEntryId: true,
          createdAt: true,
        },
      })
    : []
  const autoTasksForEntry = existingTasksForEntry.filter(task => task.status === 'active')
  const manualTasksForEntry = existingTasksForEntry.filter(task => isManualMicroTaskStatus(task.status))
  if (existingTasksForEntry.length > 0) {
    if (!replaceExisting) {
      console.log('[microTask] generate:already-exists', {
        userId,
        entryId,
        existingForEntry: existingTasksForEntry.length,
      })
      return listMicroTasksForUser(userId, 'all')
    }

    console.log('[microTask] generate:replace-existing', {
      userId,
      entryId,
      existingForEntry: existingTasksForEntry.length,
    })
  }

  const activeAutoTasks = activeTasks.filter(task => task.status !== 'manual')
  const activeManualTasks = activeTasks.filter(task => task.status === 'manual')

  if (activeAutoTasks.length >= 2 && !replaceExisting) {
    console.log('[microTask] generate:no-slots', {
      userId,
      entryId,
      activeTasks: activeAutoTasks.length,
      manualTasks: activeManualTasks.length,
    })
    return []
  }

  const slotsAvailable = replaceExisting && existingTasksForEntry.length > 0
    ? 2
    : Math.max(0, 2 - activeAutoTasks.length)
  const promptSlotsAvailable = slotsAvailable

  const weakSpheres = latestWheel?.scores && typeof latestWheel.scores === 'object' && !Array.isArray(latestWheel.scores)
    ? Object.entries(latestWheel.scores as Record<string, unknown>)
        .filter(([, value]) => typeof value === 'number')
        .sort((a, b) => Number(a[1]) - Number(b[1]))
        .slice(0, 2)
        .map(([key, value]) => `${key} (${value})`)
    : []

  const existingTasks = await prisma.microTask.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }],
    take: 20,
      select: {
        title: true,
        status: true,
        daysToComplete: true,
        createdAt: true,
        dueAt: true,
        completedAt: true,
        aiContext: true,
      },
    })

  const userGoal = [
    staticMorningAnswers.goals,
    staticMorningAnswers.focus,
  ].find(value => typeof value === 'string' && value.trim().length > 0)?.trim() ?? ''

  const userState = [
    staticMorningAnswers.state,
    staticMorningAnswers.identity,
    staticMorningAnswers.worthy,
  ].find(value => typeof value === 'string' && value.trim().length > 0)?.trim() ?? ''

  const userPain = weakSpheres[0] ?? userState ?? userGoal

  const promptInput = {
    userName: user.firstName ?? 'Користувач',
    level: profile?.level ?? null,
    xp: profile?.mindXP ?? null,
    streak: streak?.current ?? 0,
    userGoal,
    userState,
    userPain,
    weakSpheres,
    existingTasks: existingTasks.map(task => ({
      title: task.title,
      status: task.status,
      durationDays: task.daysToComplete,
      createdAt: task.createdAt.toISOString(),
      dueAt: task.dueAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      progressPercent: extractProgressPercent(task.aiContext),
    })),
    slotsAvailable: promptSlotsAvailable,
    answers: morning,
    carryOverTasks: activeTasks
      .map(task => ({
        title: task.title,
        progressPercent: extractProgressPercent(task.aiContext),
        daysToComplete: task.daysToComplete ?? 1,
        createdAt: task.createdAt,
        status: task.status,
      }))
      .filter(task => (
        task.progressPercent !== null
        && task.progressPercent < 80
        && task.daysToComplete > 1
        && task.createdAt.getTime() < entryStartOfDay.getTime()
        && task.status !== 'manual'
      )),
  }

  let generated = buildFallbackTasks(staticMorningAnswers, promptSlotsAvailable, promptInput.carryOverTasks)
  let aiRawContext = JSON.stringify(promptInput)

  try {
    const aiResult = await generateTasksWithAi(promptInput)
    aiRawContext = aiResult.raw || aiRawContext
    if (aiResult.tasks?.length) {
      generated = aiResult.tasks.slice(0, promptSlotsAvailable).filter(task =>
        task.title && (task.insight || task.why) && Array.isArray(task.steps),
      ).map(task => ({
        ...task,
        steps: Array.isArray(task.steps) ? task.steps.slice(0, 2) : [],
        daysToComplete: 1,
        deadline: 'До 23:59',
      }))
    }
  } catch (error) {
    console.error('[microTask] AI generation failed, using fallback', error)
  }

  if (!generated.length) {
    console.log('[microTask] generate:no-tasks-produced', { userId, entryId })
    return []
  }

  if (replaceExisting && existingTasksForEntry.length > 0) {
    if (!generated.length) {
      return listMicroTasksForUser(userId, 'all')
    }

    await prisma.microTask.deleteMany({
      where: {
        userId,
        status: { not: 'manual' },
        createdAt: { gte: entryStartOfDay },
      },
    })

    const createdRows = await Promise.all(generated.slice(0, 2).map(task =>
      prisma.microTask.create({
        data: {
          userId,
          expertId: user.expertId ?? null,
          title: task.title,
          description: task.steps[0] ?? task.insight ?? task.why,
          why: task.insight ?? task.why ?? null,
          steps: toJson(task.steps),
          stepsCompleted: toJson(task.steps.map(() => false)),
          sphere: task.sphere ?? null,
          priority: task.priority ?? 'medium',
          status: 'active',
          xpReward: task.xpReward ?? 20,
          daysToComplete: task.daysToComplete,
          isCompleted: false,
          completedAt: null,
          dueAt: buildDueDate(task.daysToComplete),
          generatedFromEntryId: entryId,
          aiContext: aiRawContext,
        },
      }),
    ))

    console.log('[microTask] generate:updated', {
      userId,
      entryId,
        createdCount: createdRows.length,
        replacedCount: existingTasksForEntry.length,
        preservedManualCount: manualTasksForEntry.length,
      })
    await cacheDel(`microtasks:entry:${entryId}`)

    return createdRows.map(task => mapMicroTask({
      ...task,
      why: task.why ?? null,
      steps: task.steps,
      stepsCompleted: task.stepsCompleted,
    }))
  }

  const created = await Promise.all(generated.map(task =>
    createMicroTask({
      userId,
      expertId: user.expertId ?? null,
      title: task.title,
      description: task.steps[0] ?? task.insight ?? task.why,
      why: task.insight ?? task.why,
      steps: task.steps,
      sphere: task.sphere,
      priority: task.priority,
      xpReward: task.xpReward,
      daysToComplete: task.daysToComplete,
      dueDate: buildDueDate(task.daysToComplete),
      generatedFromEntryId: entryId,
      aiContext: aiRawContext,
      source: 'daily',
    }),
  ))

  console.log('[microTask] generate:created', {
    userId,
    entryId,
    createdCount: created.length,
    titles: created.map(task => task.title),
  })
  await cacheDel(`microtasks:entry:${entryId}`)

  if (!replaceExisting) {
    await notificationService.sendNewMicroTasks(userId, user.firstName ?? 'Привіт', created.map(task => task.title))
  }

  return created.map(task => mapMicroTask({
    ...task,
    why: task.why ?? null,
    steps: task.steps,
    stepsCompleted: task.stepsCompleted,
    aiContext: task.aiContext ?? null,
  }))
}
