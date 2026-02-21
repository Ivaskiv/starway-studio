// backend/src/modules/wheel/wheel.ai.ts
import { openai } from '@/lib/openai.js';
import type { WheelScore, WheelUserContext } from './types.js';
import { SPHERE_LABELS } from './types.js';

export async function generateWheelAnalysis(
  scores: WheelScore[],
  user: WheelUserContext,
): Promise<string> {
  const scoresText = scores
    .map(
      s => `${SPHERE_LABELS[s.categoryId]}: ${s.score}/10${s.comment ? ` ("${s.comment}")` : ''}`,
    )
    .join('\n');

  const weakest = scores.reduce((min, s) => (s.score < min.score ? s : min));
  const strongest = scores.reduce((max, s) => (s.score > max.score ? s : max));
  const imbalance = strongest.score - weakest.score;

  const prompt = `
Ти - AI-коуч для жіночого менторського проєкту "Зоряний шлях".

Користувачка: ${user.name || 'Анонім'}
${user.email ? `Email: ${user.email}` : ''}

Оцінки сфер життя (1-10):
${scoresText}

Найслабша сфера: ${SPHERE_LABELS[weakest.categoryId]} (${weakest.score}/10)
Найсильніша сфера: ${SPHERE_LABELS[strongest.categoryId]} (${strongest.score}/10)
Дисбаланс: ${imbalance} балів

Завдання:
1. Проаналізуй перекіс між сферами
2. Опиши системний вплив (як слабка сфера впливає на інші)
3. Дай 1-2 конкретні кроки для фокусу в щоденному циклі

Формат відповіді (2-3 речення, українською, тон - підтримка + дія):
- Перекіс: [різниця між найсильнішою та найслабшою]
- Системний вплив: [як це впливає на життя]
- Фокус для дій: [що робити]
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || 'Аналіз недоступний';
  } catch (error) {
    console.error('❌ OpenAI error:', error);
    throw error;
  }
}
