import { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { openai } from '../../lib/openai.js'
import { applyReward } from '../gamification/service.js'
import { notificationService } from '../../services/notifications/NotificationService.js'
import type { MicroTaskResponse } from './types.js'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const responses: MicroTaskResponse[] = []

type TaskPriority = 'high' | 'medium' | 'low'

type GeneratedTask = {
  title: string
  why: string
  steps: string[]
  sphere: string
  daysToComplete: number
  xpReward: number
  priority: TaskPriority
}

export interface CreateMicroTaskInput {
  userId: string
  expertId?: string | null
  title: string
  description?: string
  why?: string
  steps?: string[]
  sphere?: string
  priority?: TaskPriority
  status?: 'active' | 'done' | 'expired' | 'skipped'
  source?: 'wheel' | 'daily' | 'mentor' | string
  linkedQuestionId?: string
  dueDate?: Date
  xpReward?: number
  daysToComplete?: number
  generatedFromEntryId?: string
  aiContext?: string
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value))
}

function normalizeTaskStatus(task: {
  status: string
  isCompleted: boolean
  completedAt: Date | null
  dueAt: Date | null
}) {
  if (task.status === 'done' || task.isCompleted) return 'COMPLETED' as const
  if (task.status === 'skipped') return 'skipped' as const
  if (task.status === 'expired' || (task.dueAt && task.dueAt.getTime() < Date.now())) return 'expired' as const
  return 'PENDING' as const
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function stripMarkdownFences(text: string) {
  return text.replace(/```json|```/gi, '').trim()
}

function buildDueDate(daysToComplete: number) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + Math.max(1, daysToComplete))
  dueDate.setHours(23, 59, 0, 0)
  return dueDate
}

function buildFallbackTasks(
  answers: Record<string, string>,
  slotsAvailable: number,
): GeneratedTask[] {
  const focus = answers.focus?.trim()
  const goals = answers.goals?.split('\n').map(item => item.trim()).filter(Boolean) ?? []
  const identity = answers.identity?.trim()

  const tasks: GeneratedTask[] = []

  if (focus) {
    tasks.push({
      title: focus.length > 90 ? `${focus.slice(0, 87)}...` : focus,
      why: 'Ти сам назвав це фокусом дня. Краще один конкретний рух сьогодні, ніж десять розмитих намірів.',
      steps: [
        'Відкрити документ або чат, де почнеться ця дія',
        'Зробити перший чернетковий крок без спроби ідеалу',
        'Закрити задачу або призначити конкретний час завершення сьогодні',
      ],
      sphere: 'growth',
      daysToComplete: 1,
      xpReward: 20,
      priority: 'high',
    })
  }

  if (tasks.length < slotsAvailable && goals[0]) {
    tasks.push({
      title: `Просунути ціль: ${goals[0].slice(0, 70)}`,
      why: 'Твої річні цілі мають переходити в дію. Сьогодні важливо дати одній з них реальний рух.',
      steps: [
        'Обрати один вимірюваний крок до цієї цілі',
        'Виділити під нього 15 хвилин у календарі',
      ],
      sphere: 'vision',
      daysToComplete: 1,
      xpReward: 15,
      priority: 'medium',
    })
  }

  if (tasks.length < slotsAvailable) {
    tasks.push({
      title: `Закріпити стан${identity ? `: ${identity.slice(0, 48)}` : ''}`,
      why: 'Стан без дії швидко розсіюється. Малий крок допомагає перевести рефлексію в реальність.',
      steps: [
        'Записати одним реченням, як саме ти дієш із цього стану',
        'Зробити одну коротку дію, яка це підтверджує',
      ],
      sphere: 'inner',
      daysToComplete: 1,
      xpReward: 10,
      priority: 'medium',
    })
  }

  return tasks.slice(0, slotsAvailable)
}

function buildPromptContext(input: {
  userName: string
  level?: number | null
  xp?: number | null
  streak?: number | null
  weakSpheres: string[]
  overdueTasks: string[]
  slotsAvailable: number
  answers: Record<string, string>
}) {
  const answersText = Object.entries(input.answers)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([key, value]) => `· ${key}: "${value.trim()}"`)
    .join('\n')

  return `
Профіль юзера:
· Ім'я: ${input.userName}
· Рівень: ${input.level ?? 'невідомо'} · XP: ${input.xp ?? 0} · Streak: ${input.streak ?? 0} днів
· Слабкі сфери: ${input.weakSpheres.length ? input.weakSpheres.join(', ') : 'не виявлено'}
· Незавершені задачі: ${input.overdueTasks.length ? input.overdueTasks.join('; ') : 'немає'}
· Доступно слотів: ${input.slotsAvailable}

Відповіді на ранкові питання:
${answersText || '· немає відповідей'}
`.trim()
}

