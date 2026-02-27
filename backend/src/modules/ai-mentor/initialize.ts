// backend/src/modules/ai-mentor/initialize.ts
import { prisma } from '@/db/client.js';
import { QuestionsConfig } from '@/modules/ai-mentor/types.js';
import { WheelScore } from '@/modules/wheel/types.js';

// fix1: prisma.mentor → prisma.mentorConfig (модель в схемі)
// fix2: prisma.wheelAssessment → prisma.userBalanceEntry (модель в схемі)

export async function initializeMentor(expertId: string, userId: string) {
  // fix3: MentorConfig має expertId + userId (обидва обов'язкові в схемі)
  const mentorConfig = await prisma.mentorConfig.upsert({
    where:  { userId },
    update: { config: { setupStarted: new Date() } },
    create: {
      userId,
      config: { setupStarted: new Date() },
    },
  });

  return { mentorConfigId: mentorConfig.userId, nextStep: 'wheel' };
}

export async function configureWheel(
  expertId: string,
  userId: string,
  mentorId: string,
  balanceConfigId: string,
  scores: WheelScore[],
) {
  // fix4: wheelAssessment → userBalanceEntry (реальна модель)
  // fix5: scores — Json поле, передаємо як є
  const scoresMap = Object.fromEntries(
    scores.map(s => [s.categoryId ?? s.categoryId, s.score ?? 0])
  );

  const entry = await prisma.userBalanceEntry.create({
    data: {
      expertId,
      userId,
      mentorId,
      balanceConfigId,
      scores: scoresMap,
      note: 'Initial wheel setup',
    },
  });

  await prisma.mentorConfig.upsert({
    where:  { userId },
    update: { config: { wheelCompleted: true, lastBalanceEntryId: entry.id } },
    create: { userId, config: { wheelCompleted: true } },
  });

  return { entryId: entry.id, nextStep: 'questions' };
}

export async function configureQuestions(userId: string, config: QuestionsConfig) {
  await prisma.mentorConfig.upsert({
    where:  { userId },
    update: {
      config: {
        morningQuestions:  config.customPrompts?.slice(0, 3) ?? [],
        eveningQuestions:  config.customPrompts?.slice(3, 6) ?? [],
        frequency:         config.frequency,
        morningTime:       config.morningTime ?? '08:00',
        eveningTime:       config.eveningTime ?? '20:00',
        questionsConfigured: true,
      },
    },
    create: {
      userId,
      config: {
        morningQuestions:  config.customPrompts?.slice(0, 3) ?? [],
        eveningQuestions:  config.customPrompts?.slice(3, 6) ?? [],
        frequency:         config.frequency,
        morningTime:       config.morningTime ?? '08:00',
        eveningTime:       config.eveningTime ?? '20:00',
        questionsConfigured: true,
      },
    },
  });

  return { setupComplete: true };
}