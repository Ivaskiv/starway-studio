// backend/src/modules/access/routes.ts
import express from 'express'; // <-- імпортуємо весь модуль
import { authRequired } from '@/modules/auth/middleware/auth.js';
import { checkFeatureAccess, getMyAccess, getMySystemState } from './controller.js';

const router = express.Router(); // <-- створюємо роутер через express.Router()

// Використовуємо authRequired як middleware
router.use(authRequired);

// Маршрути
router.get('/me', getMyAccess);
router.get('/state', getMySystemState);
router.get('/check/:feature', checkFeatureAccess);

export default router;