// backend/src/modules/trial/types.ts
/**
 * Trial Types
 */

export interface TrialMirror {
  id: string;
  userId: string;
  day: number;
  analysis: string;
  statePattern: string;
  mainDrain: string;
  sphereImbalance?: string;
  createdAt: Date;
}

export interface TrialStatus {
  userId: string;
  isActive: boolean;
  startedAt: Date | null;
  endsAt: Date | null;
  daysLeft: number;
  currentDay: number;
  hasDay4Mirror: boolean;
  hasDay7Mirror: boolean;
}