// backend/src/modules/daily-cycle/daily.mapper.ts
import type {
  Prisma,
  DailyAnswer as PrismaAnswer,
  DecisionCheck as PrismaCheck,
  DailyEntry as PrismaDailyEntry,
} from '@prisma/client';

import type { DailyEntry, MicroSupportItem } from './types.js';

/* ================== TYPES ================== */

type PrismaEntryWithRelations = PrismaDailyEntry & {
  answers: PrismaAnswer[];
  decisionChecks: PrismaCheck[];
};

/* ================== PRISMA → DOMAIN ================== */

export function mapDailyEntry(entry: PrismaEntryWithRelations): DailyEntry {
  let microSupport: MicroSupportItem[] = [];

  if (entry.microSupport) {
    try {
      const parsed =
        typeof entry.microSupport === 'string'
          ? JSON.parse(entry.microSupport)
          : entry.microSupport;

      if (Array.isArray(parsed)) {
        microSupport = parsed
          .filter(item => item?.id && item?.action)
          .map(item => ({
            id: String(item.id),
            action: String(item.action),
            durationDays: Number(item.durationDays) || 1,
          }));
      }
    } catch {
      microSupport = [];
    }
  }

  return {
    id: entry.id,
    userId: entry.userId,
    date: entry.date,
    state: entry.state,
    drain: entry.drain,
    choice: entry.choice,
    dayFact: entry.dayFact,
    microSupport,
    aiAnalysis: entry.aiAnalysis,
    answers: entry.answers.map(a => ({
      id: a.id,
      question: a.question,
      answer: a.answer,
      createdAt: a.createdAt,
    })),
    decisionChecks: entry.decisionChecks.map(dc => ({
      id: dc.id,
      choice: dc.choice,
      alignsWithGoal: dc.alignsWithGoal,
      isBetrayingDecision: dc.isBetrayingDecision,
      aiExplanation: dc.aiExplanation,
      createdAt: dc.createdAt,
    })),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/* ================== DOMAIN → PRISMA ================== */

export function mapDailyEntryToPrisma(
  entry: Partial<DailyEntry> & { userId: string },
): Prisma.DailyEntryUncheckedCreateInput {
  return {
    id: entry.id,
    userId: entry.userId,
    date: entry.date ?? new Date(),
    state: entry.state!,
    drain: entry.drain ?? null,
    choice: entry.choice!,
    dayFact: entry.dayFact ?? '',
    microSupport: entry.microSupport ? JSON.stringify(entry.microSupport) : JSON.stringify([]),
    aiAnalysis: entry.aiAnalysis ?? null,
    createdAt: entry.createdAt ?? new Date(),
    updatedAt: new Date(),
  };
}
