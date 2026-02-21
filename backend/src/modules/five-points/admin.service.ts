// backend/src/modules/five-points/admin.service.ts
export const fivePointsAdminService = (repo: ReturnType<any>) => {
  const getStats = async () => {
    const progress = await repo.getAllProgress();

    const totalUsers = progress.length;
    const completed = progress.filter(p => p.completedLessons >= 5).length;

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
