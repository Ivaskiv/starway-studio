// backend/src/modules/ai-mentor/services/index.ts
/**
 * Services Index
 */

export * from './ai.js';
export * from './chat.js';
export * from './session.js';
export * from './setup.js';
export * from './daily.js';
export * from './context.js';
// /**
//  * AI Mentor Service - MAIN ORCHESTRATOR
//  * Delegates to specialized services
//  */

// import { MentorRole } from '@prisma/client';
// import { generateOnboardingResponse } from '../ai.js';
// import { MentorChatResponse, SendMessageDto, STAGE_CONFIGS } from '../types/types.js';

// // Import services
// import {
//   getChatHistory,
//   getOrCreateSession,
//   getSession,
//   saveMessage,
//   updateSessionActivity,
// } from './session.js';

// import {
//   canAccessStage,
//   completeStage,
//   getProgress,
//   updateLastActivity,
//   updateProgress,
// } from './controller.js';

// import { buildAIContext, buildSessionContext, getUserContext } from './context.js';

// import { monthlyWheelCheck, processWheel } from './wheel.js';

// import {
//   dailyCycle, // ← ADDED
//   getDailyEntries, // ← ADDED
//   getLatestDailyEntry,
//   handleDailyCycleEntry, // ← ADDED
//   hasTodayEntry, // ← ADDED
// } from '../services/daily.js';

// // Re-export for backward compatibility
// export {
//   buildAIContext,
//   buildSessionContext,
//   canAccessStage,
//   completeStage,
//   // Daily
//   dailyCycle,
//   getChatHistory, // ← ADDED
//   getDailyEntries, // ← ADDED
//   getLatestDailyEntry,
//   // Session
//   getOrCreateSession,
//   // Onboarding
//   getProgress,
//   getSession,
//   // Context
//   getUserContext,
//   handleDailyCycleEntry, // ← ADDED
//   hasTodayEntry,
//   monthlyWheelCheck,
//   // Wheel
//   processWheel,
//   saveMessage,
//   updateLastActivity,
//   updateProgress,
//   updateSessionActivity,
// };

// /**
//  * Send message to AI mentor
//  */
// export async function sendMessage(dto: SendMessageDto): Promise<MentorChatResponse> {
//   console.log(`[MentorService] Processing message from user: ${dto.userId}`);

//   try {
//     // 1. Get or create session
//     const session = await getOrCreateSession(dto.userId, dto.sessionId);

//     // 2. Get onboarding progress
//     const progress = await getProgress(dto.userId);

//     // 3. Check access
//     const canAccess = await canAccessStage(dto.userId, progress.currentStage);
//     if (!canAccess) {
//       throw new Error('Cannot access current onboarding stage yet');
//     }

//     // 4. Get stage config
//     const stageConfig = STAGE_CONFIGS[progress.currentStage];

//     // 5. Build AI context
//     const aiContext = await buildAIContext(
//       dto.userId,
//       stageConfig.systemPrompt,
//       session.messages?.map(m => ({ role: m.role, text: m.text })) || [],
//     );

//     // 6. Get chat history for AI
//     const chatHistory =
//       session.messages?.slice(-10).map(m => ({
//         role: m.role === MentorRole.user ? ('user' as const) : ('assistant' as const),
//         content: m.text,
//       })) || [];

//     // 7. Get session context
//     const userContext = await getUserContext(dto.userId);
//     const sessionContext = await buildSessionContext(dto.userId, userContext.name || 'Друже');

//     // 8. Call AI
//     const aiResponse = await generateOnboardingResponse(
//       dto.message,
//       aiContext,
//       chatHistory,
//       sessionContext,
//     );

//     // 9. Save user message
//     const userMessage = await saveMessage({
//       sessionId: session.id,
//       userId: dto.userId,
//       role: 'user',
//       text: dto.message,
//       metadata: {
//         onboardingStage: progress.currentStage,
//         ...dto.context,
//       },
//     });

//     // 10. Save mentor message
//     const mentorMessage = await saveMessage({
//       sessionId: session.id,
//       userId: dto.userId,
//       role: 'mentor',
//       text: aiResponse.content,
//       metadata: {
//         onboardingStage: progress.currentStage,
//         suggestions: aiResponse.suggestions,
//         ...aiResponse.metadata,
//       },
//     });

//     // 11. Update session activity
//     await updateSessionActivity(session.id, progress.currentStage);

//     // 12. Update user activity
//     await updateLastActivity(dto.userId);

//     // 13. Reload session with new messages
//     const updatedSession = await getSession(dto.userId, session.id);

//     return {
//       session: updatedSession,
//       userMessage,
//       mentorMessage,
//       onboardingProgress: progress,
//       suggestions: aiResponse.suggestions,
//     };
//   } catch (error: any) {
//     console.error(`[MentorService] Error:`, error.message);
//     throw error;
//   }
// }