async function generateTasksWithAi(input: {
  userName: string
  level?: number | null
  xp?: number | null
  streak?: number | null
  weakSpheres: string[]
  overdueTasks: string[]
  slotsAvailable: number
  answers: Record<string, string>
}) {
  const system = [
    'Ти — AI ментор Starway Studio.',
    'На основі ранкової рефлексії юзера згенеруй 1-3 конкретних мікрозавдання на наступні 1-3 дні.',
    'Не давай більше доступних слотів.',
    'Завдання мають бути конкретними і виконуваними.',
    'Враховуй енергію і не перевантажуй людину.',
    'Кожна задача має мати причину why і 2-4 конкретні кроки.',
    'Відповідай тільки валідним JSON формату { "tasks": [{ "title": string, "why": string, "steps": string[], "sphere": string, "daysToComplete": number, "xpReward": number, "priority": "high" | "medium" | "low" }] }.',
  ].join('\n')

  const userMessage = buildPromptContext(input)

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    max_tokens: 900,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${userMessage}\n\nЗгенеруй не більше ${input.slotsAvailable} задач.` },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? ''
  const parsed = safeJsonParse<{ tasks?: GeneratedTask[] }>(stripMarkdownFences(raw))

  return {
    raw,
    tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : null,
  }
}

function mapMicroTask(task: {
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
}) {
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
    source: 'aiMentor' as const,
    reason: task.sphere ?? 'growth',
    dueAt: task.dueAt?.toISOString() ?? undefined,
    expiresAt: task.dueAt?.toISOString() ?? undefined,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? undefined,
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
    where.status = 'active'
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
    .filter(task => task.status === 'active' && task.dueAt && task.dueAt.getTime() < now.getTime())
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

  return freshTasks.map(mapMicroTask)
}

export async function getUserMicroTasks(userId: string) {
  return listMicroTasksForUser(userId, 'active')
}

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

export async function updateMicroTaskStep(taskId: string, userId: string, stepIndex: number, done: boolean) {
  const task = await prisma.microTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      userId: true,
      stepsCompleted: true,
      steps: true,
      status: true,
    },
  })

  if (!task || task.userId !== userId) return null
  if (!Array.isArray(task.steps) || !Array.isArray(task.stepsCompleted)) return null
  if (stepIndex < 0 || stepIndex >= task.steps.length) return null

  const nextStepsCompleted = task.stepsCompleted.map(Boolean)
  nextStepsCompleted[stepIndex] = done

  const allDone = nextStepsCompleted.length > 0 && nextStepsCompleted.every(Boolean)

  return prisma.microTask.update({
    where: { id: taskId },
    data: {
      stepsCompleted: toJson(nextStepsCompleted),
      ...(allDone
        ? {
            status: 'done',
            isCompleted: true,
            completedAt: new Date(),
          }
        : {}),
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

export async function generateMicroTasksFromEntry(userId: string, entryId: string) {
  console.log('[microTask] generate:start', { userId, entryId })
  const [entry, user, activeTasks, profile, latestWheel] = await Promise.all([
    prisma.dailyEntry.findUnique({
      where: { id: entryId },
      select: { id: true, userId: true, content: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, expertId: true },
    }),
    prisma.microTask.findMany({
      where: { userId, status: 'active' },
      orderBy: { dueAt: 'asc' },
      take: 10,
      select: { title: true, dueAt: true },
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

  const existingForEntry = await prisma.microTask.count({
    where: { userId, generatedFromEntryId: entryId },
  })
  if (existingForEntry > 0) {
    console.log('[microTask] generate:already-exists', {
      userId,
      entryId,
      existingForEntry,
    })
    return listMicroTasksForUser(userId, 'all')
  }

  if (activeTasks.length >= 3) {
    console.log('[microTask] generate:no-slots', {
      userId,
      entryId,
      activeTasks: activeTasks.length,
    })
    return []
  }

  const slotsAvailable = 3 - activeTasks.length
  const overdueTasks = activeTasks
    .filter(task => task.dueAt && task.dueAt.getTime() < Date.now())
    .map(task => task.title)

  const weakSpheres = latestWheel?.scores && typeof latestWheel.scores === 'object' && !Array.isArray(latestWheel.scores)
    ? Object.entries(latestWheel.scores as Record<string, unknown>)
        .filter(([, value]) => typeof value === 'number')
        .sort((a, b) => Number(a[1]) - Number(b[1]))
        .slice(0, 2)
        .map(([key, value]) => `${key} (${value})`)
    : []

  const promptInput = {
    userName: user.firstName ?? 'Користувач',
    level: profile?.level ?? null,
    xp: profile?.mindXP ?? null,
    streak: null,
    weakSpheres,
    overdueTasks,
    slotsAvailable,
    answers: morning,
  }

  let generated = buildFallbackTasks(morning, slotsAvailable)
  let aiRawContext = JSON.stringify(promptInput)

  try {
    const aiResult = await generateTasksWithAi(promptInput)
    aiRawContext = aiResult.raw || aiRawContext
    if (aiResult.tasks?.length) {
      generated = aiResult.tasks.slice(0, slotsAvailable).filter(task =>
        task.title && task.why && Array.isArray(task.steps) && task.steps.length > 0,
      )
    }
  } catch (error) {
    console.error('[microTask] AI generation failed, using fallback', error)
  }

  if (!generated.length) {
    console.log('[microTask] generate:no-tasks-produced', { userId, entryId })
    return []
  }

  const created = await Promise.all(generated.map(task =>
    createMicroTask({
      userId,
      expertId: user.expertId ?? null,
      title: task.title,
      description: task.steps[0],
      why: task.why,
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

  await notificationService.sendNewMicroTasks(userId, user.firstName ?? 'Привіт', created.map(task => task.title))

  return created.map(task => mapMicroTask({
    ...task,
    why: task.why ?? null,
    steps: task.steps,
    stepsCompleted: task.stepsCompleted,
  }))
}
