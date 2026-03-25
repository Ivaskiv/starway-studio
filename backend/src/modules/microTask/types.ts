// backend/src/modules/microTask/types.ts
export type MicroTaskStatus = 'active' | 'done' | 'expired' | 'skipped';
export type MicroTaskPriority = 'high' | 'medium' | 'low';

export interface MicroTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  why?: string;
  steps?: string[];
  stepsCompleted?: boolean[];
  sphere?: string;
  priority?: MicroTaskPriority;
  xpReward?: number;
  daysToComplete?: number;
  source: string;
  linkedQuestionId?: string;
  status: MicroTaskStatus;
  createdAt: Date;
  expiresAt?: Date;
  completedAt?: Date;
}

export interface MicroTaskResponse {
  id: string;
  microTaskId: string;
  userId: string;
  completed: boolean;
  reflection?: string;
  createdAt: Date;
}
