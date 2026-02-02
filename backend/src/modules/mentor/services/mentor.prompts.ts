// backend/src/services/mentor/prompts.ts
// # Генерації ранку, вечора, чат, афірмації
import { openai } from '../../../lib/openai.js';
import { ChatMessage, EveningResponse, MorningResponse } from '../../../types/types.js';
import { SessionContext } from '../types/mentor.types.js';
// import { openai } from '../../ai-mentor/openai-client';

// ============ MORNING SESSION ============

/**
 * Генерація ранкових мікро-дій та афірмації
 */
export async function generateMorningSession(
  answers: {
    current_state: string;
    energy_level: number;
    main_goal_today: string;
    potential_blocks: string[];
  },
  context: SessionContext,
): Promise<MorningResponse> {
  const wheel_context =
    context.wheel_scores?.map(s => `${s.category_id}: ${s.score}/10`).join(', ') || 'немає даних';

  const prompt = `Ти — AI-ментор для особистого розвитку. Допоможи користувачу почати день ефективно.

КОНТЕКСТ КОРИСТУВАЧА:
- Ім'я: ${context.user_name || 'Друже'}
- Streak: ${context.streak_days || 0} днів
- Колесо балансу: ${wheel_context}
- Фокус: ${context.focus_area || 'загальний розвиток'}

РАНКОВІ ВІДПОВІДІ:
- Поточний стан: ${answers.current_state}
- Рівень енергії: ${answers.energy_level}/10
- Головна ціль: ${answers.main_goal_today}
- Потенційні перешкоди: ${answers.potential_blocks.join(', ') || 'не вказано'}

ЗАВДАННЯ:
1. Створи персональну афірмацію (1 речення, потужне, від першої особи)
2. Запропонуй 3 мікро-дії (конкретні, вимірювані, до 30 хв кожна)
3. Напиши мотиваційне повідомлення (2-3 речення)

ФОРМАТ JSON:
{
  "affirmation": "Я...",
  "micro_actions": [
    {
      "title": "...",
      "description": "...",
      "category": "health|career|relationships|personal_growth",
      "estimated_minutes": 15
    }
  ],
  "motivation": "..."
}

Відповідай ТІЛЬКИ JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return {
      affirmation: 'Я обираю діяти з енергією та фокусом сьогодні',
      micro_actions: [
        {
          title: 'Почни з головного',
          description: `Приділи 25 хвилин задачі: ${answers.main_goal_today}`,
          category: 'personal_growth',
          estimated_minutes: 25,
        },
        {
          title: 'Рух тіла',
          description: '10 хвилин розминки або прогулянки',
          category: 'health',
          estimated_minutes: 10,
        },
        {
          title: 'Момент вдячності',
          description: 'Запиши 3 речі, за які вдячний',
          category: 'personal_growth',
          estimated_minutes: 5,
        },
      ],
      motivation: `Твій рівень енергії ${answers.energy_level}/10 — це чудова основа для продуктивного дня. Пам'ятай: маленькі дії створюють великі результати.`,
    };
  }
}

// ============ EVENING SESSION ============

/**
 * Генерація вечірньої рефлексії
 */
export async function generateEveningSession(
  answers: {
    completed_actions: string[];
    wins: string[];
    blocks_encountered: string[];
    lessons: string;
  },
  context: SessionContext,
): Promise<EveningResponse> {
  const prompt = `Ти — AI-ментор. Допоможи користувачу завершити день рефлексією.

КОНТЕКСТ:
- Streak: ${context.streak_days || 0} днів
- Останні перемоги: ${context.recent_wins?.join(', ') || 'немає'}

ВЕЧІРНІ ВІДПОВІДІ:
- Виконані дії: ${answers.completed_actions.join(', ') || 'не вказано'}
- Перемоги дня: ${answers.wins.join(', ') || 'не вказано'}
- Блоки/перешкоди: ${answers.blocks_encountered.join(', ') || 'не було'}
- Урок дня: ${answers.lessons || 'не вказано'}

ЗАВДАННЯ:
1. Напиши теплу рефлексію дня (2-3 речення)
2. Виділи головні перемоги (список)
3. Сформулюй ключовий урок
4. Визнач фокус на завтра

ФОРМАТ JSON:
{
  "reflection": "...",
  "wins": ["...", "..."],
  "lessons": "...",
  "tomorrow_focus": "..."
}

Відповідай ТІЛЬКИ JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return {
      reflection: 'Ти зробив важливі кроки сьогодні. Кожен день — це можливість рости.',
      wins: answers.wins.length > 0 ? answers.wins : ['Ти завершив день з рефлексією'],
      lessons: answers.lessons || 'Навіть маленький прогрес — це прогрес',
      tomorrow_focus: 'Почни з однієї важливої задачі',
    };
  }
}

// ============ AFFIRMATIONS ============

/**
 * Генерація персональної афірмації
 */
export async function generateAffirmation(
  mood: string,
  focus_area: string,
  context?: SessionContext,
): Promise<string> {
  const prompt = `Створи потужну персональну афірмацію українською.

КОНТЕКСТ:
- Настрій: ${mood}
- Сфера фокусу: ${focus_area}
- Streak: ${context?.streak_days || 0} днів

ВИМОГИ:
- Від першої особи ("Я...")
- Позитивне формулювання (без "не")
- Конкретна та емоційна
- 1 речення, до 15 слів

Відповідай ТІЛЬКИ текстом афірмації.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 100,
  });

  return (
    response.choices[0]?.message?.content?.trim() || "Я обираю рости та діяти з любов'ю до себе"
  );
}

