
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
      text: `${ANSWER_LETTERS[index]}. ${answerTexts[id]}`,
      score: 5 - index,
      category: id,
    })),
  }
}

// ТЗ Блок 2 — активні 8 питань точно за текстом
export const AB_TEST_QUESTIONS: Record<AbTestQuestionId, AbTestQuestion> = {
  q1: buildQuestion(
    'q1',
    'Коли ти думаєш про те чого хочеш в житті — що відчуваєш першим?',
    'energy',
    {
      state: 'Втому. Навіть думати про це вже немає сил.',
      goal: 'Розгубленість. Не знаю чого насправді хочу.',
      choice: 'Тривогу. А раптом оберу не те?',
      decision: 'Сумнів. Ніби знаю — але щось зупиняє.',
      action: 'Бажання зробити. Але знову відкладаю.',
    },
    'q2'
  ),
  q2: buildQuestion(
    'q2',
    'Що найчастіше заважає тобі щось змінити?',
    'discipline',
    {
      state: 'Немає сил. Тримаюся з останніх — і ще щось починати?',
      goal: 'Не знаю куди іти. Хочу змін але не знаю яких.',
      choice: 'Страшно зробити неправильно. Краще не починати.',
      decision: 'Не можу сказати собі остаточно: "Все, я це роблю."',
      action: 'Починаю — і знову зупиняюсь. По колу.',
    },
    'q3'
  ),
  q3: buildQuestion(
    'q3',
    'Як виглядає твій день коли знову нічого не вийшло?',
    'discipline',
    {
      state: 'Злюся на себе. Або просто лягаю — більше нічого не хочеться.',
      goal: 'Роблю щось — але відчуття що йду не туди.',
      choice: 'Знову думаю, знову порівнюю. І знову нічого не обираю.',
      decision: 'Знову перенесла. І знову не розумію чому.',
      action: 'Була зайнята весь день — але результату нема.',
    },
    'q4'
  ),
  q4: buildQuestion(
    'q4',
    'Якщо чесно — де ти зупиняєшся найчастіше?',
    'decision',
    {
      state: 'На самому початку — взагалі немає сил навіть почати.',
      goal: 'Коли треба зрозуміти чого хочу — бо не знаю і починаю сумніватись.',
      choice: 'На виборі — кружляю в одних і тих самих варіантах роками.',
      decision:
        'Між "вирішила" і "зробила" — вирішила, але нічого не відбувається.',
      action:
        'В середині — починаю але не завершую. І знову беруся за щось нове.',
    },
    'q5'
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
      action:
        '«Я стараюсь але нічого не виходить. Мабуть я роблю щось не так.»',
    },
    'q6'
  ),
  q6: buildQuestion(
    'q6',
    'Чого тобі зараз найбільше бракує?',
    'decision',
    {
      state: 'Сил і спокою — щоб просто нормально функціонувати.',
      goal: 'Розуміння чого я насправді хочу.',
      choice: 'Сміливості нарешті обрати і не озиратись.',
      decision:
        'Того моменту коли скажу собі: "Все. Я це роблю." І не відступлю.',
      action: 'Одного конкретного кроку з якого все нарешті почнеться.',
    },
    'q7'
  ),
  q7: buildQuestion(
    'q7',
    'Коли ти відкладаєш важливе, що за цим найчастіше стоїть?',
    'choice',
    {
      state: 'Я просто виснажена. Немає звідки брати сили.',
      goal: 'Я не впевнена що це моє. Може хочу зовсім іншого.',
      choice: 'Боюсь втратити інші варіанти якщо оберу цей.',
      decision: 'Я ще не прийняла рішення до кінця. Щось тримає.',
      action: 'Не зробила це простим і конкретним. Тому і не роблю.',
    },
    'q8'
  ),
  q8: buildQuestion(
    'q8',
    'Що тобі зараз допомогло б найбільше?',
    'action',
    {
      state: 'Повернути себе в нормальний стан — щоб були сили діяти.',
      goal: 'Нарешті зрозуміти чого я хочу. По-справжньому.',
      choice: 'Обрати один напрямок і перестати кружляти.',
      decision: 'Прийняти рішення — і не торгуватись із собою більше.',
      action: 'Зробити перший конкретний крок. Один. Але справжній.',
    },
    null
  ),
} as const

export const AB_TEST_QUESTION_ORDER = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const satisfies readonly AbTestQuestionId[]

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
