// backend/src/modules/zoom/routes.ts

import { Router }        from 'express';
import { authRequired }  from '../../modules/auth/middleware/auth.js';
import {
  createSession,
  getUpcoming,
  register,
  markAttendedHandler,
  postSessionReport,
  getAttendees,
  getMySessions,
} from './controller.js';
import {
  handleCreateSession,
  handleUpdateSession,
  handleCancelSession,
  handleGetCalendarSessions,
  handleGetLeaderboard,
  handleInitiateBattle,
  handleLogBattleProgress,
  handleGetEligibleOpponents,
  finalizeBattleResult,
  handleGetAvailability,
  handleSaveAvailability,
  handleGenerateSessions,
  handleBookSlot,
  handleUnbookSlot,
} from './zoom.admin.handler.js';

const router = Router();

// ── Legacy routes (kept for backward compatibility) ───────────────────────────
router.post('/session',                        authRequired, createSession);
router.get('/upcoming',                        authRequired, getUpcoming);
router.post('/register',                       authRequired, register);
router.patch('/attendee/attended',             authRequired, markAttendedHandler);
router.patch('/session/:sessionId/report',     authRequired, postSessionReport);
router.get('/session/:sessionId/attendees',    authRequired, getAttendees);
router.get('/my',                              authRequired, getMySessions);

// ── Calendar sessions ─────────────────────────────────────────────────────────
router.get('/sessions/calendar',               authRequired, handleGetCalendarSessions);
router.post('/sessions',                       authRequired, handleCreateSession);
router.put('/sessions/:id',                    authRequired, handleUpdateSession);
router.delete('/sessions/:id',                 authRequired, handleCancelSession);

// ── Battle ────────────────────────────────────────────────────────────────────
router.get('/battle/leaderboard',              authRequired, handleGetLeaderboard);
router.get('/battle/eligible',                 authRequired, handleGetEligibleOpponents);
router.post('/battle/initiate',                authRequired, handleInitiateBattle);
router.post('/battle/:sessionId/progress',     authRequired, handleLogBattleProgress);
router.patch('/battle/:sessionId/result',      authRequired, finalizeBattleResult);

// ── Availability ──────────────────────────────────────────────────────────────
router.get('/availability',                    authRequired, handleGetAvailability);
router.put('/availability',                    authRequired, handleSaveAvailability);
router.post('/availability/generate',          authRequired, handleGenerateSessions);

// ── Slot booking ──────────────────────────────────────────────────────────────
router.post('/sessions/:id/book',              authRequired, handleBookSlot);
router.post('/sessions/:id/unbook',            authRequired, handleUnbookSlot);

export default router;
