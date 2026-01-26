// backend/src/routes/mentor.ts
import { Router } from 'express';
import { authRequired } from '../../middleware/auth';
import { chatMentor } from './mentor/mentor';

const router = Router();

router.post('/', authRequired, async (req, res) => {
  try {
    const result = await chatMentor(req.user!, req.body);
    res.json(result);
  } catch (err: any) {
    console.error('AI-Mentor error:', err);
    res.status(500).json({ error: 'mentor_failed' });
  }
});

export default router;
