// packages/backend/src/services/ai-mentor-prompts.ts

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ============ TYPES ============

interface SessionContext {
  wheelScores?: Array<{ categoryId: string; score: number }>
  streakDays?: number
  recentWins?: string[]
  recentBlocks?: string[]
  focusArea?: string
  userName?: string
}

interface MorningResponse {
  affirmation: string
  microActions: Array<{
    title: string
    description: string
    category: string
    estimatedMinutes: number
  }>
  motivation: string
}

interface EveningResponse {
  reflection: string
  wins: string[]
  lessons: string
  tomorrowFocus: string
}

// ============ MORNING SESSION ============

/**
 * Генерація ранкових мікро-дій та афірмації
 */
export async function generateMorningSession(
  answers: {
    currentState: string
    energyLevel: number
    mainGoalToday: string
    potentialBlocks: string[]
  },
  context: SessionContext
): Promise<MorningResponse> {
  const wheelContext = context.wheelScores
    ?.map(s => `${s.categoryId}: ${s.score}/10`)
    .join(', ') || 'немає даних'

  const prompt = `Ти — AI-ментор для особистого розвитку. Допоможи користувачу почати день ефективно.

КОНТЕКСТ КОРИСТУВАЧА:
- Ім'я: ${context.userName || 'Друже'}
- Streak: ${context.streakDays || 0} днів
- Колесо балансу: ${wheelContext}
- Фокус: ${context.focusArea || 'загальний розвиток'}

РАНКОВІ ВІДПОВІДІ:
- Поточний стан: ${answers.currentState}
- Рівень енергії: ${answers.energyLevel}/10
- Головна ціль: ${answers.mainGoalToday}
- Потенційні перешкоди: ${answers.potentialBlocks.join(', ') || 'не вказано'}

ЗАВДАННЯ:
1. Створи персональну афірмацію (1 речення, потужне, від першої особи)
2. Запропонуй 3 мікро-дії (конкретні, вимірювані, до 30 хв кожна)
3. Напиши мотиваційне повідомлення (2-3 речення)

ФОРМАТ JSON:
{
  "affirmation": "Я...",
  "microActions": [
    {
      "title": "...",
      "description": "...",
      "category": "health|career|relationships|personal_growth",
      "estimatedMinutes": 15
    }
  ],
  "motivation": "..."
}

Відповідай ТІЛЬКИ JSON.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 800,
  })

  const content = response.choices[0]?.message?.content || '{}'
  
  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return {
      affirmation: 'Я обираю діяти з енергією та фокусом сьогодні',
      microActions: [
        {
          title: 'Почни з головного',
          description: `Приділи 25 хвилин задачі: ${answers.mainGoalToday}`,
          category: 'personal_growth',
          estimatedMinutes: 25,
        },
        {
          title: 'Рух тіла',
          description: '10 хвилин розминки або прогулянки',
          category: 'health',
          estimatedMinutes: 10,
        },
        {
          title: 'Момент вдячності',
          description: 'Запиши 3 речі, за які вдячний',
          category: 'personal_growth',
          estimatedMinutes: 5,
        },
      ],
      motivation: `Твій рівень енергії ${answers.energyLevel}/10 — це чудова основа для продуктивного дня. Пам'ятай: маленькі дії створюють великі результати.`,
    }
  }
}

// ============ EVENING SESSION ============

/**
 * Генерація вечірньої рефлексії
 */
