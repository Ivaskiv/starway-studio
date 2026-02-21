// backend/src/modules/daily-cycle/daily.service.ts
import { prisma } from '@/db/client.js';
import { generateDailyAiAnalysis } from './ai.js';
import { mapDailyEntry } from './mapper.js';
import type {
  AIAnalysisResult,
  CreateDailyEntryInput,
  DailyEntry,
  MicroTask,
  MicroTaskInput,
} from './types.js';

/* ======================================================
   GET TODAY ENTRY
====================================================== */
export async function getTodayEntry(userId: string): Promise<DailyEntry | null> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const entry = await prisma.dailyEntry.findFirst({
    where: { userId, date: { gte: startOfDay } },
    include: { answers: true, decisionChecks: true },
  });

  return entry ? mapDailyEntry(entry) : null;
}

/* ======================================================
   UPSERT DAILY ENTRY + ANSWERS
====================================================== */
export async function upsertDailyEntry(
  userId: string,
  input: CreateDailyEntryInput,
): Promise<DailyEntry> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.dailyEntry.findFirst({
    where: { userId, date: today },
  });

  const data = {
    userId,
    date: today,
    state: input.state,
    drain: input.drain ?? null,
    choice: input.choice,
    dayFact: input.dayFact ?? '',
    microSupport: JSON.stringify(input.microSupport ?? []),
    aiAnalysis: null,
  };

  const entry = existing
    ? await prisma.dailyEntry.update({
        where: { id: existing.id },
        data,
        include: { answers: true, decisionChecks: true },
      })
    : await prisma.dailyEntry.create({
        data,
        include: { answers: true, decisionChecks: true },
      });

  if (input.answers?.length) {
    await Promise.all(
      input.answers
        .filter(a => a.question?.trim() && a.answer?.trim())
        .map(a =>
          prisma.dailyAnswer.create({
            data: { dailyEntryId: entry.id, question: a.question!, answer: a.answer! },
          }),
        ),
    );
  }

  return mapDailyEntry(entry);
}

/* ======================================================
   GENERATE AI ANALYSIS + DECISION CHECKS + MICRO TASKS
====================================================== */
export async function generateAiAnalysis(entryId: string): Promise<string | null> {
  const entry = await prisma.dailyEntry.findUnique({
    where: { id: entryId },
    include: { answers: true, decisionChecks: true },
  });
  if (!entry || !entry.answers.length) return null;

  const domainEntry = mapDailyEntry(entry);
  const aiResult: AIAnalysisResult | null = await generateDailyAiAnalysis(domainEntry);
  if (!aiResult) return null;

  await prisma.dailyEntry.update({
    where: { id: entryId },
    data: { aiAnalysis: aiResult.analysis },
  });

  if (aiResult.decisionChecks?.length) {
    await Promise.all(
      aiResult.decisionChecks.map(dc =>
        prisma.decisionCheck.create({
          data: {
            userId: entry.userId,
            dailyEntryId: entry.id,
            choice: entry.choice,
            checkType: dc.checkType,
            alignsWithGoal: dc.result === 'pass',
            isBetrayingDecision: dc.result !== 'pass',
            aiExplanation: dc.explanation ?? '',
            comment: dc.comment ?? null,
            followUpAt: dc.dueDate != null ? new Date(Date.now() + dc.dueDate * 86400000) : null,
          },
        }),
      ),
    );
  }

  if (aiResult.microTasks?.length) {
    await upsertMicroTasks(entry.userId, entry.id, aiResult.microTasks);
  }

  return aiResult.analysis;
}

/* ======================================================
   UPSERT MICRO TASKS
====================================================== */
export async function upsertMicroTasks(
  userId: string,
  dailyEntryId: string,
  tasks: MicroTaskInput[],
): Promise<MicroTask[]> {
  return Promise.all(
    tasks.map(async task => {
      const dueDate =
        task.durationDays != null ? new Date(Date.now() + task.durationDays * 86400000) : null;
      const created = await prisma.microTask.create({
        data: {
          userId,
          title: task.title,
          description: task.description ?? null,
          source: 'ai',
          dueDate,
          linkedDailyEntryId: dailyEntryId,
          completed: false,
        },
      });
      return created;
    }),
  );
}

/* ======================================================
   HISTORY
====================================================== */
export async function getHistory(userId: string, limit: number): Promise<DailyEntry[]> {
  const entries = await prisma.dailyEntry.findMany({
    where: { userId },
    include: { answers: true, decisionChecks: true },
    orderBy: { date: 'desc' },
    take: limit,
  });
  return entries.map(mapDailyEntry);
}

/* ======================================================
   USER MICRO TASKS
====================================================== */
export async function getUserMicroTasks(userId: string): Promise<MicroTask[]> {
  return prisma.microTask.findMany({ where: { userId }, orderBy: { dueDate: 'asc' } });
}

/* ======================================================
   COMPLETE MICRO TASK
====================================================== */
export async function completeMicroTask(userId: string, taskId: string): Promise<MicroTask | null> {
  const task = await prisma.microTask.findFirst({ where: { id: taskId, userId } });
  if (!task) return null;
  return prisma.microTask.update({
    where: { id: taskId },
    data: { completed: true, completedAt: new Date() },
  });
}

export async function dailyService(userId: string, limit: number): Promise<DailyEntry[]> {
  const entries = await prisma.dailyEntry.findMany({
    where: { userId },
    include: { answers: true, decisionChecks: true },
    orderBy: { date: 'desc' },
    take: limit,
  });
  return entries.map(mapDailyEntry);
}
