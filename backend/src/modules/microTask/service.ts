import { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { openai } from '../../lib/openai.js'
import { cacheDel, cacheGet, cacheSet } from '../../lib/cache/index.js'
import { MODEL_FOR_TASK } from '../../lib/openaiModels.js'
import { applyReward } from '../gamification/service.js'
import { notificationService } from '../../services/notifications/NotificationService.js'
import { stableHash } from '../../services/aiGuard.service.js'
import type { MicroTaskResponse } from './types.js'

const MODEL = MODEL_FOR_TASK.morning_tasks
const responses: MicroTaskResponse[] = []

type TaskPriority = 'high' | 'medium' | 'low'

export const STATIC_MORNING_QUESTION_KEYS = [
  'identity',
  'qualities',
  'goals',
  'focus',
  'state',
  'worthy',
] as const

export type StaticMorningQuestionKey = typeof STATIC_MORNING_QUESTION_KEYS[number]

export const STATIC_MORNING_QUESTIONS: Record<StaticMorningQuestionKey, string> = {
  identity: 'Хто я сьогодні?',
  qualities: 'Яка я?',
  goals: 'Мої 10 цілей на рік',
  focus: 'На яку одну ціль я фокусуюсь сьогодні?',
  state: 'Який мій стан сьогодні?',
  worthy: 'Чому я гідна мати все це прямо зараз?',
}

type GeneratedTask = {
  title: string
  why?: string
  insight?: string
  steps: string[]
  sphere: string
  daysToComplete: number
  durationDays?: number
  deadline?: string | null
  xpReward: number
  priority: TaskPriority
}

type PersistedMicroTask = {
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
}

export type MicroTaskSchedule = {
  isMultiDay: boolean
  currentDay: number
  totalDays: number
  label: string | null
}

export type GenerateMicroTaskOptions = {
  replaceExisting?: boolean
}

export function humanizeMorningQuestionKey(key: string): string {
  if (key in STATIC_MORNING_QUESTIONS) {
    return STATIC_MORNING_QUESTIONS[key as StaticMorningQuestionKey]
  }

  return key
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
  status?: 'active' | 'done' | 'expired' | 'skipped' | 'manual'
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
  if (task.status === 'manual') return 'PENDING' as const
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

type MicroTaskContextPayload = {
  rawContext?: string
  progressPercent?: number
  progressUpdatedAt?: string
  source?: string
  [key: string]: unknown
}

function parseMicroTaskContext(aiContext?: string | null): MicroTaskContextPayload | null {
  if (!aiContext) return null

  try {
    const parsed = JSON.parse(aiContext)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as MicroTaskContextPayload
    }
  } catch {
    // fall back to raw string
  }

  return { rawContext: aiContext }
}

function normalizeProgressPercent(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function extractProgressPercent(aiContext?: string | null): number | null {
  const parsed = parseMicroTaskContext(aiContext)
  return parsed ? normalizeProgressPercent(parsed.progressPercent ?? null) : null
}

function withProgressPercent(aiContext: string | null | undefined, progressPercent: number) {
  const parsed = parseMicroTaskContext(aiContext)
  const payload: MicroTaskContextPayload = parsed
    ? { ...parsed }
    : {}

  if (!parsed && typeof aiContext === 'string' && aiContext.trim().length > 0) {
    payload.rawContext = aiContext
  }

  payload.progressPercent = Math.max(0, Math.min(100, Math.round(progressPercent)))
  payload.progressUpdatedAt = new Date().toISOString()

  return JSON.stringify(payload)
}

function buildDueDate(daysToComplete: number) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + Math.max(0, daysToComplete - 1))
  dueDate.setHours(23, 59, 0, 0)
  return dueDate
}

function isManualMicroTaskStatus(status: string) {
  return status === 'manual'
}