export async function generateEveningSession(
  answers: {
    completedActions: string[]
    wins: string[]
    blocksEncountered: string[]
    lessons: string
  },
  context: SessionContext
): Promise<EveningResponse> {
  const prompt = `Ти — AI-ментор. Допоможи користувачу завершити день рефлексією.

КОНТЕКСТ:
- Streak: ${context.streakDays || 0} днів
- Останні перемоги: ${context.recentWins?.join(', ') || 'немає'}

ВЕЧІРНІ ВІДПОВІДІ:
- Виконані дії: ${answers.completedActions.join(', ') || 'не вказано'}
- Перемоги дня: ${answers.wins.join(', ') || 'не вказано'}
- Блоки/перешкоди: ${answers.blocksEncountered.join(', ') || 'не було'}
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
  "tomorrowFocus": "..."
}

Відповідай ТІЛЬКИ JSON.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 600,
  })

  const content = response.choices[0]?.message?.content || '{}'
  
  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return {
      reflection: 'Ти зробив важливі кроки сьогодні. Кожен день — це можливість рости.',
      wins: answers.wins.length > 0 ? answers.wins : ['Ти завершив день з рефлексією'],
      lessons: answers.lessons || 'Навіть маленький прогрес — це прогрес',
      tomorrowFocus: 'Почни з однієї важливої задачі',
    }
  }
}

// ============ AFFIRMATIONS ============

/**
 * Генерація персональної афірмації
 */
export async function generateAffirmation(
  mood: string,
  focusArea: string,
  context?: SessionContext
): Promise<string> {
  const prompt = `Створи потужну персональну афірмацію українською.

КОНТЕКСТ:
- Настрій: ${mood}
- Сфера фокусу: ${focusArea}
- Streak: ${context?.streakDays || 0} днів

ВИМОГИ:
- Від першої особи ("Я...")
- Позитивне формулювання (без "не")
- Конкретна та емоційна
- 1 речення, до 15 слів

Відповідай ТІЛЬКИ текстом афірмації.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 100,
  })

  return response.choices[0]?.message?.content?.trim() || 
    'Я обираю рости та діяти з любов\'ю до себе'
}

// ============ CHAT ============

/**
 * Відповідь ментора в чаті
 */
export async function generateMentorChatResponse(
  userMessage: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: SessionContext
): Promise<string> {
  const systemPrompt = `Ти — AI-ментор з особистого розвитку. Твоя роль:
- Підтримувати та мотивувати
- Давати конкретні поради
- Допомагати з рефлексією
- Бути теплим, але не нав'язливим

КОНТЕКСТ КОРИСТУВАЧА:
- Ім'я: ${context.userName || 'Друже'}
- Streak: ${context.streakDays || 0} днів
- Фокус: ${context.focusArea || 'особистий розвиток'}

ПРАВИЛА:
- Відповідай українською
- Коротко (2-4 речення)
- Задавай уточнюючі питання
- Пропонуй конкретні дії`

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.8,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content || 
    'Дякую за повідомлення! Розкажи більше, як я можу допомогти?'
}

// ============ WEEKLY ANALYSIS ============

/**
 * Генерація тижневого аналізу
 */
export async function generateWeeklyAnalysis(
  sessions: Array<{
    type: 'morning' | 'evening'
    date: string
    completedActions?: string[]
    wins?: string[]
    blocks?: string[]
  }>,
  wheelScores?: Array<{ categoryId: string; score: number }>
): Promise<{
  summary: string
  completionRate: number
  topWins: string[]
  patterns: string[]
  recommendations: string[]
}> {
  const totalSessions = sessions.length
  const completedActions = sessions.flatMap(s => s.completedActions || [])
  const allWins = sessions.flatMap(s => s.wins || [])
  const allBlocks = sessions.flatMap(s => s.blocks || [])

  const prompt = `Проаналізуй тиждень користувача:

СЕСІЇ: ${totalSessions}
ВИКОНАНІ ДІЇ: ${completedActions.length}
ПЕРЕМОГИ: ${allWins.join(', ') || 'немає'}
БЛОКИ: ${allBlocks.join(', ') || 'немає'}
КОЛЕСО: ${wheelScores?.map(s => `${s.categoryId}:${s.score}`).join(', ') || 'немає'}

Дай JSON:
{
  "summary": "2-3 речення підсумок",
  "completionRate": 0-100,
  "topWins": ["...", "..."],
  "patterns": ["позитивний патерн", "негативний патерн"],
  "recommendations": ["...", "..."]
}

ТІЛЬКИ JSON.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  })

  const content = response.choices[0]?.message?.content || '{}'
  
  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return {
      summary: 'Тиждень завершено. Продовжуй рухатись вперед!',
      completionRate: Math.round((completedActions.length / Math.max(totalSessions * 3, 1)) * 100),
      topWins: allWins.slice(0, 3),
      patterns: [],
      recommendations: ['Продовжуй вести щоденні сесії'],
    }
  }
}