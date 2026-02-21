// backend/src/modules/ai-mentor/initialize.ts
import { prisma } from '@/db/client.js';
import { QuestionsConfig } from '@/modules/ai-mentor/types.js';
import { generateWheelAnalysis } from '@/modules/wheel/ai.js';
import { WheelScore } from '@/modules/wheel/types.js';

// backend/src/modules/ai-mentor-setup/service.ts
export async function initializeMentor(userId: string) {
  // Create mentor profile
  const mentor = await prisma.mentor.create({
    data: {
      userId,
      rules: {},
      summary: {},
      meta: { setupStarted: new Date() },
    },
  });

  return { mentorId: mentor.id, nextStep: 'wheel' };
}

export async function configureWheel(userId: string, scores: WheelScore[]) {
  // Save wheel assessment
  const wheel = await prisma.wheelAssessment.create({
    data: {
      userId,
      scores,
      analysis: await generateWheelAnalysis(scores, { name: '...' }),
    },
  });

  // Update setup progress
  await prisma.mentor.update({
    where: { userId },
    data: {
      meta: { wheelCompleted: true },
    },
  });

  return { wheelId: wheel.id, nextStep: 'questions' };
}

export async function configureQuestions(userId: string, config: QuestionsConfig) {
  await prisma.mentor.update({
    where: { userId },
    data: {
      rules: {
        morningQuestions: config.morningQuestions,
        eveningQuestions: config.eveningQuestions,
        frequency: config.frequency,
      },
      meta: { questionsConfigured: true },
    },
  });

  return { setupComplete: true };
}