async function getDailyCheckInStreak(userId: string) {
  const streak = await prisma.streak.findUnique({
    where: { userId_ruleKey: { userId, ruleKey: 'daily_checkin' } },
    select: { current: true },
  })

  return streak?.current ?? 0
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getMicroTaskSchedule(task: {
  createdAt: Date
  dueAt: Date | null
  completedAt?: Date | null
  daysToComplete?: number | null
}): MicroTaskSchedule {
  return {
    isMultiDay: false,
    currentDay: 1,
    totalDays: 1,
    label: null,
  }
}

function buildFallbackTasks(
  staticAnswers: Record<string, string>,
  slotsAvailable: number,
  carryOverTasks: Array<{
    title: string
    progressPercent: number | null
    daysToComplete: number
  }> = [],
): GeneratedTask[] {
  const energyRaw = [
    staticAnswers.state,
    staticAnswers.focus,
    staticAnswers.worthy,
    staticAnswers.identity,
  ]
    .filter(Boolean)
    .map(value => String(value).trim())
    .join(' · ')
  const energyNum = parseInt(energyRaw.match(/\d+/)?.[0] ?? '5', 10)
  const lowEnergy = energyNum <= 4
    || /втом|виснаж|важк|не можу|завис/i.test(energyRaw)
  const highEnergy = energyNum >= 7
    || /готов|можу|сила|заряд/i.test(energyRaw)
  const focus = staticAnswers.focus?.trim() || ''
  const goals = staticAnswers.goals?.split('\n').map(item => item.trim()).filter(Boolean) ?? []
  const state = [staticAnswers.state, staticAnswers.identity, staticAnswers.worthy]
    .filter(Boolean)
    .map(value => String(value).trim())
    .join(' · ')

  const targetCount = Math.min(slotsAvailable, highEnergy && carryOverTasks.length === 0 ? 2 : 1)
  const tasks: GeneratedTask[] = []

  const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ').slice(0, 72)

  const addTask = (task: GeneratedTask | null) => {
    if (!task || tasks.length >= targetCount) return
    tasks.push({
      ...task,
      title: normalizeTitle(task.title),
      steps: Array.isArray(task.steps) ? task.steps.slice(0, 2) : [],
      daysToComplete: 1,
      deadline: 'До 23:59',
    })
  }

  const carryOverTask = carryOverTasks
    .filter(task => task.progressPercent !== null && task.progressPercent < 80)
    .sort((left, right) => (left.progressPercent ?? 100) - (right.progressPercent ?? 100))[0]

  addTask(carryOverTask
    ? {
        title: `Продовжити: ${carryOverTask.title}`,
        insight: `Попередня задача вже на ${carryOverTask.progressPercent ?? 0}%. Краще дотиснути її сьогодні, ніж починати спочатку.`,
        steps: lowEnergy
          ? []
          : [
              'Відкрити саме цю задачу',
              'Зробити один конкретний крок саме сьогодні',
            ],
        sphere: 'growth',
        daysToComplete: 1,
        xpReward: 18,
        priority: 'high',
      }
    : null)

  addTask(focus
    ? {
        title: focus,
        insight: 'Ти вже назвав це фокусом дня. Сьогодні потрібен один реальний рух, не ще один список.',
        steps: lowEnergy ? [] : ['Зробити перший конкретний крок без доведення до ідеалу'],
        sphere: 'growth',
        daysToComplete: 1,
        xpReward: 20,
        priority: 'high',
      }
    : null)

  addTask(tasks.length < targetCount && goals[0]
    ? {
        title: `Просунути ціль: ${goals[0]}`,
        insight: 'Річна ціль має перейти в дію вже сьогодні, без розпорошення.',
        steps: lowEnergy
          ? []
          : [
              'Обрати один вимірюваний крок',
              'Зробити тільки перший крок сьогодні',
            ],
        sphere: 'vision',
        daysToComplete: 1,
        xpReward: 15,
        priority: 'medium',
      }
    : null)

  addTask(tasks.length < targetCount
    ? {
        title: `Закріпити стан дня${staticAnswers.identity ? `: ${staticAnswers.identity}` : ''}`,
        insight: 'Стан без дії швидко розсіюється. Малий крок допомагає перевести рефлексію в реальність.',
        steps: ['Записати одним реченням, як саме ти дієш із цього стану'],
        sphere: 'inner',
        daysToComplete: 1,
        xpReward: 10,
        priority: 'medium',
      }
    : null)

  return tasks.slice(0, targetCount)
}

function buildPromptContext(input: {
  userName: string
  level?: number | null
  xp?: number | null
  streak?: number | null
  userGoal: string
  userState: string
  userPain: string
  weakSpheres: string[]
  existingTasks: Array<{
    title: string
    status: string
    durationDays: number
    createdAt: string
    dueAt: string | null
    completedAt: string | null
    progressPercent: number | null
  }>
  slotsAvailable: number
  answers: Record<string, string>
  carryOverTasks: Array<{
    title: string
    progressPercent: number | null
    daysToComplete: number
  }>
}) {
  const staticMorningAnswersText = STATIC_MORNING_QUESTION_KEYS.reduce<Record<string, string>>((acc, key) => {
    const value = input.answers[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      acc[humanizeMorningQuestionKey(key)] = value.trim()
    }
    return acc
  }, {})

  return JSON.stringify({
    user_name: input.userName,
    user_goal: input.userGoal,
    user_state: input.userState,
    user_pain: input.userPain,
    level: input.level ?? null,
    xp: input.xp ?? 0,
    streak: input.streak ?? 0,
    weak_spheres: input.weakSpheres,
    slots_available: input.slotsAvailable,
    existing_tasks: input.existingTasks,
    carry_over_tasks: input.carryOverTasks,
    static_morning_answers: staticMorningAnswersText,
  }, null, 2)
}

async function generateTasksWithAi(input: {
  userName: string
  level?: number | null
  xp?: number | null
  streak?: number | null
  userGoal: string
  userState: string
  userPain: string
  weakSpheres: string[]
  existingTasks: Array<{
    title: string
    status: string
    durationDays: number
    createdAt: string
    dueAt: string | null
    completedAt: string | null
    progressPercent: number | null
  }>
  slotsAvailable: number
  answers: Record<string, string>
  carryOverTasks: Array<{
    title: string
    progressPercent: number | null
    daysToComplete: number
  }>
}) {
  const cacheKey = `morning-output:${stableHash(input)}`
  const cached = await cacheGet<{ raw: string; tasks: GeneratedTask[] | null } | null>(cacheKey)
  if (cached) {
    return cached
  }

  const system = [
    'Ти — AI-ментор у Starway Studio. Генеруєш мікрозавдання після ранкової рефлексії.',
    '',
    'Вхідні дані містять static_morning_answers — 6 базових відповідей ранкової рефлексії.',
    'Це фундамент особистості і довгострокових намірів.',
    '',
    'Правила генерації:',
    '1. Кількість завдань: найчастіше 1, інколи 2. Не давай 3 завдання у звичайному денному циклі.',
    '   Якщо видно втому або перевантаження → дай 1 завдання.',
    '   Якщо стан чіткий, є енергія і це справді доречно → максимум 2.',
    '   Якщо даних мало → 1.',
    '2. Якщо є carry_over_tasks з progressPercent < 80 → пріоритетно продовж їх.',
    '   Не починай день з нуля якщо є незавершені.',
    '3. Кожне завдання: title (до 12 слів), insight (до 15 слів, конкретно),',
    '   steps: [] або 1–2 кроки (ніколи не 3), durationDays: завжди 1.',
    '   Якщо задача велика — не розтягуй її на кілька днів, а дай лише один конкретний крок на сьогодні.',
    '   deadline: "До 23:59".',
    '4. Tone: прямо, по-дорослому, без мотиваційної води. Без знаків оклику.',
    '5. Мова: тільки українська.',
    '6. Відповідай тільки валідним JSON:',
    '   { "tasks": [{ "title": string, "insight": string, "steps": string[],',
    '     "sphere": string, "durationDays": number, "deadline": string | null,',
    '     "xpReward": number, "priority": "high" | "medium" | "low" }] }',
  ].join('\n')

  const userMessage = buildPromptContext(input)

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    max_tokens: 900,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${userMessage}\n\nЗгенеруй не більше ${Math.min(input.slotsAvailable, 2)} задач.` },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? ''
  const parsed = safeJsonParse<{ tasks?: GeneratedTask[] }>(stripMarkdownFences(raw))

  const result = {
    raw,
    tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : null,
  }
  await cacheSet(cacheKey, result, 3600)
  return result
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
