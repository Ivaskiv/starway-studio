// backend/src/modules/stats/routes.ts
import { prisma } from '../../db/client.js';
import { authRequired } from '../auth/middleware/auth.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { Response, Router } from 'express';

const router = Router();

router.get('/dashboard', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const totalEntries = await prisma.dailyEntry.count({
      where: { userId },
    });

    const totalMicroTasks = await prisma.microTask.count({
      where: { userId },
    });

    const completedTasks = await prisma.microTask.count({
      where: { userId, completedAt: { not: null } },
    });

    res.json({
      totalEntries: totalEntries,
      totalMicroTasks: totalMicroTasks,
      completedTasks: completedTasks,
      completionRate:
        totalMicroTasks > 0 ? Math.round((completedTasks / totalMicroTasks) * 100) : 0,
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ error: 'stats_failed' });
  }
});

export default router;
