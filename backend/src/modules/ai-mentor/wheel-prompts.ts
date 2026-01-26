// backend/src/services/wheel-prompts.ts

import { openai } from './openai-client';

// Категорії колеса
const WHEEL_CATEGORIES: Record<string, { name: string; icon: string }> = {
  health: { name: "Здоров'я", icon: '💪' },
  career: { name: "Кар'єра", icon: '💼' },
  finance: { name: 'Фінанси', icon: '💰' },
  relationships: { name: 'Стосунки', icon: '❤️' },
  personal_growth: { name: 'Особистий ріст', icon: '🌱' },
  fun: { name: 'Відпочинок', icon: '🎉' },
  environment: { name: 'Оточення', icon: '🏠' },
  spirituality: { name: 'Духовність', icon: '✨' },
};

interface WheelScore {
  category_id: string;
  score: number;
  notes?: string;
}

interface WheelAnalysis {
  strengths: Array<{ category_id: string; insight: string }>;
  gaps: Array<{ category_id: string; insight: string; priority: 'high' | 'medium' | 'low' }>;
  recommendations: string[];
  focus_area: string;
  balance_score: number;
  affirmation: string;
}

/**
 * AI аналіз колеса балансу
 */
export async function analyzeWheelWithAI(scores: WheelScore[]): Promise<WheelAnalysis> {
  const scoresText = scores
    .map(
      s =>
        `${WHEEL_CATEGORIES[s.category_id]?.name || s.category_id}: ${s.score}/10${s.notes ? ` (${s.notes})` : ''}`,
    )
    .join('\n');

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top_categories = sorted.slice(0, 3);
  const low_categories = sorted.slice(-3);

  const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

  // Розрахунок "балансу" — наскільки рівномірні оцінки
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s.score - avgScore, 2), 0) / scores.length;
  const balance_score = Math.max(0, 100 - variance * 10);

  const prompt = `Ти — AI-ментор з психології та особистого розвитку. Проаналізуй результати Колеса балансу користувача.

ОЦІНКИ (1-10):
${scoresText}

СЕРЕДНІЙ БАЛ: ${avgScore.toFixed(1)}/10
БАЛАНС: ${balance_score.toFixed(0)}%

СИЛЬНІ СТОРОНИ (топ-3):
${top_categories.map(s => `- ${WHEEL_CATEGORIES[s.category_id]?.name}: ${s.score}`).join('\n')}

ЗОНИ РОСТУ (найнижчі):
${low_categories.map(s => `- ${WHEEL_CATEGORIES[s.category_id]?.name}: ${s.score}`).join('\n')}

ЗАВДАННЯ:
1. Дай короткий інсайт для кожної сильної сторони (1 речення)
2. Дай інсайт та пріоритет (high/medium/low) для кожної зони росту
3. Запропонуй 3 конкретні рекомендації на наступний тиждень
4. Визнач головну сферу фокусу
5. Створи персональну афірмацію (1 речення)

ФОРМАТ ВІДПОВІДІ (JSON):
{
  "strengths": [
    { "category_id": "...", "insight": "..." }
  ],
  "gaps": [
    { "category_id": "...", "insight": "...", "priority": "high|medium|low" }
  ],
  "recommendations": ["...", "...", "..."],
  "focus_area": "category_id",
  "affirmation": "..."
}

Відповідай ТІЛЬКИ JSON без markdown.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
    return {
      ...parsed,
      balance_score: Math.round(balance_score),
    };
  } catch {
    console.error('❌ [Wheel] Failed to parse AI response:', content);
    // Fallback
    return {
      strengths: top_categories.map(s => ({
        category_id: s.category_id,
        insight: `${WHEEL_CATEGORIES[s.category_id]?.name} — твоя сильна сторона`,
      })),
      gaps: low_categories.map(s => ({
        category_id: s.category_id,
        insight: `${WHEEL_CATEGORIES[s.category_id]?.name} потребує уваги`,
        priority: s.score <= 3 ? 'high' : s.score <= 5 ? 'medium' : ('low' as const),
      })),
      recommendations: [
        'Приділи 15 хвилин на день найслабшій сфері',
        'Веди щоденник прогресу',
        'Знайди ментора або партнера для підтримки',
      ],
      focus_area: low_categories[0]?.category_id || 'personal_growth',
      balance_score: Math.round(balance_score),
      affirmation: 'Я крокую до балансу кожен день',
    };
  }
}

/**
 * Генерація рекомендацій курсів на основі колеса
 */
export async function getWheelCourseRecommendations(scores: WheelScore[]) {
  const lowScores = scores.filter(s => s.score <= 4);

  const recommendations: Array<{
    course_code: string;
    title: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  // Mapping категорій до курсів
  const courseMapping: Record<string, { code: string; title: string }> = {
    health: { code: 'state_key', title: 'Стан — ключ до успіху' },
    career: { code: 'system_21', title: 'Система 21' },
    finance: { code: 'code_changes', title: 'Код змін' },
    relationships: { code: 'power_consciousness', title: 'Сила свідомості' },
    personal_growth: { code: 'fears_marathon', title: 'Марафон Страхи' },
  };

  for (const score of lowScores) {
    const course = courseMapping[score.category_id];
    if (course) {
      recommendations.push({
        course_code: course.code,
        title: course.title,
        reason: `${WHEEL_CATEGORIES[score.category_id]?.name} потребує уваги (${score.score}/10)`,
        priority: score.score <= 2 ? 'high' : score.score <= 4 ? 'medium' : 'low',
      });
    }
  }

  return recommendations.slice(0, 3);
}
