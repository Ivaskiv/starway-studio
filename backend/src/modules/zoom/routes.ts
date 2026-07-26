// backend/src/modules/zoom/routes.ts

import { Router }        from 'express';
import { authRequired }  from '../../modules/auth/middleware/auth.js';
import { telegramWebAppAuth } from '../../modules/auth/middleware/auth.js';
import {
  createSession,
  getCurrentWeekSessions,
  getPublicCurrentWeekSessions,
  getUpcoming,
  register,
  saveBookingQuestion,
  markAttendedHandler,
  postSessionReport,
  getAttendees,
  getMySessions,
  getPublicCalendarSessionsCompat,
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
  handleGetAvailablePrivateSlots,
  handleBookPrivateSlot,
  handleCancelPrivateSlotBooking,
  handleCreateSwapRequest,
  handleAcceptSwapRequest,
  handleDeclineSwapRequest,
  handleGetSwapCandidates,
  handleGetPendingSwapRequests,
  handleToggleCoachSlot,
  handleInitiateZoomSwap,
  getAvailableSlots,
} from './zoom.admin.handler.js';

const router = Router();

// ── Legacy routes (kept for backward compatibility) ───────────────────────────
router.post('/session',                        authRequired, createSession);
router.get('/upcoming',                        authRequired, getUpcoming);
router.get('/week',                            telegramWebAppAuth(), getCurrentWeekSessions);
router.post('/register',                       authRequired, register);
router.post('/booking-question',               authRequired, saveBookingQuestion);
router.patch('/attendee/attended',             authRequired, markAttendedHandler);
router.patch('/session/:sessionId/report',     authRequired, postSessionReport);
router.get('/session/:sessionId/attendees',    authRequired, getAttendees);
router.get('/my',                              authRequired, getMySessions);
router.get('/public/week',                     getPublicCurrentWeekSessions);
router.get('/calendar',                        getPublicCalendarSessionsCompat);

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
router.get('/slots/available',                telegramWebAppAuth(), getAvailableSlots);
router.post('/sessions/:id/book',             telegramWebAppAuth(), handleBookPrivateSlot);
router.post('/sessions/:id/unbook',            authRequired, handleUnbookSlot);
router.get('/sessions/private/available',      authRequired, handleGetAvailablePrivateSlots);
router.delete('/sessions/:id/book',            authRequired, handleCancelPrivateSlotBooking);
router.post('/swap',                           authRequired, handleCreateSwapRequest);
router.get('/swap/options',                    authRequired, handleGetSwapCandidates);
router.post('/swap/:swapId/accept',            authRequired, handleAcceptSwapRequest);
router.post('/swap/:swapId/decline',           authRequired, handleDeclineSwapRequest);
router.get('/swap/pending',                    authRequired, handleGetPendingSwapRequests);
router.post('/swap/initiate',                  authRequired, handleInitiateZoomSwap);
router.post('/slot/toggle',                    authRequired, handleToggleCoachSlot);

export default router;
