// backend/src/modules/progress/progress.types.ts

export interface UserProgress {
  userId: string;
  totalPoints: number;
  completedBlocks: number;
  level: number;
  updatedAt: Date;
}

export interface ProgressUpdate {
  totalPoints?: number;
  completedBlocks?: number;
  level?: number;
}