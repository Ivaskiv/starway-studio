// backend/src/modules/five-points/admin.service.ts

import { FivePointsProgress } from "./types.js";


// Тип рядка прогресу, без implicit any
type ProgressRow = Pick<FivePointsProgress, 'completedLessons' | 'totalPoints'>;

export const fivePointsAdminService = (repo: { getAllProgress: () => Promise<ProgressRow[]> }) => {
  const getStats = async () => {
    const progress = await repo.getAllProgress();
    const totalUsers = progress.length;

    // користувачі, що завершили всі уроки (5)
    const completed = progress.filter((p) => p.completedLessons >= 5).length;

    // середнє число завершених уроків
    const avgLessonsCompleted =
      totalUsers === 0
        ? 0
        : Number(
            (
              progress.reduce((sum, p) => sum + p.completedLessons, 0) /
              totalUsers
            ).toFixed(2)
          );

    return {
      totalUsers,
      completed,
      completionRate: totalUsers ? completed / totalUsers : 0,
      avgLessonsCompleted,
    };
  };

  return { getStats };
};