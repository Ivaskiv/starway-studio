// backend/src/modules/daily-cycle/daily.types.ts
import { DailyChoice, DailyDrain, DailyState } from '@prisma/client';

export interface MicroSupportItem {
  id: string;
  action: string;
  durationDays: number;
}

export interface DailyAnswer {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
}
export interface DailyAnswerInput {
  question: string;
  answer: string;
}



export interface CreateDailyEntryInput {
  state: DailyState;
  drain?: DailyDrain | null;
  choice: DailyChoice;
  dayFact?: string;
  answers?: Partial<DailyAnswerInput>[];
  microSupport?: MicroSupportItem[];
}


export interface DecisionCheck {
  id: string;
  choice: DailyChoice;
  alignsWithGoal: boolean;
  isBetrayingDecision: boolean;
  aiExplanation: string;
  createdAt: Date;
}

export interface DecisionCheckInput {
  checkType: string;              // "goal_alignment", "fear_based", ...
  result: 'pass' | 'fail';        // AI verdict
  comment?: string;               // коротко
  explanation?: string;           // розгорнуто
  dueDate?: number | null;        // days
}


export interface MicroTask {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  source: string;
  completed: boolean;
  completedAt: Date | null;
  dueDate: Date | null;
  linkedDailyEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MicroTaskInput {
  title: string;
  description?: string;
  durationDays?: number; 
}


export interface DailyEntry {
  id: string;
  userId: string;
  date: Date;
  state: DailyState;
  drain: DailyDrain | null;
  choice: DailyChoice;
  dayFact: string;
  microSupport: MicroSupportItem[];
  aiAnalysis: string | null;
  answers: DailyAnswer[];
  decisionChecks: DecisionCheck[];
  createdAt: Date;
  updatedAt: Date;
}


export interface DailyAccess {
  canCreateEntry: boolean;
  historyLimit: number | null;
  microTaskLimit: number | null;
  pdfAccess: boolean;
  daysLeft?: number;
}

export interface AIAnalysisResult {
  analysis: string;
  microTasks?: MicroTaskInput[];
}
export interface AIAnalysisResult {
  analysis: string;
  microTasks?: MicroTaskInput[];
  decisionChecks?: DecisionCheckInput[];
}


//==================

export interface DailyEntry {
  id: string;
  userId: string;
  date: Date;
  state: DailyState;
  drain: DailyDrain | null;
  choice: DailyChoice;
  dayFact: string;
  microSupport: MicroSupportItem[];
  aiAnalysis: string | null;
  answers: DailyAnswer[];
  decisionChecks: DecisionCheck[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Daily Cycle Types
 */


export interface DailyCycleEntry {
  id: string;
  userId: string;
  date: Date;
  state: DailyState;
  drain?: DailyDrain;
  choice: DailyChoice;
  dayFact: string;
  microSupport?: any;
  createdAt: Date;
}