// backend/src/routes/ai.ts
import { Router } from 'express';
import { authRequired } from '../../middleware/auth';
import { runAI } from './ai-engine';

const router = Router();

router.post('/', authRequired, async (req, res) => {
  try {
    const result = await runAI(req.user!, req.body);
    res.json(result);
  } catch (err: any) {
    if (err.message === 'AI_LIMIT_REACHED') {
      return res.status(429).json({ error: 'limit_reached' });
    }

    console.error('AI error:', err);
    res.status(500).json({ error: 'ai_failed' });
  }
});

export default router;

