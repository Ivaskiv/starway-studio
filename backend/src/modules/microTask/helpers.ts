import { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'

export type TaskPriority = 'high' | 'medium' | 'low'

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

export type GeneratedTask = {
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

export type PersistedMicroTask = {
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

export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value))
}

export function normalizeTaskStatus(task: {
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

export function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function stripMarkdownFences(text: string) {
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

export function normalizeProgressPercent(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function extractProgressPercent(aiContext?: string | null): number | null {
  const parsed = parseMicroTaskContext(aiContext)
  return parsed ? normalizeProgressPercent(parsed.progressPercent ?? null) : null
}

export function withProgressPercent(aiContext: string | null | undefined, progressPercent: number) {
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

export function buildDueDate(daysToComplete: number) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + Math.max(0, daysToComplete - 1))
  dueDate.setHours(23, 59, 0, 0)
  return dueDate
}

export function isManualMicroTaskStatus(status: string) {
  return status === 'manual'
}

async function getDailyCheckInStreak(userId: string) {
  const streak = await prisma.streak.findUnique({
    where: { userId_ruleKey: { userId, ruleKey: 'daily_checkin' } },
    select: { current: true },
  })

  return streak?.current ?? 0
}

export function startOfLocalDay(date: Date) {
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
