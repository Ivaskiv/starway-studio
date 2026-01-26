import { Router } from 'express';
import { authRequired } from '../../middleware/auth';
import sql from '../../db/client';

const router = Router();

// GET /progress
router.get('/', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id;
    let [p] = await sql`SELECT * FROM user_progress WHERE user_id = ${user_id} LIMIT 1`;
    if (!p) {
      [p] = await sql`INSERT INTO user_progress (user_id) VALUES (${user_id}) RETURNING *`;
    }

    const totalPoints = Number(p.total_points) || 0;
    const completedBlocks = Number(p.completed_blocks) || 0;
    const level = Number(p.level) || 1;

    res.json({ totalPoints, completedBlocks, level });
  } catch (err: any) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

export default router;
