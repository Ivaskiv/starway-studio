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
    body: 'Якщо хочеш продовжити, контекст уже збережено.',
    cta: 'Приєднатись до ФОКУСУ →',
  },
  PAYMENT_REMINDER_48H: {
    title: 'ФОКУС',
    body: 'Повертаємось до рішення: що саме дає тобі зараз найбільше користі.',
    cta: 'Приєднатись до ФОКУСУ →',
  },
  PAYMENT_REMINDER_72H: {
    title: 'ФОКУС',
    body: 'Незавершений крок теж впливає на ритм. Можна мʼяко повернутись до нього.',
    cta: 'Приєднатись до ФОКУСУ →',
  },
  PAYMENT_REMINDER_5D: {
    title: 'ФОКУС',
    body: 'Пауза вже показує ціну відкладання. Повернутись можна одним кроком.',
    cta: 'Приєднатись до ФОКУСУ →',
  },
  PAYMENT_REMINDER_7D: {
    title: 'ФОКУС',
    body: 'Можна повернутись до збереженого прогресу і свого темпу.',
    cta: 'Приєднатись до ФОКУСУ →',
  },
} as const
