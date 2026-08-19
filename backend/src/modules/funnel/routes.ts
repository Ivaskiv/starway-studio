// backend/src/modules/funnel/routes.ts

import { Router } from 'express';
import { authRequired } from '../auth/middleware/auth.js';

import {
  createFunnelHandler,
  createCustomWorkflow,
  createWorkflowFromCourses,
  oneClickCreateFunnel,
} from './controller.js';

import {
  getFunnels,
  getFunnelById,
  updateFunnel,
  deleteFunnel,
} from './index.js';

import type { AuthenticatedRequest } from '../../types/globalTypes.js';
import type { Response } from 'express';

const router = Router();

// 🔐 Усі маршрути захищені
router.use(authRequired);

// ────────────────────────────────────────────────
// WORKFLOW ROUTES
// ────────────────────────────────────────────────

router.post('/workflow/custom', createCustomWorkflow);
router.post('/workflow/from-courses', createWorkflowFromCourses);
router.post('/workflow/quick', oneClickCreateFunnel);

// ────────────────────────────────────────────────
// CRUD FUNNELS
// ────────────────────────────────────────────────

// GET ALL
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const ownerId = req.user?.id;
  const funnels = await getFunnels(ownerId);
  return res.json(funnels);
});

// GET BY ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const funnel = await getFunnelById(req.params.id, req.user?.id);
  if (!funnel) return res.status(404).json({ error: 'funnel_not_found' });
  return res.json(funnel);
});

// CREATE
router.post('/', createFunnelHandler);

// UPDATE
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await updateFunnel(
      req.params.id,
      {
        name: req.body.name,
        status: req.body.status,
      },
      req.user?.id,
    );

    return res.json(updated);
  } catch (err) {
    return res.status(404).json({ error: 'funnel_not_found' });
  }
});

// DELETE
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await deleteFunnel(req.params.id, req.user?.id);
    return res.json({ success: true });
  } catch {
    return res.status(404).json({ error: 'funnel_not_found' });
  }
});

export default router;