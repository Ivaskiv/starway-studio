// backend/src/modules/funnel/routes.ts

import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';
import {
  attachFunnelProductHandler,
  createFunnelHandler,
  detachFunnelProductHandler,
  deleteFunnelHandler,
  generateAIFunnelHandler,
  getAttachableProductsHandler,
  getFunnelHandler,
  getFunnelsHandler,
  updateFunnelHandler,
} from './controller.js';

const router = Router();

// Всі маршрути захищені
router.use(authRequired);

// CRUD
router.get('/', getFunnelsHandler);
router.post('/', createFunnelHandler);

// AI Generation
router.post('/ai/generate', generateAIFunnelHandler);

// Funnel editor product links
// fix code_x: attach/detach product relations for FunnelEditorPage.
router.get('/:id/available-products', getAttachableProductsHandler);
router.post('/:id/products', attachFunnelProductHandler);
router.delete('/:id/products/:productId', detachFunnelProductHandler);

router.get('/:id', getFunnelHandler);
router.put('/:id', updateFunnelHandler);
router.delete('/:id', deleteFunnelHandler);

export default router;
