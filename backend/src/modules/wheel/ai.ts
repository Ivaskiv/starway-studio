// backend/src/modules/wheel/ai.ts
// AI-аналіз колеса балансу через OpenAI з українською підтримкою та fallback

import { openai } from '@/lib/openai.js';
import { SPHERE_LABELS } from './types.js';
import type { WheelScore, WheelUserContext } from './types.js';

/** Генерує AI-аналіз колеса; кидає помилку при збої OpenAI */
export async function generateWheelAnalysis(
  scores: WheelScore[],
  user: WheelUserContext,
): Promise<string> {
  if (!scores.length) return 'Немає оцінок для аналізу.';

  const weakest = scores.reduce((min, s) => s.score < min.score ? s : min);
  const strongest = scores.reduce((max, s) => s.score > max.score ? s : max);
  const imbalance = strongest.score - weakest.score;

  const scoresText = scores
    .map(s => `${SPHERE_LABELS[s.categoryId] ?? s.categoryId}: ${s.score}/10${s.comment ? ` ("${s.comment}")` : ''}`)
    .join('\n');

  const prompt = `
Ти — AI-коуч жіночого менторського проєкту "Зоряний шлях".

Користувач: ${user.name || 'Анонім'}

Оцінки сфер (1–10):
${scoresText}

Найслабша: ${SPHERE_LABELS[weakest.categoryId] ?? weakest.categoryId} (${weakest.score}/10)
Найсильніша: ${SPHERE_LABELS[strongest.categoryId] ?? strongest.categoryId} (${strongest.score}/10)
Дисбаланс: ${imbalance} балів

Напиши 2–3 речення українською, підтримуючим тоном з конкретними діями:
1. Вказати перекіс між сферами
2. Пояснити системний вплив слабкої сфери
3. Дати 1–2 конкретні щоденні кроки
`.trim();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 350,
    });

    return response.choices[0]?.message?.content?.trim() || 'Аналіз тимчасово недоступний.';
  } catch (err) {
    console.error('AI Wheel Analysis failed:', err);
    // fallback — короткий аналіз
    const focus = scores.find(s => s.score < 7 && s.categoryId !== weakest.categoryId) ?? weakest;
    return `Слабка сфера: ${SPHERE_LABELS[weakest.categoryId] ?? weakest.categoryId} (${weakest.score}/10). ` +
           `Фокус для роботи: ${SPHERE_LABELS[focus.categoryId] ?? focus.categoryId}. ` +
           `Дисбаланс між сферами: ${imbalance}.`;
  }
}