// backend/src/modules/daily-cycle/types.ts

import type {
  DailyChoice,
  DailyDrain,
  DailyState,
  Prisma,
} from '@/db/generated/prisma/client.js';

// ======================================================
// MICRO SUPPORT (зберігається в JSON колонці Prisma)
// ======================================================

export interface MicroSupportItem {
  id: string;
  action: string;
  durationDays: number;
  completed?: boolean; // опціонально — відмітка виконання
}

// ======================================================
// ANSWERS
// ======================================================

export interface DailyAnswerInput {
  question: string;
  answer: string;
}
export interface DailyEntryForAi {
  answers: {
    question: string;
    answer: string;
  }[];
}
// ======================================================
// DTO З ФРОНТА (БЕЗ userId, date, id)
// ======================================================

export interface DailyEntryDTO {
  state: DailyState;
  drain?: DailyDrain | null;
  choice: DailyChoice;
  dayFact: string;
  microSupport?: MicroSupportItem[];
  answers?: DailyAnswerInput[];
}

// ======================================================
// SERVICE INPUT (ТЕ ЩО ПОТРІБНО СЕРВІСУ)
// ======================================================

export type JsonMicroSupport = Prisma.InputJsonValue; // замість MicroSupportItem[] напряму
export interface DailyEntryInput {
  id?: string; // робимо опційним для запиту на створення
  state: DailyState;
  drain?: DailyDrain | null;
  choice: DailyChoice;
  dayFact: string;
  microSupport?: JsonMicroSupport;
  date?: string | Date; // щоб можна було передавати строку з фронта
}

export interface UpsertDailyEntryInput extends DailyEntryInput {
  entryId: string;
  userId: string;
  expertId: string;
  date: Date;
}
export interface DailyEntryInput {
  state: DailyState;
  drain?: DailyDrain | null;
  choice: DailyChoice;
  dayFact: string;
  microSupport?: JsonMicroSupport;
}
// ======================================================
// DAILY ACCESS
// ======================================================

export interface DailyAccess {
  canCreateEntry: boolean;
  historyLimit: number;
}
// ======================================================
// EXPORT ENUMS
// ======================================================

export { DailyChoice, DailyDrain, DailyState };
