// backend/src/modules/ai-mentor/controllers/buildSessionContext.ts
import { prisma } from '@/db/client.js';
import type { MentorRuleSet, SessionContext } from '../types.js';

async function ensureMentor(userId: string) {
  return prisma.mentor.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      rules: {},
      summary: {},
      meta: {},
    },
  });
}

export async function buildSessionContext(
  userId: string,
  userName: string,
): Promise<SessionContext> {
  const mentor = await ensureMentor(userId);
  const rules = mentor.rules as MentorRuleSet;

  return {
    userName,
    tone: rules?.tone ?? 'friendly',
    goals: rules?.goals ?? [],
    morningQuestions: rules?.morningQuestions ?? [],
    eveningQuestions: rules?.eveningQuestions ?? [],
  };
}
