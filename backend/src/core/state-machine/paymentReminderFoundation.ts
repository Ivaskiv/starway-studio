import { AB_TEST_FOCUS_JOIN_CTA_TEXT } from '../../products/ab-system/content/abTest.shared.js'

export type PaymentReminderFollowupCopy = {
  title: string
  body: string
  cta?: string
}

export const PAYMENT_REMINDER_MESSAGE_KEY_24H = 'PAYMENT_REMINDER_24H' as const
export const PAYMENT_REMINDER_MESSAGE_KEY_48H = 'PAYMENT_REMINDER_48H' as const
export const PAYMENT_REMINDER_MESSAGE_KEY_72H = 'PAYMENT_REMINDER_72H' as const

export const PAYMENT_REMINDER_MESSAGE_KEYS = [
  PAYMENT_REMINDER_MESSAGE_KEY_24H,
  PAYMENT_REMINDER_MESSAGE_KEY_48H,
  PAYMENT_REMINDER_MESSAGE_KEY_72H,
] as const

export const PAYMENT_REMINDER_TIMER_IDS = [
  'PAYMENT_REMINDER_24H',
  'PAYMENT_REMINDER_48H',
  'PAYMENT_REMINDER_72H',
  'PAYMENT_REMINDER_5D',
  'PAYMENT_REMINDER_7D',
] as const

export type PaymentReminderTimerId = typeof PAYMENT_REMINDER_TIMER_IDS[number]

export const PAYMENT_REMINDER_FOLLOWUP_COPY: Record<PaymentReminderTimerId, PaymentReminderFollowupCopy> = {
  PAYMENT_REMINDER_24H: {
    title: 'ФОКУС',
    body: 'Більшість моїх учасниць бачать результат вже на 3-й день ФОКУС.\n\nТвій результат збережено — можна продовжити з того де зупинилась.',
    cta: 'Спробувати заново',
  },
  PAYMENT_REMINDER_48H: {
    title: 'ФОКУС',
    body: 'Повертаємось до рішення: що саме дає тобі зараз найбільше користі.',
    cta: AB_TEST_FOCUS_JOIN_CTA_TEXT,
  },
  PAYMENT_REMINDER_72H: {
    title: 'ФОКУС',
    body: 'Незавершений крок теж впливає на ритм. Можна мʼяко повернутись до нього.',
    cta: AB_TEST_FOCUS_JOIN_CTA_TEXT,
  },
  PAYMENT_REMINDER_5D: {
    title: 'ФОКУС',
    body: 'Пауза вже показує ціну відкладання. Повернутись можна одним кроком.',
    cta: AB_TEST_FOCUS_JOIN_CTA_TEXT,
  },
  PAYMENT_REMINDER_7D: {
    title: 'ФОКУС',
    body: 'Можна повернутись до збереженого прогресу і свого темпу.',
    cta: AB_TEST_FOCUS_JOIN_CTA_TEXT,
  },
} as const
