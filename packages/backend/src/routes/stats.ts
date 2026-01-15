// packages/backend/src/routes/stats.ts

import { Router } from 'express';
import { sql } from '../db/client.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/stats/dashboard
 */
router.get('/dashboard', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const { period = '30d' } = req.query;

    // Mock stats для демо
    const stats = {
      total_funnels: 0,
      active_funnels: 0,
      total_users: 0,
      total_revenue: 0,
      conversion_rate: 0,
      avg_time_on_platform: 0,
      new_users_this_month: 0,
      revenue_growth: 0,
    };

    // Реальні дані з БД (якщо є)
    const [funnelsCount] = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active
      FROM funnels
      WHERE owner_id = ${user_id}
    `;

    stats.total_funnels = parseInt(funnelsCount?.total || '0');
    stats.active_funnels = parseInt(funnelsCount?.active || '0');

    res.json(stats);
  } catch (error: any) {
    console.error('❌ [Stats] Error:', error);
    res.status(500).json({ error: 'stats_failed' });
  }
});

export default router;