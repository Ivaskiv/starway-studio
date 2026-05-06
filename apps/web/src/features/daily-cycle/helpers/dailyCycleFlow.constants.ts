import type { DailyQuestion } from './dailyCycleFlow.types'

const STATIC_MORNING_QUESTION_KEYS = [
  'identity',
  'qualities',
  'goals',
  'focus',
  'state',
  'worthy',
] as const

type StaticMorningQuestionKey = typeof STATIC_MORNING_QUESTION_KEYS[number]

const STATIC_MORNING_QUESTIONS: Record<StaticMorningQuestionKey, DailyQuestion> = {
  identity: {
    id: 'identity',
    label: 'Хто я сьогодні?',
    hint: 'Коротко назви себе в цій ролі / стані.',
    placeholder: 'Я сьогодні — ...',
    type: 'text',
  },
  qualities: {
    id: 'qualities',
    label: 'Яка я?',
    hint: 'Які якості зараз тобі реально допомагають?',
    placeholder: 'Яка я сьогодні: ...',
    type: 'text',
  },
  goals: {
    id: 'goals',
    label: 'Мої 10 цілей на рік',
    hint: 'Введи кожну ціль з нового рядка (до 10).',
    placeholder: 'Я маю ...\nЯ живу ...\nЯ отримую ...',
    type: 'textarea',
  },
  focus: {
    id: 'focus',
    label: 'На яку одну ціль я фокусуюсь сьогодні?',
    hint: 'Одна ціль на день працює краще за розпорошення.',
    placeholder: 'Сьогодні я фокусуюсь на ...',
    type: 'text',
  },
  state: {
    id: 'state',
    label: 'Який мій стан сьогодні?',
    hint: 'Назви стан чесно, без прикрас.',
    placeholder: 'Зараз мій стан: ...',
    type: 'text',
  },
  worthy: {
    id: 'worthy',
    label: 'Чому я гідна мати все це прямо зараз?',
    hint: 'Сформулюй коротко, без пафосу.',
    placeholder: 'Я гідна цього, бо ...',
    type: 'textarea',
  },
}

export const STATIC_MORNING_QUESTIONS_LIST = STATIC_MORNING_QUESTION_KEYS.map(
  key => STATIC_MORNING_QUESTIONS[key],
)

export const STATIC_MORNING_QUESTION_COUNT = STATIC_MORNING_QUESTION_KEYS.length

export const EVENING_QUESTIONS: DailyQuestion[] = [
  {
    id: 'energy_in',
    label: 'Що мене сьогодні наповнило енергією?',
    hint: 'Люди, дії, ситуації, стани.',
    placeholder: 'Мене сьогодні наповнило: ...',
    type: 'text',
  },
  {
    id: 'energy_out',
    label: 'Де я сьогодні злила енергію чи втратила стан?',
    hint: 'Тригер, сумнів, ситуація, реакція.',
    placeholder: 'Я сьогодні злила енергію в: ...',
    type: 'text',
  },
  {
    id: 'program',
    label: 'Яка програма або переконання активувалась сьогодні?',
    hint: 'Наприклад: страх, "мені не вийде", "я не заслуговую"...',
    placeholder: 'У мене сьогодні активувалась програма: ...',
    type: 'text',
  },
  {
    id: 'power_source',
    label: 'З якої точки я діяла сьогодні: сили чи страху?',
    hint: 'Чесна відповідь. Що керувало тобою?',
    placeholder: 'Мною сьогодні керувала/керував: ...',
    type: 'text',
  },
  {
    id: 'win',
    label: 'Яка моя головна перемога сьогодні?',
    hint: 'Дія, стан, рішення — будь-який успіх.',
    placeholder: 'Сьогодні я: ...',
    type: 'text',
  },
]

export function buildWebMapDailyQuestion(questionText: string): DailyQuestion {
  return {
    id: 'webMapAlignmentAnswer',
    label: questionText,
    hint: 'Коротко зафіксуй зв’язок між сьогоднішньою дією і твоєю головною ціллю.',
    placeholder: 'Ця дія веде мене до головної цілі, тому що...',
    type: 'textarea',
  }
}
