import { prisma } from '@/db/client.js';
import type { FivePointsEnrollment, FivePointsProgress } from './types.js';
import { Prisma } from '@/db/generated/prisma/client.js';



export function fivePointsRepo() {
  return {
    async getEnrollment(userId: string): Promise<FivePointsEnrollment | null> {
      const record = await prisma.fivePointsEnrollment.findFirst({
        where: { userId },
        include: { module: true }
      });

      if (!record) return null;

      const progress = record.progress as FivePointsProgress;

      return {
        id: record.id,
        userId: record.userId,
        moduleId: record.moduleId,
        progress,
        enrolledAt: record.enrolledAt,
        completedAt: record.completedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        module: record.module
      };
    },

    async createEnrollment(
      userId: string,
      moduleId: string,
      progress?: FivePointsProgress
    ): Promise<FivePointsEnrollment> {
      const defaultProgress: FivePointsProgress = {
        steps: [],
        completed: false,
        completedLessons: 0,
        totalPoints: 0
      };

      const record = await prisma.fivePointsEnrollment.create({
        data: {
          userId,
          moduleId,
          progress: (progress || defaultProgress) as Prisma.InputJsonValue
        },
        include: { module: true }
      });

      const progressObj = record.progress as FivePointsProgress;

      return {
        id: record.id,
        userId: record.userId,
        moduleId: record.moduleId,
        progress: progressObj,
        enrolledAt: record.enrolledAt,
        completedAt: record.completedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        module: record.module
      };
    },

    async updateProgress(
      enrollmentId: string,
      progress: FivePointsProgress
    ): Promise<{ progress: FivePointsProgress }> {
      const record = await prisma.fivePointsEnrollment.update({
        where: { id: enrollmentId },
        data: { progress: progress as Prisma.InputJsonValue },
        select: { progress: true }
      });

      const progressObj = record.progress as FivePointsProgress;

      return { progress: progressObj };
    },

    async getAllProgress(): Promise<FivePointsProgress[]> {
      const records = await prisma.fivePointsEnrollment.findMany({
        select: { progress: true }
      });

      return records.map(r => r.progress as FivePointsProgress);
    }
  };
}