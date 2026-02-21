// backend/src/modules/zoom/routes.ts
import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';
import { createSession, getAttendees, getUpcoming, register, saveDecision } from './controller.js';

const router = Router();

router.post('/session', authRequired, createSession);
router.get('/upcoming', authRequired, getUpcoming);
router.post('/register', authRequired, register);
router.post('/decision', authRequired, saveDecision);
router.get('/session/:sessionId/attendees', authRequired, getAttendees);

export default router;
