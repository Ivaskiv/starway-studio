import {
  DailyChoice,
  DailyState,
} from '@/db/generated/prisma/client.js';

import type { Prisma } from '@/db/generated/prisma/client.js';

import { prisma } from '@/db/client.js';
import type {
  MicroSupportItem,
  UpsertDailyEntryInput,
} from './types.js';

// ============================================
// TYPE GUARD
// ============================================

function isMicroSupportArray(
  value: unknown
): value is MicroSupportItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        'action' in item &&
        'durationDays' in item
    )
  );
}

// ============================================
// GET OR CREATE
// ============================================

export async function getOrCreateTodayEntry(
  userId: string,
  expertId: string
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.dailyEntry.findFirst({
    where: { userId, date: today },
  });

  if (existing) return existing;

  return prisma.dailyEntry.create({
    data: {
      userId,
      expertId,
      date: today,
      state: DailyState.NEUTRAL,
      choice: DailyChoice.CONFIRMED_OLD,
      drain: null,
      dayFact: '',
      aiAnalysis: null,
      microSupport: [] as unknown as Prisma.InputJsonValue,
    },
  });
}

// ============================================
// UPSERT
// ============================================

export async function upsertDailyEntry(
  input: UpsertDailyEntryInput
) {
  const {
    entryId,
    userId,
    expertId,
    date,
    state,
    choice,
    drain,
    dayFact,
    microSupport,
  } = input;

  const jsonMicroSupport: Prisma.InputJsonValue =
    (microSupport ?? []) as unknown as Prisma.InputJsonValue;

  return prisma.dailyEntry.upsert({
    where: { id: entryId },
    update: {
      state,
      choice,
      drain,
      dayFact,
      microSupport: jsonMicroSupport,
    },
    create: {
      id: entryId,
      userId,
      expertId,
      date,
      state,
      choice,
      drain,
      dayFact,
      microSupport: jsonMicroSupport,
      aiAnalysis: null,
    },
  });
}

// ============================================
// GET MICRO TASKS
// ============================================

export async function getMicroTasks(
  entryId: string
): Promise<MicroSupportItem[]> {
  const entry = await prisma.dailyEntry.findUnique({
    where: { id: entryId },
    select: { microSupport: true },
  });

  if (!entry) return [];

  if (!isMicroSupportArray(entry.microSupport)) {
    return [];
  }

  return entry.microSupport;
}

// ============================================
// COMPLETE TASK
// ============================================

export async function completeMicroTask(
  entryId: string,
  taskId: string
) {
  const entry = await prisma.dailyEntry.findUnique({
    where: { id: entryId },
    select: { microSupport: true },
  });

  if (!entry) return null;

  if (!isMicroSupportArray(entry.microSupport)) {
    return null;
  }

  const updated = entry.microSupport.map((task) =>
    task.id === taskId
      ? { ...task, completed: true }
      : task
  );

  return prisma.dailyEntry.update({
    where: { id: entryId },
    data: {
      microSupport: updated as unknown as Prisma.InputJsonValue,
    },
  });
}

// ============================================
// HISTORY
// ============================================

export async function getDailyEntryHistory(
  userId: string,
  limit = 30
) {
  return prisma.dailyEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  });
}
