// backend/src/modules/daily/daily.types.ts
export type DailyEntryDTO = {
  state: 'stability' | 'innerSupport' | 'drain' | 'stressed' | 'neutral';
  drain?: string;
  goal?: string;
  goalCompleted?: boolean;
  choice: {
    type: 'conscious' | 'automatic' | 'guided';
    description: string;
  };
  decision?: string;
  decisionReason?: string;
  action?: string;
  dayFact?: string;
  microSupport?: string;
};

export type DailyEntry = {
  id: string;
  userId: string;
  state: string;
  drain?: string | null;
  goal?: string | null;
  goalCompleted?: boolean;
  choiceType: string;
  choiceDescription: string;
  decision?: string | null;
  decisionReason?: string | null;
  action?: string | null;
  dayFact?: string | null;
  microSupport?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DailyStats = {
  totalDays: number;
  stabilityRate: number;
  topDrain: string | null;
};
/**
 * Daily Cycle Types
 */

export type DailyState = 
  | 'TENSION' 
  | 'FEAR' 
  | 'STABILITY' 
  | 'INNER_SUPPORT';

export type DailyDrain = 
  | 'DOUBT' 
  | 'PROCRASTINATION' 
  | 'EMOTIONAL_DRAIN' 
  | 'EXTERNAL_PRESSURE';

export type DailyChoice = 
  | 'CONFIRMED_OLD' 
  | 'CHOSE_NEW';
  
export interface DailyCycleEntry {
  id: string;
  userId: string;
  date: string;
  state: DailyState;
  drain?: DailyDrain;
  choice: DailyChoice;
  dayFact: string;
  microSupport?: any;
  createdAt: string;
}

export interface DailyCycleInput {
  state: DailyState;
  drain?: DailyDrain;
  choice: DailyChoice;
  dayFact: string;
  microSupport?: any;
}