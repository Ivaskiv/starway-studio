// backend/src/modules/daily-cycle/types.ts

import type {
  DailyChoice,
  DailyDrain,
  DailyState,
  Prisma,
} from '@starway/db/prisma-client';

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

export interface DayAnalysisResult {
  energy_level?: 'high' | 'medium' | 'low';
  focus_level?: 'high' | 'medium' | 'low';
  drain_level?: 'high' | 'medium' | 'low';
  main_insight: string;
  what_worked?: string[];
  active_pattern?: {
    title?: string;
    description?: string;
  };
  energy_drain_summary?: string;
  drain_chips?: string[];
  tomorrow?: string[];
}

export interface DailyEntryForAi {
  date: string;
  morning: {
    identity?: string;
    qualities?: string;
    focus?: string;
    state?: string;
    worthy?: string;
    goals?: string[];
  };
  evening: {
    win?: string;
    energy_in?: string;
    energy_out?: string;
    program?: string;
    power_source?: string;
  };
  tasks: {
    text: string;
    completed: boolean;
  }[];
}

export interface SaveDailyAnswerInput {
  entryId?: string;
  session: 'morning' | 'evening';
  questionId: string;
  answer: string;
  date: string;
  lastQuestionIndex: number;
  channel?: 'tg' | 'miniapp' | 'web';
}

export interface SkipDailyEntryInput {
  date: string;
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
  expertId?: string;
  finalize?: boolean;
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
  answers?: DailyAnswerInput[];
  microSupport?: JsonMicroSupport;
  date?: string | Date; // щоб можна було передавати строку з фронта
  finalize?: boolean;
}

export interface UpsertDailyEntryInput extends DailyEntryInput {
  entryId: string;
  userId: string;
  expertId: string;
  date: Date;
}

export interface DailyStats {
  totalDays: number;
  stabilityRate: number;
  topDrain: string | null;
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
