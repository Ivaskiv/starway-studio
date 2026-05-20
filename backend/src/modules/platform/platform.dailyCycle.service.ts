import type { DailyDrain, DailyState } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'

export type DailyCycleType = 'MORNING' | 'EVENING'
export type ActingFromEnum = 'STRENGTH' | 'FEAR' | 'NEUTRAL'

// ─── TYPES ────────────────────────────────────────────────────────

export interface MorningCycleInput {
  userId: string
  expertId: string
  whoAmI?: string
  qualities?: string
  tenGoals?: string[]
  focusGoal?: string
  stateEnum?: DailyState
  worthiness?: string
  dayFact?: string
  microActionText?: string
}

export interface EveningCycleInput {
  userId: string
  expertId: string
  energyGain?: string
  energyDrain?: string
  drainEnum?: DailyDrain
  programActive?: string
  actingFrom?: ActingFromEnum
  todayWin?: string
  microDone?: boolean
  dayFact?: string
}

export interface DailyCycleResult {
  id: string
  userId: string
  date: string
  type: DailyCycleType
  completed: boolean
  createdAt: Date
}

// ─── SAVE MORNING ─────────────────────────────────────────────────

export async function saveMorningCycle(
  input: MorningCycleInput
): Promise<DailyCycleResult> {
  const today = getTodayDate()

  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId: input.userId, date: today } },
    create: {
      userId: input.userId,
      expertId: input.expertId,
      date: today,
      cycleType: 'MORNING',
      whoAmI: input.whoAmI,
      qualities: input.qualities,
      tenGoals: input.tenGoals ?? [],
      focusGoal: input.focusGoal,
      state: input.stateEnum ?? 'STABILITY',
      worthiness: input.worthiness,
      dayFact: input.dayFact,
      microActionText: input.microActionText,
      status: 'IN_PROGRESS',
      content: {},
    } as any,
    update: {
      cycleType: 'MORNING',
      whoAmI: input.whoAmI,
      qualities: input.qualities,
      tenGoals: input.tenGoals ?? [],
      focusGoal: input.focusGoal,
      state: input.stateEnum ?? 'STABILITY',
      worthiness: input.worthiness,
      dayFact: input.dayFact,
      microActionText: input.microActionText,
      status: 'IN_PROGRESS',
    } as any,
  })

  return formatResult(entry, 'MORNING')
}

// ─── SAVE EVENING ─────────────────────────────────────────────────

export async function saveEveningCycle(
  input: EveningCycleInput
): Promise<DailyCycleResult> {
  const today = getTodayDate()

  const existing = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId: input.userId, date: today } },
  })

  if (existing) {
    const existingCycleType = (existing as any).cycleType
    const entry = await prisma.dailyEntry.update({
      where: { id: existing.id },
      data: {
        energyGain: input.energyGain,
        energyDrain: input.energyDrain,
        drain: input.drainEnum,
        programActive: input.programActive,
        actingFrom: input.actingFrom,
        todayWin: input.todayWin,
        microDone: input.microDone ?? false,
        dayFact: input.dayFact,
        status: 'COMPLETED',
        cycleType: existingCycleType === 'MORNING' ? existingCycleType : 'EVENING',
      } as any,
    })
    return formatResult(entry, 'EVENING')
  }

  const entry = await prisma.dailyEntry.create({
    data: {
      userId: input.userId,
      expertId: input.expertId,
      date: today,
      cycleType: 'EVENING',
      energyGain: input.energyGain,
      energyDrain: input.energyDrain,
      drain: input.drainEnum,
      programActive: input.programActive,
      actingFrom: input.actingFrom,
      todayWin: input.todayWin,
      microDone: input.microDone ?? false,
      dayFact: input.dayFact,
      status: 'COMPLETED',
      content: {},
    } as any,
  })
  return formatResult(entry, 'EVENING')
}

// ─── GET TODAY ────────────────────────────────────────────────────

export async function getTodayCycle(userId: string) {
  const today = getTodayDate()
  return prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date: today } },
    select: {
      id: true,
      date: true,
      cycleType: true,
      status: true,
      whoAmI: true,
      qualities: true,
      tenGoals: true,
      focusGoal: true,
      state: true,
      worthiness: true,
      energyGain: true,
      energyDrain: true,
      drain: true,
      programActive: true,
      actingFrom: true,
      todayWin: true,
      microActionText: true,
      microDone: true,
      dayFact: true,
    } as any,
  })
}

// ─── GET HISTORY (для weekly report) ─────────────────────────────

export async function getCycleHistory(
  userId: string,
  days = 7
) {
  const from = new Date()
  from.setDate(from.getDate() - days)

  return prisma.dailyEntry.findMany({
    where: {
      userId,
      date: { gte: from },
    },
    orderBy: { date: 'desc' },
    select: {
      date: true,
      state: true,
      drain: true,
      choice: true,
      actingFrom: true,
      todayWin: true,
      focusGoal: true,
      microDone: true,
      status: true,
    } as any,
  })
}

// ─── HELPERS ──────────────────────────────────────────────────────

function getTodayDate(): Date {
  const now = new Date()
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ))
}

function formatResult(entry: any, type: DailyCycleType): DailyCycleResult {
  return {
    id: entry.id,
    userId: entry.userId,
    date: entry.date.toISOString().split('T')[0],
    type,
    completed: entry.status === 'COMPLETED',
    createdAt: entry.createdAt,
  }
}
