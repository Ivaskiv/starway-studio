// backend/src/modules/microTask/types.ts
export type MicroTaskStatus = 'active' | 'COMPLETED' | 'expired';

export interface MicroTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  source: string;
  linkedQuestionId?: string;
  status: MicroTaskStatus;
  createdAt: Date;
  expiresAt?: Date;
}

export interface MicroTaskResponse {
  id: string;
  microTaskId: string;
  userId: string;
  completed: boolean;
  reflection?: string;
  createdAt: Date;
}
