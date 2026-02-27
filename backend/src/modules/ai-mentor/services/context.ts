import { prisma } from '@/db/client.js';
import type { MentorRuleSet, SessionContext } from '../types.js';

/**
 * Створює або повертає існуючого ментора для користувача
 */
export async function ensureMentor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expertId: true },
  });

  const expertId = user?.expertId ?? process.env.DEFAULT_AI_EXPERT_ID;
  if (!expertId) {
    throw new Error('Cannot create AI mentor: missing expertId');
  }

  return prisma.mentor.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      name: 'AI Mentor',
      expertId,
      slug: 'ai-mentor',
      rules: {
        tone: 'friendly',
        goals: [],
        morningQuestions: [],
        eveningQuestions: [],
      },
      summary: {},
      meta: {},
    },
  });
}

/**
 * Будує контекст сесії для AI-ментору
 */
export async function buildSessionContext(
  userId: string,
  userName: string
): Promise<SessionContext> {
  const mentor = await prisma.mentor.findUnique({
    where: { userId },
    select: {
      rules: true, // JSON поле з бази
    },
  });

  // JSON у Prisma типу JsonValue, кастимо до MentorRuleSet
  const rules: Partial<MentorRuleSet> = (mentor?.rules as MentorRuleSet) ?? {};

  const tone = rules.tone ?? 'friendly';
  const goals = rules.goals ?? [];
  const morningQuestions = rules.morningQuestions ?? [];
  const eveningQuestions = rules.eveningQuestions ?? [];

  const systemPrompt = `You are a ${tone} AI Mentor for ${userName}. Goals: ${goals.join(', ')}`;

  return { userName, tone, goals, morningQuestions, eveningQuestions, systemPrompt };
}
