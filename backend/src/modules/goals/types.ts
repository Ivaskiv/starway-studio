// backend/src/modules/goals/types.ts
/**
 * Goals Types
 */

export interface Goal {
  text: string;
  isPrimary: boolean;
  order: number;
}

export interface GoalsSet {
  id: string;
  userId: string;
  goals: Goal[];
  createdAt: Date;
}

export interface SetGoalsRequest {
  goals: string[];
  primaryIndex: number;
}