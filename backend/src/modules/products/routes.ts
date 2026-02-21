// backend/src/modules/products/routes.ts
/**
 * Products Routes - FINAL
 */

import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';
import {
  checkAccess,
  createProductHandler,
  deleteProductHandler,
  enrollInProduct,
  getMyProducts,
  getProduct,
  getProducts,
  updateProductHandler,
} from './controller.js';

const router = Router();

// User routes (auth required)
// fix code_x: keep "/my" routes BEFORE "/:id", otherwise "my" is captured as product id.
router.get('/my', authRequired, getMyProducts);
router.get('/my/list', authRequired, getMyProducts);
router.post('/:id/enroll', authRequired, enrollInProduct);
router.get('/:id/access', authRequired, checkAccess);

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Admin routes (auth required)
router.post('/', authRequired, createProductHandler);
router.put('/:id', authRequired, updateProductHandler);
router.delete('/:id', authRequired, deleteProductHandler);

export default router;
