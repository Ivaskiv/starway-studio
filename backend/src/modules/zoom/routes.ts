// backend/src/modules/zoom/routes.ts

import { Router }        from 'express';
import { authRequired }  from '@/modules/auth/middleware/auth.js';
import {
  createSession,
  getUpcoming,
  register,
  markAttendedHandler,
  postSessionReport,
  getAttendees,
} from './controller.js';

const router = Router();

router.post('/session',                        authRequired, createSession);
router.get('/upcoming',                        authRequired, getUpcoming);
router.post('/register',                       authRequired, register);
router.patch('/attendee/attended',             authRequired, markAttendedHandler);
router.patch('/session/:sessionId/report',     authRequired, postSessionReport);
router.get('/session/:sessionId/attendees',    authRequired, getAttendees);

export default router;