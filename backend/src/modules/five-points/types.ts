// backend/src/modules/five-points/types.ts


import { UserRole } from '@prisma/client';

export interface FivePointsModuleDTO {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FivePointsEnrollmentDTO {
  id: string;
  userId: string;
  moduleId: string;
  progress?: FivePointsProgressDTO;
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

export interface FivePointsUserDTO {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
