// frontend/src/features/microTask/types/types.ts

import { DecisionSource } from '@/features/ai-engine/decisions/types/decisions.types';
import { WheelArea } from '@/features/wheel/types/wheel.types';

export type MicroTaskStatus = 'PENDING' | 'COMPLETED' | 'skipped';

export type MicroTaskSource = (typeof MICRO_TASK_SOURCES)[number];

export type MicroTaskReason = 'low_score' | 'instability' | 'growth' | 'wheel_gap' | 'stagnation';

export const MICRO_TASK_SOURCES = [
  'questionsScheduler',
  'aiMentor',
  'course',
  'challenge',
  'manual',
] as const;

export interface MicroTask {
  id: string;
  userId: string;
  title: string;
  description?: string;

  type?: 'actionable' | 'reflection'; // для AI або follow-up
  persist?: boolean; // якщо true → зберігаємо в БД

  source: DecisionSource;
  reason?: MicroTaskReason;

  linkedQuestionId?: string; // якщо мікротаск з питання
  relatedEntity?: {
    type: 'question' | 'wheel' | 'mentor' | 'manual';
    id?: string;
  };

  status?: MicroTaskStatus;
  completedAt?: string;
  createdAt?: string;
  expiresAt?: string;

  // вплив на колесо / інші системи
  wheelImpact?: {
    area: WheelArea;
    delta: number; // +1, -1, +0.5
  };

  meta?: Record<string, any>; // додаткові дані з AI / follow-up
}
