
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

// ТЗ Блок 2 — активні 5 питань точно за текстом
export const AB_TEST_QUESTIONS: Record<AbTestQuestionId, AbTestQuestion> = {
  q1: buildQuestion(
    'q1',
    'Коли ти думаєш про те чого хочеш в житті — що відчуваєш першим?',
    'energy',
    {
      state: 'Втома і відчуття що немає сил навіть почати.',
      goal: 'Не знаю чого насправді хочу — чи це взагалі моє.',
      choice: 'Є варіанти але обрати один страшно — а раптом неправильно.',
      decision: 'Розумію що хочу але в момент коли треба вирішити — щось зупиняє.',
      action: 'Починаю — але швидко все розсипається і я не розумію навіщо.',
    },
    'q2',
  ),
  q2: buildQuestion(
    'q2',
    'Що найчастіше заважає тобі щось змінити?',
    'discipline',
    {
      state: 'Тримаюся з останніх сил — тривога, немає сил, нічого не хочеться.',
      goal: 'Не знаю чого хочу — і тому нічого не змінюю в житті.',
      choice: 'Боюсь зробити неправильно — і тому взагалі нічого не роблю.',
      decision: 'Я вже все вирішила — але так і не зробила. І сама не розумію чому.',
      action: 'Роблю багато але ходжу по колу — і злюся що нічого не змінюється.',
    },
    'q3',
  ),
  q3: buildQuestion(
    'q3',
    'Як виглядає твій день коли знову нічого не вийшло?',
    'discipline',
    {
      state: 'Змушую себе але тіло і голова не слухаються. Починаю і кидаю.',
      goal: 'Роблю багато, але відчуття що йду кудись не туди.',
      choice: 'Читаю, думаю, питаю інших — і знову відкладаю.',
      decision: 'Знаю що треба зробити. Але не роблю. Ніби щось тримає.',
      action: 'Роблю багато але до кінця нічого не доходить. І я вже втомилась від цього.',
    },
    'q4',
  ),
  q4: buildQuestion(
    'q4',
    'Якщо чесно — де ти зупиняєшся найчастіше?',
    'decision',
    {
      state: 'На самому початку — взагалі немає сил навіть почати.',
      goal: 'Коли треба зрозуміти чого хочу — бо не знаю і починаю сумніватись.',
      choice: 'На виборі — кружляю в одних і тих самих варіантах роками.',
      decision: 'Між "вирішила" і "зробила" — вирішила, але нічого не відбувається.',
      action: 'В середині — починаю але не завершую. І знову беруся за щось нове.',
    },
    'q5',
  ),
  q5: buildQuestion(
    'q5',
    'Що ти кажеш собі коли знову зупиняєшся?',
    'choice',
    {
      state: '«Немає сил. Потім. Коли відпочину — тоді почну.»',
      goal: '«Я не знаю чого насправді хочу. Може це взагалі не моє.»',
      choice: '«Що якщо я оберу неправильно? Треба ще подумати.»',
      decision: '«Я все розумію. Але чомусь не роблю. Що зі мною не так?»',
      action: '«Я стараюсь але нічого не виходить. Мабуть я роблю щось не так.»',
    },
    null,
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

export const AB_TEST_QUESTION_ORDER = ['q1', 'q2', 'q3', 'q4', 'q5'] as const satisfies readonly AbTestQuestionId[]

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
