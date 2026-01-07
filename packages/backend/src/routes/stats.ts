// packages/backend/src/routes/stats.ts

import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { sql } from '../db/client.js';

const router = Router();

/**
 * GET /api/stats/dashboard
 */
router.get('/dashboard', authRequired, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { period = '30d' } = req.query;

    // Mock stats для демо
    const stats = {
      totalFunnels: 0,
      activeFunnels: 0,
      totalUsers: 0,
      totalRevenue: 0,
      conversionRate: 0,
      avgTimeOnPlatform: 0,
      newUsersThisMonth: 0,
      revenueGrowth: 0,
    };

    // Реальні дані з БД (якщо є)
    const [funnelsCount] = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active
      FROM funnels
      WHERE owner_id = ${userId}
    `;

    stats.totalFunnels = parseInt(funnelsCount?.total || '0');
    stats.activeFunnels = parseInt(funnelsCount?.active || '0');

    res.json(stats);
  } catch (error: any) {
    console.error('❌ [Stats] Error:', error);
    res.status(500).json({ error: 'stats_failed' });
  }
});

export default router;