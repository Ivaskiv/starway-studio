// backend/src/modules/mini-courses/routes.ts
/**
 * Mini-Courses Routes
 */

import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';
import {
  enroll,
  getCourse,
  getCourses,
  getMyEnrollments,
  getRecommendations,
} from './controller.js';

const router = Router();

router.get('/recommendations', authRequired, getRecommendations);
router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/enroll', authRequired, enroll);
router.get('/my/enrollments', authRequired, getMyEnrollments);

export default router;
