// // backend/src/modules/trial/scheduler.ts
// /**
//  * Trial Scheduler
//  * Auto-generate mirrors on day 4 and day 7
//  */

// import { prisma } from '../../db/client.js';
// import { generateTrialMirror } from './service.js';

// export async function scheduleTrialMirror(userId: string, day: 4 | 7) {
//   // In production, use cron job or queue
//   // For now, manual trigger
//   console.log(`[Trial] Scheduled mirror for user ${userId} on day ${day}`);
// }

// export async function runTrialMirrorCheck() {
//   const users = await prisma.user.findMany({
//     where: {
//       trialStartsAt: { not: null },
//       trialEndsAt: { gte: new Date() }
//     }
//   });

//   for (const user of users) {
//     if (!user.trialStartsAt) continue;

//     const daysPassed = Math.floor(
//       (Date.now() - user.trialStartsAt.getTime()) / (1000 * 60 * 60 * 24)
//     );

//     if (daysPassed === 4 || daysPassed === 7) {
//       await generateTrialMirror(user.id, daysPassed as 4 | 7);
//     }
//   }
// }
