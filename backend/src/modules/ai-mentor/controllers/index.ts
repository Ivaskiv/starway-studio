// backend/src/modules/ai-mentor/controllers/index.ts

/**
 * 📦 CONTROLLERS BARREL EXPORT
 * Centralized export for all AI-Mentor controllers
 */

export * as affirmationController from './affirmation.js';
export * as chatController from './chat.js';
export * as dailyController from './daily.js';
export * as setupController from './setup.js';

// Alternative named exports for convenience
export { 
  generateMorningSession,
  generateEveningSession,
  generateAffirmation 
} from './affirmation.js';

export { 
  sendMessage,
  getSession,
  getChatHistory 
} from './chat.js';

export { 
  submitDailyCycle,
  submitDailyEntry,
  getDailyEntriesHandler,
  getLatestDailyEntryHandler,
  checkTodayEntry 
} from './daily.js';

export { 
  getProgress as getSetupProgress,
  setupWheel,
  setupQuestions,
  finishSetup 
} from './setup.js';

