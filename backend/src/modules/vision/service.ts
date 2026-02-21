// backend/src/modules/vision/service.ts
/**
 * Vision Service 
 */

import { prisma } from '@/db/client.js';
import { openai } from '@/lib/openai.js';
import { VisionAnswers, VisionStatement } from './types.js';

export async function createVisionStatement(
  userId: string,
  answers: VisionAnswers
): Promise<VisionStatement> {
  const statement = await aiGenerateVision(answers);

  // Store in questionnaire field (JsonValue)
  const questionnaireData = {
    idealLife: answers.idealLife,
    noLongerNormal: answers.noLongerNormal,
    pointB: answers.pointB
  };

  const vision = await prisma.visionStatement.create({
    data: {
      userId,
      statement,
      questionnaire: questionnaireData, // ← FIX: Use questionnaire field
      createdAt: new Date()
    }
  });

  return {
    id: vision.id,
    userId: vision.userId,
    statement: vision.statement,
    idealLife: answers.idealLife,
    noLongerNormal: answers.noLongerNormal,
    pointB: answers.pointB,
    createdAt: vision.createdAt
  };
}

export async function getLatestVision(userId: string): Promise<VisionStatement | null> {
  const vision = await prisma.visionStatement.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  if (!vision) return null;

  const questionnaire = vision.questionnaire as any;

  return {
    id: vision.id,
    userId: vision.userId,
    statement: vision.statement,
    idealLife: questionnaire?.idealLife || '',
    noLongerNormal: questionnaire?.noLongerNormal || '',
    pointB: questionnaire?.pointB || '',
    createdAt: vision.createdAt
  };
}

export async function updateVisionStatement(
  id: string,
  answers: VisionAnswers
): Promise<VisionStatement> {
  const statement = await aiGenerateVision(answers);

  const questionnaireData = {
    idealLife: answers.idealLife,
    noLongerNormal: answers.noLongerNormal,
    pointB: answers.pointB
  };

  const vision = await prisma.visionStatement.update({
    where: { id },
    data: {
      statement,
      questionnaire: questionnaireData // ← FIX
    }
  });

  return {
    id: vision.id,
    userId: vision.userId,
    statement: vision.statement,
    idealLife: answers.idealLife,
    noLongerNormal: answers.noLongerNormal,
    pointB: answers.pointB,
    createdAt: vision.createdAt
  };
}

async function aiGenerateVision(answers: VisionAnswers): Promise<string> {
  const prompt = `На основі відповідей створи vision statement (2-3 речення, українською):

Ідеальне життя через 5 років: ${answers.idealLife}
Що більше не норма: ${answers.noLongerNormal}
Точка Б (де хочу бути): ${answers.pointB}

Створи vision statement який:
- Мотивує та надихає
- Конкретний та зрозумілий
- Від першої особи ("Я живу...")
- 2-3 речення максимум

ТІЛЬКИ текст vision statement, без пояснень.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 200
  });

  return response.choices[0]?.message?.content?.trim() ||
    'Я живу життям, яке обираю, з усвідомленістю та внутрішньою опорою.';
}