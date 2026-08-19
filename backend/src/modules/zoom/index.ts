// backend/src/modules/zoom/index.ts
export { default as zoomRouter } from './api/routes.js';

export {
  createZoomSession,
  getUpcomingZoom,
  updateSession,
  cancelSession,
  createFullSession,
  getSessionById,
  getAllUpcomingSessionsForNotification,
} from './core/zoom.session.service.js';

export {
  getUpcomingZoomBookingView,
  getZoomBookingNotificationContext,
  registerAttendee,
  assertCanBookGroupPracticeSession,
  saveBookingQuestionForAttendee,
  saveBookingPreparationForAttendee,
} from './booking/zoom.booking.service.js';

export {
  getAvailableSlotsForUser,
  patchSessionRequests,
  bookSlot,
  unbookSlot,
} from './booking/zoom.slot-booking.service.js';

export {
  seedDefaultAvailability,
  generateSessionsFromAvailability,
} from './booking/zoom.availability.service.js';

export {
  getCalendarSessions,
  getCurrentWeekZoomOverview,
  getPublicCurrentWeekZoomOverview,
} from './calendar/zoom.calendar.service.js';

export {
  markAttended,
  savePostSessionReport,
  getSessionAttendees,
} from './attendance/zoom.attendance.service.js';

export {
  isActiveFocusSubscriber,
  getAvailablePrivateSlots,
  bookPrivateSlot,
  cancelPrivateBooking,
} from './private/zoom.private-booking.service.js';

export {
  getUserPreviousZoomSessionRecap,
  getUserLatestWeeklyReportSummary,
} from './reports/zoom.reports.service.js';

export {
  getSwapCandidates,
  createSwapRequest,
  acceptSwapRequest,
  declineSwapRequest,
} from './swaps/zoom.swap.service.js';

export {
  toggleCoachSlotStatus,
  initiateZoomSwap,
  expireStaleSwapRequests,
} from './swaps/zoom.swap-payment.service.js';

export {
  syncChannelPost,
} from './notifications/zoom.channel.service.js';

export {
  expireZoomSwapRequestsCron,
  scanZoomAvailabilityAutoGenerate,
  syncZoomWeeklyChannelPostCron,
} from './notifications/zoom.notifications.js';

export { cancelStaleBattlesCron } from './battle/battle.cron.js';
