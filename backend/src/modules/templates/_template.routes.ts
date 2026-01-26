// starway-studio/backend/src/routes/_template.routes.ts

import { Router } from 'express';
import type { Request, Response } from 'express';
import { authRequired } from '../../middleware/auth';

/**
 * 1. Типи запиту
 */
interface Params {
  id?: string;
}

interface Query {
  page?: string;
}

interface Body {
  title?: string;
  description?: string;
}

/**
 * 2. Router
 */
const router = Router();

/**
 * 3. Handlers
 */
router.post('/', authRequired, async (req: Request<Params, any, Body>, res: Response) => {
  try {
    const user = req.user;
    const body = req.body;

    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    if (!body.title) {
      return res.status(400).json({ error: 'title_required' });
    }

    // бізнес-логіка тут
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[POST /]', err);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
