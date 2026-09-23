// backend/src/modules/zoom/routes.ts

import { Router }        from 'express';
import { authRequired }  from '../../auth/middleware/auth.js';
import { telegramWebAppAuth } from '../../auth/middleware/auth.js';
import {
  createSession,
  getCurrentWeekSessions,
  getPublicCurrentWeekSessions,
  getUpcoming,
  register,
  saveBookingPreparation,
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
  handleCompleteSession,
  handleGetCompletionDraft,
  handleCancelSession,
  handleGetCalendarSessions,
  handleGetLeaderboard,
  handleInitiateBattle,
  handleAcceptBattle,
  handleDeclineBattle,
  handleSetBattleGoal,
  handleLogBattleProgress,
  handleGetEligibleOpponents,
  finalizeBattleResult,
  handleGetAvailability,
  handleGetCoachParticipants,
  handleGetAvailabilityWeek,
  handleGetIndividualAvailability,
  handleGetIndividualAvailabilitySummary,
  handleSaveAvailability,
  handleSaveAvailabilityWeek,
  handleGenerateSessions,
  handleBookSlot,
  handleUnbookSlot,
  handleGetAvailablePrivateSlots,
  handleBookPrivateSlot,
  handleCreateUserIndividualRequest,
  handleCancelPrivateSlotBooking,
  handleCreateSwapRequest,
  handleAcceptSwapRequest,
  handleDeclineSwapRequest,
  handleGetSwapCandidates,
  handleGetPendingSwapRequests,
  handleToggleCoachSlot,
  handleInitiateZoomSwap,
  getAvailableSlots,
  handleGetCommerceRequest,
  handleApproveCommerceRequest,
  handleRejectCommerceRequest,
} from './zoom.admin.handler.js';

const router = Router();

// ── Legacy routes (kept for backward compatibility) ───────────────────────────
router.post('/session',                        authRequired, createSession);
router.get('/upcoming',                        authRequired, getUpcoming);
router.get('/week',                            telegramWebAppAuth(), getCurrentWeekSessions);
router.post('/register',                       authRequired, register);
router.post('/booking-question',               authRequired, saveBookingQuestion);
router.post('/booking-preparation',            authRequired, saveBookingPreparation);
router.patch('/attendee/attended',             authRequired, markAttendedHandler);
router.patch('/session/:sessionId/report',     authRequired, postSessionReport);
router.get('/session/:sessionId/attendees',    authRequired, getAttendees);
router.get('/my',                              authRequired, getMySessions);
router.get('/public/week',                     getPublicCurrentWeekSessions);
router.get('/public/upcoming',                 getUpcoming);
router.get('/calendar',                        getPublicCalendarSessionsCompat);

// ── Calendar sessions ─────────────────────────────────────────────────────────
router.get('/sessions/calendar',               authRequired, handleGetCalendarSessions);
router.post('/sessions',                       authRequired, handleCreateSession);
router.put('/sessions/:id',                    authRequired, handleUpdateSession);
router.get('/sessions/:id/completion-draft',   authRequired, handleGetCompletionDraft);
router.patch('/sessions/:id/complete',         authRequired, handleCompleteSession);
router.delete('/sessions/:id',                 authRequired, handleCancelSession);

// ── Battle ────────────────────────────────────────────────────────────────────
router.get('/battle/leaderboard',              authRequired, handleGetLeaderboard);
router.get('/battle/eligible',                 authRequired, handleGetEligibleOpponents);
router.post('/battle/initiate',                authRequired, handleInitiateBattle);
router.post('/battle/:sessionId/accept',       authRequired, handleAcceptBattle);
router.post('/battle/:sessionId/decline',      authRequired, handleDeclineBattle);
router.put('/battle/:sessionId/goal',          authRequired, handleSetBattleGoal);
router.post('/battle/:sessionId/progress',     authRequired, handleLogBattleProgress);
router.patch('/battle/:sessionId/result',      authRequired, finalizeBattleResult);

// ── Availability ──────────────────────────────────────────────────────────────
router.get('/availability',                    authRequired, handleGetAvailability);
router.get('/coach/participants',               authRequired, handleGetCoachParticipants);
router.get('/availability/week',               authRequired, handleGetAvailabilityWeek);
router.get('/individual-availability/summary', authRequired, handleGetIndividualAvailabilitySummary);
router.get('/individual-availability',         authRequired, handleGetIndividualAvailability);
router.put('/availability',                    authRequired, handleSaveAvailability);
router.put('/availability/week',               authRequired, handleSaveAvailabilityWeek);
router.post('/availability/generate',          authRequired, handleGenerateSessions);

// ── Slot booking ──────────────────────────────────────────────────────────────
router.get('/slots/available',                telegramWebAppAuth(), getAvailableSlots);
router.post('/sessions/:id/book',             telegramWebAppAuth(), handleBookPrivateSlot);
router.post('/individual-requests',           authRequired, handleCreateUserIndividualRequest);
router.get('/commerce/requests/:id',           authRequired, handleGetCommerceRequest);
router.post('/commerce/requests/:id/approve',  authRequired, handleApproveCommerceRequest);
router.post('/commerce/requests/:id/reject',   authRequired, handleRejectCommerceRequest);
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