// ============ CHAT ============

/**
 * Відповідь ментора в чаті
 */
export async function generateMentorChatResponse(
  user_message: string,
  chat_history: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: SessionContext,
): Promise<string> {
  const system_prompt = `Ти — AI-ментор з особистого розвитку. Твоя роль:
- Підтримувати та мотивувати
- Давати конкретні поради
- Допомагати з рефлексією
- Бути теплим, але не нав'язливим

КОНТЕКСТ КОРИСТУВАЧА:
- Ім'я: ${context.user_name || 'Друже'}
- Streak: ${context.streak_days || 0} днів
- Фокус: ${context.focus_area || 'особистий розвиток'}

ПРАВИЛА:
- Відповідай українською
- Коротко (2-4 речення)
- Задавай уточнюючі питання
- Пропонуй конкретні дії`;

  const messages: ChatMessage[] = [
    { role: 'system', content: system_prompt },
    ...chat_history.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant', // явно кажемо TS, що role валідне
      content: m.content,
    })),
    { role: 'user', content: user_message },
  ];
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.8,
    max_tokens: 300,
  });

  return (
    response.choices[0]?.message?.content ||
    'Дякую за повідомлення! Розкажи більше, як я можу допомогти?'
  );
}

// ============ WEEKLY ANALYSIS ============

/**
 * Генерація тижневого аналізу
 */
export async function generateWeeklyAnalysis(
  sessions: Array<{
    type: 'morning' | 'evening';
    date: string;
    completed_actions?: string[];
    wins?: string[];
    blocks?: string[];
  }>,
  wheel_scores?: Array<{ category_id: string; score: number }>,
): Promise<{
  summary: string;
  completion_rate: number;
  top_wins: string[];
  patterns: string[];
  recommendations: string[];
}> {
  const totalSessions = sessions.length;
  const completed_actions = sessions.flatMap(s => s.completed_actions || []);
  const all_wins = sessions.flatMap(s => s.wins || []);
  const all_blocks = sessions.flatMap(s => s.blocks || []);

  const prompt = `Проаналізуй тиждень користувача:

СЕСІЇ: ${totalSessions}
ВИКОНАНІ ДІЇ: ${completed_actions.length}
ПЕРЕМОГИ: ${all_wins.join(', ') || 'немає'}
БЛОКИ: ${all_blocks.join(', ') || 'немає'}
КОЛЕСО: ${wheel_scores?.map(s => `${s.category_id}:${s.score}`).join(', ') || 'немає'}

Дай JSON:
{
  "summary": "2-3 речення підсумок",
  "completion_rate": 0-100,
  "top_wins": ["...", "..."],
  "patterns": ["позитивний патерн", "негативний патерн"],
  "recommendations": ["...", "..."]
}

ТІЛЬКИ JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return {
      summary: 'Тиждень завершено. Продовжуй рухатись вперед!',
      completion_rate: Math.round(
        (completed_actions.length / Math.max(totalSessions * 3, 1)) * 100,
      ),
      top_wins: all_wins.slice(0, 3),
      patterns: [],
      recommendations: ['Продовжуй вести щоденні сесії'],
    };
  }
}
