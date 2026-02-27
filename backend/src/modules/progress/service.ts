// backend/src/modules/progress/progress.service.ts
import { prisma } from '@/db/client.js';
import type { ProgressUpdate, UserProgress } from './types.js';

export async function getProgress(userId: string): Promise<UserProgress> {
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!userRecord) {
    const error = new Error('user_not_found');
    (error as any).code = 'P2025';
    throw error;
  }

  let progress = await prisma.userProgress.findUnique({
    where: { userId },
  });

  if (!progress) {
    progress = await prisma.userProgress.create({
      data: { userId },
    });
  }

  return {
    userId: progress.userId,
    totalPoints: progress.totalPoints,
    completedBlocks: progress.completedBlocks,
    level: progress.level,
    updatedAt: progress.updatedAt,
  };
}

export async function updateProgress(
  userId: string,
  data: ProgressUpdate
): Promise<UserProgress> {
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!userRecord) {
    const error = new Error('user_not_found');
    (error as any).code = 'P2025';
    throw error;
  }

  const progress = await prisma.userProgress.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });

  return {
    userId: progress.userId,
    totalPoints: progress.totalPoints,
    completedBlocks: progress.completedBlocks,
    level: progress.level,
    updatedAt: progress.updatedAt,
  };
}

export async function incrementPoints(
  userId: string,
  points: number
): Promise<UserProgress> {
  const current = await getProgress(userId);
  const newPoints = current.totalPoints + points;
  const newLevel = Math.floor(newPoints / 1000) + 1;

  return updateProgress(userId, {
    totalPoints: newPoints,
    level: newLevel,
  });
}
