import { PrismaClient } from '@prisma/client';

export const fivePointsRepo = (prisma: PrismaClient) => {
  const MODULE_ID = 'five-points-core';

  return {
    // ===== MODULE =====
    getModule: () =>
      prisma.fivePointsModule.findUnique({
        where: { id: MODULE_ID },
      }),

    // ===== ENROLLMENT =====
    getEnrollment: (userId: string) =>
      prisma.fivePointsEnrollment.findUnique({
        where: {
          userId_moduleId: {
            userId,
            moduleId: MODULE_ID,
          },
        },
        include: { progress: true },
      }),

    createEnrollment: (userId: string) =>
      prisma.fivePointsEnrollment.create({
        data: {
          userId,
          moduleId: MODULE_ID,
        },
      }),

    // ===== PROGRESS =====
    createProgress: (enrollmentId: string) =>
      prisma.fivePointsProgress.create({
        data: { enrollmentId },
      }),

    updateProgress: (
      enrollmentId: string,
      data: { completedLessons?: number; totalPoints?: number }
    ) =>
      prisma.fivePointsProgress.update({
        where: { enrollmentId },
        data,
      }),

    // ===== ADMIN =====
    getAllProgress: () =>
      prisma.fivePointsProgress.findMany({
        include: {
          enrollment: {
            include: { user: true },
          },
        },
      }),
  };
};
