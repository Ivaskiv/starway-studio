
//backend/src/products/ab-system/content/abTest.questions.ts
import type { CanonicalMessageKey } from '@/core/state-machine/ctaFoundation.js'

export const AB_TEST_ANSWER_KEYS = ['state', 'goal', 'choice', 'decision', 'action'] as const
export type AbTestAnswerKey = typeof AB_TEST_ANSWER_KEYS[number]
export const ANSWER_LETTERS = ['А', 'Б', 'В', 'Г', 'Д'] as const
export const AB_TEST_QUESTION_IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const
export type AbTestQuestionId = typeof AB_TEST_QUESTION_IDS[number]

export type AbTestQuestionAnswer = {
  id: AbTestAnswerKey
  text: string
  score: number
  category: 'state' | 'goal' | 'choice' | 'decision' | 'action'
}

export type AbTestQuestion = {
  question_id: AbTestQuestionId
  message_key: CanonicalMessageKey
  behavioral_type: 'energy' | 'discipline' | 'choice' | 'decision' | 'action'
  analytics_hooks: readonly string[]
  next_question_id: AbTestQuestionId | null
  prompt: string
  answers: readonly AbTestQuestionAnswer[]
}
const QUESTION_MESSAGE_KEYS: Record<AbTestQuestionId, CanonicalMessageKey> = {
  q1: 'TEST_RESULT_STATE',
  q2: 'TEST_RESULT_GOAL',
  q3: 'TEST_RESULT_CHOICE',
  q4: 'TEST_RESULT_DECISION',
  q5: 'TEST_RESULT_ACTION',
  q6: 'TEST_RESULT_GOAL',
  q7: 'TEST_RESULT_DECISION',
  q8: 'TEST_RESULT_ACTION',
}

/**
 * Оптимізована функція збірки питання.
 * Автоматично додає літери А, Б, В, Г, Д до текстів відповідей.
 */
function buildQuestion(
  question_id: AbTestQuestionId,
  prompt: string,
  behavioral_type: AbTestQuestion['behavioral_type'],
  answerTexts: Record<AbTestAnswerKey, string>,
  next_question_id: AbTestQuestionId | null,
): AbTestQuestion {
  return {
    question_id,
    message_key: QUESTION_MESSAGE_KEYS[question_id],
    behavioral_type,
    analytics_hooks: [
      'question_progression',
      'answer_latency',
      'question_dropoff',
      behavioral_type,
    ],
    next_question_id,
    prompt,
    answers: AB_TEST_ANSWER_KEYS.map((id, index) => ({
      id,
      // Додаємо літеру з ТЗ перед текстом: "А. Немає сил навіть почати"
      text: `${ANSWER_LETTERS[index]}. ${answerTexts[id]}`,
      score: 5 - index,
      category: id,
    })),
  }
}

// ТЗ Блок 2 — 8 питань точно за текстом
export const AB_TEST_QUESTIONS: Record<AbTestQuestionId, AbTestQuestion> = {
  q1: buildQuestion(
    'q1',
    '1. Що найчастіше відбувається, коли ти думаєш про те, що давно хочеш зробити?',
    'energy',
    {
      state: 'Немає сил навіть почати',
      goal: 'Не розумію, чого точно хочу',
      choice: 'Не можу обрати один варіант',
      decision: 'Ніби вирішила, але сумніваюсь',
      action: 'Знаю крок, але переношу',
    },
    'q2',
  ),
  q2: buildQuestion(
    'q2',
    '2. Що тебе найбільше зупиняє?',
    'discipline',
    {
      state: 'Втома і внутрішня напруга',
      goal: 'Немає чіткої цілі',
      choice: 'Страшно помилитися з вибором',
      decision: 'Не можу сказати: «я це роблю»',
      action: 'Не доходжу до конкретної дії',
    },
    'q3',
  ),
  q3: buildQuestion(
    'q3',
    '3. Як це найчастіше виглядає в житті?',
    'discipline',
    {
      state: 'Швидко виснажуюсь і відкладаю',
      goal: 'Часто міняю бажання',
      choice: 'Довго думаю, як правильно',
      decision: 'Вирішую, а потім знову сумніваюсь',
      action: 'Переношу конкретний крок',
    },
    'q4',
  ),
  q4: buildQuestion(
    'q4',
    '4. Що ти найчастіше говориш собі?',
    'decision',
    {
      state: '«Зараз не маю сил»',
      goal: '«Я ще не знаю, чого хочу»',
      choice: '«А раптом виберу не те?»',
      decision: '«Я ще подумаю»',
      action: '«Почну завтра»',
    },
    'q5',
  ),
  q5: buildQuestion(
    'q5',
    '5. Що повторюється найчастіше?',
    'choice',
    {
      state: 'Починаю з напруги і швидко здуваюсь',
      goal: 'Цілі є, але я нічого не роблю',
      choice: 'Зависла між кількома варіантами',
      decision: 'Не можу остаточно вирішити',
      action: 'Знаю, що робити, але не роблю',
    },
    'q6',
  ),
  q6: buildQuestion(
    'q6',
    '6. Чого тобі зараз найбільше не вистачає?',
    'decision',
    {
      state: 'Спокою і сил',
      goal: 'Чіткої цілі',
      choice: 'Сміливості обрати',
      decision: 'Внутрішнього «так, я це роблю»',
      action: 'Простого плану і першого кроку',
    },
    'q7',
  ),
  q7: buildQuestion(
    'q7',
    '7. Коли ти відкладаєш важливе, що за цим найчастіше стоїть?',
    'choice',
    {
      state: 'Я просто виснажена',
      goal: 'Я не впевнена, що це моє',
      choice: 'Боюсь втратити інші варіанти',
      decision: 'Ще не прийняла рішення до кінця',
      action: 'Не розклала це на прості дії',
    },
    'q8',
  ),
  q8: buildQuestion(
    'q8',
    '8. Що тобі зараз допомогло б найбільше?',
    'action',
    {
      state: 'Повернути себе в нормальний стан',
      goal: 'Зрозуміти, чого я хочу',
      choice: 'Нарешті обрати один напрям',
      decision: 'Прийняти рішення і не торгуватись із собою',
      action: 'Зробити перший конкретний крок',
    },
    null,
  ),
} as const

export const AB_TEST_QUESTION_ORDER = AB_TEST_QUESTION_IDS

export function getAbTestQuestion(questionId: AbTestQuestionId): AbTestQuestion {
  return AB_TEST_QUESTIONS[questionId]
}

export function getAbTestQuestionByIndex(index: number): AbTestQuestion | null {
  const questionId = AB_TEST_QUESTION_ORDER[index]
  return questionId ? getAbTestQuestion(questionId) : null
}

export function getAbTestAnswer(
  questionId: AbTestQuestionId,
  answerId: AbTestAnswerKey,
): AbTestQuestionAnswer | null {
  return getAbTestQuestion(questionId).answers.find((a) => a.id === answerId) ?? null
}

export function resolveAbTestNextQuestionId(
  questionId: AbTestQuestionId,
): AbTestQuestionId | null {
  return getAbTestQuestion(questionId).next_question_id
}