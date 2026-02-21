// backend/src/modules/five-points/service.ts
const TOTAL_LESSONS = 5;
const POINTS_PER_LESSON = 20;

export const fivePointsService = (repo: ReturnType<any>) => {
  const getOrCreateProgress = async (userId: string) => {
    let enrollment = await repo.getEnrollment(userId);

    if (!enrollment) {
      const created = await repo.createEnrollment(userId);
      await repo.createProgress(created.id);
      enrollment = await repo.getEnrollment(userId);
    }

    return enrollment!;
  };

  const completeLesson = async (userId: string) => {
    const enrollment = await getOrCreateProgress(userId);
    const progress = enrollment.progress!;

    if (progress.completedLessons >= TOTAL_LESSONS) {
      return progress;
    }

    return repo.updateProgress(enrollment.id, {
      completedLessons: progress.completedLessons + 1,
      totalPoints: progress.totalPoints + POINTS_PER_LESSON,
    });
  };

  const isCompleted = (completedLessons: number) =>
    completedLessons >= TOTAL_LESSONS;

  return {
    getOrCreateProgress,
    completeLesson,
    isCompleted,
  };
};
