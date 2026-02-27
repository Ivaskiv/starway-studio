// backend/src/modules/five-points/service.ts
import type { fivePointsRepo as RepoType } from './repo.js';
import type { FivePointsProgress } from './types.js';

const TOTAL_LESSONS = 5;
const POINTS_PER_LESSON = 20;
const DEFAULT_MODULE_ID = process.env.FIVE_POINTS_MODULE_ID || 'default-five-points-module';

export const fivePointsService = (repo: ReturnType<typeof RepoType>) => {
  const getOrCreateProgress = async (userId: string) => {
    let enrollment = await repo.getEnrollment(userId);

    if (!enrollment) {
      const created = await repo.createEnrollment(userId, DEFAULT_MODULE_ID);
      enrollment = await repo.getEnrollment(userId);
    }

    if (!enrollment) {
      throw new Error('progress_not_found');
    }

    return enrollment;
  };

  const completeLesson = async (userId: string): Promise<FivePointsProgress> => {
    const enrollment = await getOrCreateProgress(userId);
    const progress = enrollment.progress;

    const completedLessons = progress.completedLessons;
    const totalPoints = progress.totalPoints;

    if (completedLessons >= TOTAL_LESSONS) return progress;

    const updatedProgress: FivePointsProgress = {
      ...progress,
      completedLessons: completedLessons + 1,
      totalPoints: totalPoints + POINTS_PER_LESSON,
      completed: completedLessons + 1 >= TOTAL_LESSONS
    };

    await repo.updateProgress(enrollment.id, updatedProgress);

    return updatedProgress;
  };

  const isCompleted = (completedLessons: number) => completedLessons >= TOTAL_LESSONS;

  return {
    getOrCreateProgress,
    completeLesson,
    isCompleted
  };
};