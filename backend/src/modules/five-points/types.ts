import { FivePointsModule } from '../../db/generated/prisma/client.js';
import { UserRole } from '../../types/globalTypes.js';

export type FivePointsProgress = {
  [key: string]: unknown;
  steps: Array<{
    id: string;
    completed: boolean;
    completedAt?: string;
  }>;
  completed: boolean;
  completedLessons: number;
  totalPoints: number;
};

export interface FivePointsEnrollment {
  id: string;
  userId: string;
  moduleId: string;
  progress: FivePointsProgress;
  enrolledAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  module?: FivePointsModule;
}

export interface FivePointsCourse {
  id: string;
  code: string;
  name: string;
  description?: string;
  modules: FivePointsModule[];
}

export interface FivePointsUserDTO {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface FivePointsProgressDTO {
  id: string;
  enrollmentId: string;
  completedLessons: number;
  totalPoints: number;
  updatedAt: Date;
}

export interface FivePointsEnrollmentDTO {
  id: string;
  userId: string;
  moduleId: string;
  progress: FivePointsProgressDTO;
  createdAt: Date;
  updatedAt: Date;
}