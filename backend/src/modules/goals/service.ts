// backend/src/modules/goals/service.ts

/**
 * Goals Service - COMPLETE
 */

import { prisma } from '../../db/client.js';
import { openai } from '../../lib/openai.js';
import { Goal, GoalsSet } from './types.js';

function extractGoalTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [item.trim()];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const text = (item as { text?: unknown }).text;
      return typeof text === 'string' && text.trim() ? [text.trim()] : [];
    }
    return [];
  });
}

export function getPrimaryGoalTextFromGoals(raw: unknown): string | null {
  return extractGoalTexts(raw)[0] ?? null;
}

export async function setGoals(
  userId: string,
  goals: string[],
  primaryGoalIndex: number
): Promise<GoalsSet> {
  const goalsData = goals.map((goal, index) => ({
    text: goal,
    isPrimary: index === primaryGoalIndex,
    order: index
  }));

  const goalsSet = await prisma.goalsSet.create({
    data: {
      userId,
      goals: goalsData as any
    }
  });

  return goalsSet as unknown as GoalsSet;
}

export async function getLatestGoals(userId: string): Promise<GoalsSet | null> {
  const goalsSet = await prisma.goalsSet.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return goalsSet as unknown as GoalsSet | null;
}

export async function getPrimaryGoal(userId: string): Promise<Goal | null> {
  const goalsSet = await getLatestGoals(userId);
  
  if (!goalsSet) return null;

  const goals = goalsSet.goals as unknown as Goal[];
  return goals.find(g => g.isPrimary) || null;
}

export async function checkChoiceAlignment(
  userId: string,
  choice: string
): Promise<{ aligns: boolean; reason: string }> {
  const goal = await getPrimaryGoal(userId);
  
  if (!goal) {
    return { aligns: true, reason: 'No primary goal set' };
  }

  const alignment = await aiCheckAlignment(choice, goal.text);

  if (!alignment.aligns) {
    // Save betrayal record
    await prisma.$executeRaw`
      INSERT INTO choice_betrayals ("userId", choice, "primaryGoal", reason, "createdAt")
      VALUES (${userId}, ${choice}, ${goal.text}, ${alignment.reason}, NOW())
    `;
  }

  return alignment;
}

async function aiCheckAlignment(
  choice: string,
  primaryGoal: string
): Promise<{ aligns: boolean; reason: string }> {
  const prompt = `Вибір користувача: "${choice}"
Primary goal: "${primaryGoal}"

Питання: Чи веде цей вибір до primary goal?

Відповідь у JSON:
{
  "aligns": true/false,
  "reason": "коротке пояснення (1 речення)"
}

ТІЛЬКИ JSON, без пояснень.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150
    });

    const content = response.choices[0]?.message?.content?.trim() || '';
    const json = JSON.parse(content.replace(/```json|```/g, ''));

    return {
      aligns: json.aligns === true,
      reason: json.reason || 'Unknown'
    };
  } catch (error) {
    console.error('[Goals] AI alignment check error:', error);
    return { aligns: true, reason: 'AI check failed' };
  }
}
